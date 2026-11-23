import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPlantOperator } from "@/lib/plantOperatorAuth";

// GET: all registered Gali vehicles
export async function GET(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const vehicles = await prisma.galiVehicle.findMany({
      orderBy: { vehicleNumber: "asc" },
      select: { id: true, vehicleNumber: true, createdAt: true },
    });
    return NextResponse.json({ success: true, data: vehicles }, { status: 200 });
  } catch (error) {
    console.error("GALI VEHICLES GET ERROR:", error);
    return NextResponse.json({ success: false, error: "Failed to load vehicles" }, { status: 500 });
  }
}

// POST: register a new Gali vehicle by its number
export async function POST(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const raw = typeof body.vehicleNumber === "string" ? body.vehicleNumber : "";
    const vehicleNumber = raw.trim().replace(/\s+/g, " ").toUpperCase();

    if (!vehicleNumber) {
      return NextResponse.json({ success: false, error: "Vehicle number is required" }, { status: 400 });
    }
    if (!/^[A-Z0-9][A-Z0-9 -]{2,19}$/.test(vehicleNumber)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid vehicle number (letters, numbers, spaces or '-', 3-20 characters)" },
        { status: 400 }
      );
    }

    const existing = await prisma.galiVehicle.findUnique({ where: { vehicleNumber } });
    if (existing) {
      return NextResponse.json({ success: false, error: "This vehicle is already registered" }, { status: 409 });
    }

    const vehicle = await prisma.galiVehicle.create({
      data: { vehicleNumber, registeredBy: operator.name },
      select: { id: true, vehicleNumber: true, createdAt: true },
    });
    return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, error: "This vehicle is already registered" }, { status: 409 });
    }
    console.error("GALI VEHICLES POST ERROR:", error);
    return NextResponse.json({ success: false, error: "Failed to register vehicle" }, { status: 500 });
  }
}