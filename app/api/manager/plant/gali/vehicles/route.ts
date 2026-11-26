import { prisma } from "@/lib/prisma";
import { guard, unauthorized, fail, ok } from "../../_h";

export async function GET(request: Request) {
  if (!(await guard(request))) return unauthorized();
  try { return ok(await prisma.galiVehicle.findMany({ orderBy: { vehicleNumber: "asc" } })); }
  catch (e) { console.error(e); return fail("Failed to load vehicles", 500); }
}

export async function POST(request: Request) {
  const m = await guard(request);
  if (!m) return unauthorized();
  try {
    const b = await request.json();
    const vehicleNumber = (typeof b.vehicleNumber === "string" ? b.vehicleNumber : "").trim().replace(/\s+/g, " ").toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9 -]{2,19}$/.test(vehicleNumber))
      return fail("Enter a valid vehicle number (letters, numbers, spaces or '-', 3-20 characters)");
    if (await prisma.galiVehicle.findUnique({ where: { vehicleNumber } })) return fail("This vehicle is already registered", 409);
    return ok(await prisma.galiVehicle.create({ data: { vehicleNumber, registeredBy: m.name } }), 201);
  } catch (e) { console.error(e); return fail("Failed to add vehicle", 500); }
}

export async function DELETE(request: Request) {
  if (!(await guard(request))) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Missing id");
  try { await prisma.galiVehicle.delete({ where: { id } }); return ok({ id }); } catch { return fail("Vehicle not found", 404); }
}