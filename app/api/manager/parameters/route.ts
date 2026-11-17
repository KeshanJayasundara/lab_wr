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

// GET: Fetch all test parameters
export async function GET(request: Request) {
  try {
    const parameters = await prisma.testParameter.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ success: true, data: parameters }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch parameters" }, { status: 500 });
  }
}

// POST: Add new test parameter (Name & Unit)
export async function POST(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, unit } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Test name is required" }, { status: 400 });
    }

    const newParam = await prisma.testParameter.create({
      data: {
        name: name.trim(),
        unit: unit ? unit.trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: newParam }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Test already exists" }, { status: 500 });
  }
}

// PUT: Update a test parameter (Name & Unit)
export async function PUT(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, name, unit } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Test ID required" }, { status: 400 });
    }
    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: "Test name is required" }, { status: 400 });
    }

    const updated = await prisma.testParameter.update({
      where: { id },
      data: {
        name: String(name).trim(),
        unit: unit && String(unit).trim() ? String(unit).trim() : null, // empty = no unit
      },
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, error: "A test with this name already exists" }, { status: 409 });
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ success: false, error: "Test not found" }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to update test" }, { status: 500 });
  }
}

// DELETE: Remove a test parameter
export async function DELETE(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ success: false, error: "Test ID required" }, { status: 400 });

  try {
    await prisma.testParameter.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Test deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to delete test" }, { status: 500 });
  }
}