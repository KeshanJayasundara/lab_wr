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

export async function GET(request: Request) {
  try {
    const chemicals = await prisma.chemicalMaster.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: chemicals }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch chemicals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, quantity, unit, threshold, description } = body;

    if (!name || !unit) {
      return NextResponse.json({ success: false, error: "Chemical name and unit are required" }, { status: 400 });
    }

    const newChemical = await prisma.chemicalMaster.create({
      data: {
        name: name.trim(),
        quantity: quantity ? parseFloat(quantity) : 0,
        unit: unit.trim(),
        threshold: threshold ? parseFloat(threshold) : 10,
        description: description ? description.trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: newChemical }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Chemical already exists" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, name, quantity, unit, threshold, description } = body;

    if (!id || !name || !unit) {
      return NextResponse.json({ success: false, error: "ID, name, and unit are required" }, { status: 400 });
    }

    const updated = await prisma.chemicalMaster.update({
      where: { id },
      data: {
        name: name.trim(),
        quantity: quantity !== undefined ? parseFloat(quantity) : 0,
        unit: unit.trim(),
        threshold: threshold !== undefined ? parseFloat(threshold) : 10,
        description: description ? description.trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to update chemical" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ success: false, error: "Chemical ID required" }, { status: 400 });

  try {
    await prisma.chemicalMaster.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Chemical deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to delete chemical" }, { status: 500 });
  }
}