import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

async function verifyAdmin(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const tokenCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!tokenCookie) return null;

    const verified = await jwtVerify(tokenCookie, JWT_SECRET);
    const payload = verified.payload as any;

    if (payload.role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}

const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;
const literal = (v: string | null) => (v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`);

type Row = Record<string, any>;

/**
 * Builds a complete PostgreSQL backup script (like pg_dump):
 * enum types -> sequences -> tables (schema) -> all data -> constraints -> indexes.
 * It reads the live database, so it always matches the current schema and data
 * (including the Laboratory Facility Profile / region details).
 */
async function buildBackupSql(regionLabel: string) {
  // Enum types
  const enumRows = (await prisma.$queryRawUnsafe(`
    SELECT t.typname::text AS name, e.enumlabel::text AS label
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
  `)) as Row[];

  // Sequences
  const seqRows = (await prisma.$queryRawUnsafe(`
    SELECT sequencename::text AS name, last_value::text AS last_value
    FROM pg_sequences WHERE schemaname = 'public' ORDER BY sequencename
  `)) as Row[];

  // Columns of every table
  const colRows = (await prisma.$queryRawUnsafe(`
    SELECT c.relname::text AS table_name,
           a.attname::text AS column_name,
           format_type(a.atttypid, a.atttypmod)::text AS data_type,
           a.attnotnull AS not_null,
           pg_get_expr(d.adbin, d.adrelid)::text AS default_expr
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname, a.attnum
  `)) as Row[];

  // Primary keys, unique, check and foreign keys
  const conRows = (await prisma.$queryRawUnsafe(`
    SELECT c.relname::text AS table_name, con.conname::text AS name,
           pg_get_constraintdef(con.oid)::text AS def
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND con.contype IN ('p', 'u', 'c', 'f')
    ORDER BY CASE con.contype::text WHEN 'p' THEN 1 WHEN 'u' THEN 2 WHEN 'c' THEN 3 ELSE 4 END,
             c.relname, con.conname
  `)) as Row[];

  // Indexes that are not already created by a constraint
  const idxRows = (await prisma.$queryRawUnsafe(`
    SELECT indexdef::text AS def FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname NOT IN (
        SELECT conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace
      )
    ORDER BY tablename, indexname
  `)) as Row[];

  // Group columns by table
  const tables = new Map<string, Row[]>();
  for (const c of colRows) {
    if (!tables.has(c.table_name)) tables.set(c.table_name, []);
    tables.get(c.table_name)!.push(c);
  }

  const out: string[] = [];
  const now = new Date();
  out.push("--");
  out.push("-- NWSDB Laboratory Information Management System");
  out.push("-- Full PostgreSQL database backup (schema + data)");
  out.push(`-- Region     : ${regionLabel}`);
  out.push(`-- Generated  : ${now.toISOString()}`);
  out.push("--");
  out.push("-- Restore into an EMPTY database, e.g.:  psql -d <database> -f <this file>");
  out.push("--");
  out.push("");
  out.push("SET client_encoding = 'UTF8';");
  out.push("SET standard_conforming_strings = on;");
  out.push("");
  out.push("BEGIN;");
  out.push("");

  // 1) enum types
  const enums = new Map<string, string[]>();
  for (const r of enumRows) {
    if (!enums.has(r.name)) enums.set(r.name, []);
    enums.get(r.name)!.push(r.label);
  }
  if (enums.size) out.push("-- ENUM TYPES");
  for (const [name, labels] of enums) {
    out.push(`CREATE TYPE ${ident(name)} AS ENUM (${labels.map((l) => literal(l)).join(", ")});`);
  }
  if (enums.size) out.push("");

  // 2) sequences
  if (seqRows.length) out.push("-- SEQUENCES");
  for (const s of seqRows) out.push(`CREATE SEQUENCE ${ident(s.name)};`);
  if (seqRows.length) out.push("");

  // 3) tables (schema)
  out.push("-- TABLES");
  for (const [table, cols] of tables) {
    const defs = cols.map((c) => {
      let line = `  ${ident(c.column_name)} ${c.data_type}`;
      if (c.default_expr) line += ` DEFAULT ${c.default_expr}`;
      if (c.not_null) line += " NOT NULL";
      return line;
    });
    out.push(`CREATE TABLE ${ident(table)} (\n${defs.join(",\n")}\n);`);
    out.push("");
  }

  // 4) data
  out.push("-- DATA");
  for (const [table, cols] of tables) {
    const select = cols.map((c) => `${ident(c.column_name)}::text AS ${ident(c.column_name)}`).join(", ");
    const rows = (await prisma.$queryRawUnsafe(`SELECT ${select} FROM ${ident(table)}`)) as Row[];
    out.push(`-- ${table}: ${rows.length} row(s)`);
    if (rows.length === 0) {
      out.push("");
      continue;
    }
    const colList = cols.map((c) => ident(c.column_name)).join(", ");
    for (const row of rows) {
      const values = cols.map((c) => literal(row[c.column_name] === null ? null : String(row[c.column_name])));
      out.push(`INSERT INTO ${ident(table)} (${colList}) VALUES (${values.join(", ")});`);
    }
    out.push("");
  }

  // 5) sequence positions
  for (const s of seqRows) {
    if (s.last_value !== null) out.push(`SELECT setval(${literal(ident(s.name))}, ${s.last_value}, true);`);
  }
  if (seqRows.length) out.push("");

  // 6) constraints (added after the data so insert order never matters)
  if (conRows.length) out.push("-- CONSTRAINTS (primary keys, unique, foreign keys)");
  for (const c of conRows) {
    out.push(`ALTER TABLE ONLY ${ident(c.table_name)} ADD CONSTRAINT ${ident(c.name)} ${c.def};`);
  }
  if (conRows.length) out.push("");

  // 7) indexes
  if (idxRows.length) out.push("-- INDEXES");
  for (const i of idxRows) out.push(`${i.def};`);
  if (idxRows.length) out.push("");

  out.push("COMMIT;");
  out.push("");
  return out.join("\n");
}

// GET: download the region's full database as ONE .sql file (schema + all data). Super Admin only.
export async function GET(request: Request) {
  await connection(); // always run at request time (never prerendered / cached)
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Region details are also stored in the database (FacilityProfile table) so they are inside the dump;
    // here we only use the region name for the file header and the file name.
    let region = "Region";
    try {
      const profile = await prisma.facilityProfile.findUnique({ where: { id: "singleton" } });
      if (profile?.region) region = profile.region;
    } catch {
      // facility table not created yet - the backup still works
    }

    const sql = await buildBackupSql(region);

    const slug = region.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "region";
    const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
    const fileName = `nwsdb_backup_${slug}_${stamp}.sql`;

    return new Response(sql, {
      status: 200,
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
        "Access-Control-Expose-Headers": "Content-Disposition",
      },
    });
  } catch (error: any) {
    console.error("BACKUP ERROR:", error);
    return NextResponse.json({ success: false, error: "Failed to generate the database backup" }, { status: 500 });
  }
}