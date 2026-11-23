import { prisma } from "@/lib/prisma";
import { GALI_RANGES } from "@/lib/galiRanges";
import { guard, unauthorized, fail, ok } from "../../_h";

// Parameters + ranges the Gali operator is checked against. ES and PH are created with the defaults on first use.
async function ensureDefaults() {
  if ((await prisma.galiParameter.count()) === 0) {
    await prisma.galiParameter.createMany({
      data: [
        { name: "ES", min: GALI_RANGES.ES.min, max: GALI_RANGES.ES.max },
        { name: "PH", unit: "pH", min: GALI_RANGES.PH.min, max: GALI_RANGES.PH.max },
      ],
      skipDuplicates: true,
    });
  }
}

function parse(b: any) {
  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
  const unit = typeof b.unit === "string" && b.unit.trim() ? b.unit.trim() : null;
  const min = Number(b.min), max = Number(b.max);
  if (!name || name.length > 40) return { error: "Enter a parameter name" };
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { error: "Enter a valid minimum and maximum" };
  if (min > max) return { error: "Minimum cannot be greater than maximum" };
  return { data: { name, unit, min, max } };
}

export async function GET(request: Request) {
  if (!(await guard(request))) return unauthorized();
  try { await ensureDefaults(); return ok(await prisma.galiParameter.findMany({ orderBy: { createdAt: "asc" } })); }
  catch (e) { console.error(e); return fail("Failed to load parameters", 500); }
}

export async function POST(request: Request) {
  if (!(await guard(request))) return unauthorized();
  try {
    const r = parse(await request.json());
    if (!r.data) return fail(r.error!);
    if (await prisma.galiParameter.findUnique({ where: { name: r.data.name } })) return fail("This parameter already exists", 409);
    return ok(await prisma.galiParameter.create({ data: r.data }), 201);
  } catch (e) { console.error(e); return fail("Failed to add parameter", 500); }
}

export async function PUT(request: Request) {
  if (!(await guard(request))) return unauthorized();
  try {
    const b = await request.json();
    const r = parse(b);
    if (!r.data || typeof b.id !== "string") return fail(r.error || "Missing id");
    return ok(await prisma.galiParameter.update({ where: { id: b.id }, data: r.data }));
  } catch (e: any) {
    if (e?.code === "P2002") return fail("Another parameter already uses this name", 409);
    console.error(e); return fail("Failed to update parameter", 500);
  }
}

export async function DELETE(request: Request) {
  if (!(await guard(request))) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Missing id");
  try { await prisma.galiParameter.delete({ where: { id } }); return ok({ id }); } catch { return fail("Parameter not found", 404); }
}