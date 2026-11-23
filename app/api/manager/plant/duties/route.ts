import { prisma } from "@/lib/prisma";
import { ensureDuties } from "@/lib/plantConfig";
import { guard, unauthorized, fail, ok } from "../_h";

export async function GET(request: Request) {
  if (!(await guard(request))) return unauthorized();
  try { return ok(await ensureDuties()); } catch (e) { console.error(e); return fail("Failed to load duties", 500); }
}

export async function POST(request: Request) {
  if (!(await guard(request))) return unauthorized();
  try {
    const b = await request.json();
    const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
    const kind = ["GALI", "TANK", "OTHER"].includes(b.kind) ? b.kind : "OTHER";
    if (!name || name.length > 60) return fail("Enter a duty name (max 60 characters)");
    if (await prisma.plantDuty.findUnique({ where: { name } })) return fail("This duty already exists", 409);
    return ok(await prisma.plantDuty.create({ data: { name, kind } }), 201);
  } catch (e) { console.error(e); return fail("Failed to add duty", 500); }
}

export async function DELETE(request: Request) {
  if (!(await guard(request))) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Missing id");
  try { await prisma.plantDuty.delete({ where: { id } }); return ok({ id }); } catch { return fail("Duty not found", 404); }
}