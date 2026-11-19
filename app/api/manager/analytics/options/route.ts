import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

async function verifyManager(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const tokenCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!tokenCookie) return null;
    const verified = await jwtVerify(tokenCookie, JWT_SECRET);
    const payload = verified.payload as any;
    if (payload.role !== "MANAGER" && payload.role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}

const norm = (s: string) => s.trim().toLowerCase();

// GET: Unit/Tank -> Parameters tree for the analytics dropdowns.
// Each parameter carries its unit (mg/L...), standard limits and how many readings exist.
export async function GET(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const [types, counts, masterParams] = await Promise.all([
      prisma.testType.findMany({
        include: { category: true, ranges: true },
        orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      }),
      prisma.testRecord.groupBy({
        by: ["typeId", "parameter"],
        where: { typeId: { not: null } },
        _count: { _all: true },
      }),
      prisma.testParameter.findMany({ select: { name: true, unit: true } }),
    ]);

    // typeId|normalized parameter -> { total readings, first spelling seen in records }
    const countMap = new Map<string, { count: number; name: string }>();
    for (const c of counts) {
      const key = `${c.typeId}|${norm(c.parameter)}`;
      const prev = countMap.get(key);
      countMap.set(key, {
        count: (prev?.count ?? 0) + c._count._all,
        name: prev?.name ?? c.parameter.trim(),
      });
    }

    const masterUnit = new Map(masterParams.map((p) => [norm(p.name), p.unit]));

    const data = types
      .map((t) => {
        const params = new Map<
          string,
          { name: string; unit: string | null; standardMin: number | null; standardMax: number | null; recordCount: number }
        >();

        // 1) configured parameters (canonical name + unit + limits)
        for (const r of t.ranges) {
          const key = norm(r.parameterName);
          params.set(key, {
            name: r.parameterName.trim(),
            unit: r.unit ?? masterUnit.get(key) ?? null,
            standardMin: r.standardMin ?? null,
            standardMax: r.standardMax ?? null,
            recordCount: countMap.get(`${t.id}|${key}`)?.count ?? 0,
          });
        }

        // 2) parameters that have readings but no range configured for this unit
        for (const [k, v] of countMap) {
          const [typeId, key] = k.split("|");
          if (typeId !== t.id || params.has(key)) continue;
          params.set(key, {
            name: v.name,
            unit: masterUnit.get(key) ?? null,
            standardMin: null,
            standardMax: null,
            recordCount: v.count,
          });
        }

        return {
          typeId: t.id,
          name: t.name,
          code: t.code,
          categoryName: t.category.name,
          parameters: [...params.values()].sort((a, b) => a.name.localeCompare(b.name)),
        };
      })
      .filter((u) => u.parameters.length > 0);

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    console.error("GET analytics options error:", error);
    return NextResponse.json({ success: false, error: "Failed to load analytics options" }, { status: 500 });
  }
}