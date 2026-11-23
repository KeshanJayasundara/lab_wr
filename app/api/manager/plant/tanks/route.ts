import { prisma } from "@/lib/prisma";
import { guard, unauthorized, fail, ok } from "../_h";

export async function GET(request: Request) {
  if (!(await guard(request))) return unauthorized();
  try {
    return ok(await prisma.plantTank.findMany({ orderBy: { name: "asc" }, include: { parameters: { orderBy: { createdAt: "asc" } } } }));
  } catch (e) { console.error(e); return fail("Failed to load tanks", 500); }
}

export async function POST(request: Request) {
  if (!(await guard(request))) return unauthorized();
  try {
    const b = await request.json();
    const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
    if (!name || name.length > 60) return fail("Enter a tank name (max 60 characters)");
    if (await prisma.plantTank.findUnique({ where: { name } })) return fail("This tank already exists", 409);
    return ok(await prisma.plantTank.create({ data: { name }, include: { parameters: true } }), 201);
  } catch (e) { console.error(e); return fail("Failed to add tank", 500); }
}

export async function DELETE(request: Request) {
  if (!(await guard(request))) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Missing id");
  try { await prisma.plantTank.delete({ where: { id } }); return ok({ id }); } catch { return fail("Tank not found", 404); }
}