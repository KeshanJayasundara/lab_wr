import { prisma } from "@/lib/prisma";
import { guard, unauthorized, fail, ok, numOrNull } from "../_h";

function parse(b: any) {
  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
  const unit = typeof b.unit === "string" && b.unit.trim() ? b.unit.trim() : null;
  const min = numOrNull(b.min), max = numOrNull(b.max);
  if (!name || name.length > 40) return { error: "Enter a parameter name" };
  if ((min !== null && !Number.isFinite(min)) || (max !== null && !Number.isFinite(max))) return { error: "Min / max must be numbers" };
  if (min !== null && max !== null && min > max) return { error: "Minimum cannot be greater than maximum" };
  return { data: { name, unit, min, max } };
}

export async function POST(request: Request) {
  if (!(await guard(request))) return unauthorized();
  try {
    const b = await request.json();
    const r = parse(b);
    if (!r.data) return fail(r.error!);
    if (typeof b.tankId !== "string" || !(await prisma.plantTank.findUnique({ where: { id: b.tankId } }))) return fail("Tank not found", 404);
    return ok(await prisma.tankParameter.create({ data: { ...r.data, tankId: b.tankId } }), 201);
  } catch (e: any) {
    if (e?.code === "P2002") return fail("This tank already has that parameter", 409);
    console.error(e); return fail("Failed to add parameter", 500);
  }
}

export async function PUT(request: Request) {
  if (!(await guard(request))) return unauthorized();
  try {
    const b = await request.json();
    const r = parse(b);
    if (!r.data || typeof b.id !== "string") return fail(r.error || "Missing id");
    return ok(await prisma.tankParameter.update({ where: { id: b.id }, data: r.data }));
  } catch (e: any) {
    if (e?.code === "P2002") return fail("This tank already has that parameter", 409);
    console.error(e); return fail("Failed to update parameter", 500);
  }
}

export async function DELETE(request: Request) {
  if (!(await guard(request))) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Missing id");
  try { await prisma.tankParameter.delete({ where: { id } }); return ok({ id }); } catch { return fail("Parameter not found", 404); }
}