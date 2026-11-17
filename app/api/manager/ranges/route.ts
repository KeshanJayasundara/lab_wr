import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { resyncRecordStatuses } from "@/lib/statusSync";

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

// GET: Fetch configured ranges (All or filtered by typeId) with Tank & Category relations
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const typeId = searchParams.get("typeId");

  try {
    const ranges = await prisma.tankParameterConfig.findMany({
      where: typeId ? { typeId } : {},
      include: {
        type: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { parameterName: "asc" },
    });
    return NextResponse.json({ success: true, data: ranges }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch parameter ranges" }, { status: 500 });
  }
}

// POST: Add new parameter range(s) for a Tank/Unit (Supports both single object and batch array)
export async function POST(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];
    const createdRecords = [];

    for (const item of items) {
      const { typeId, parameterName, unit, standardMin, standardMax, rangeText } = item;

      if (!typeId || !parameterName || !parameterName.trim()) {
        return NextResponse.json({ success: false, error: "Tank/Unit and parameter name are required for all rows" }, { status: 400 });
      }

      const parsedMin = standardMin !== null && standardMin !== undefined && standardMin !== "" ? parseFloat(standardMin) : null;
      const parsedMax = standardMax !== null && standardMax !== undefined && standardMax !== "" ? parseFloat(standardMax) : null;

      // Upsert to handle batch duplicates gracefully per tank & parameter
      const config = await prisma.tankParameterConfig.upsert({
        where: {
          typeId_parameterName: {
            typeId,
            parameterName: parameterName.trim(),
          },
        },
        update: {
          unit: unit ? unit.trim() : null,
          standardMin: parsedMin,
          standardMax: parsedMax,
          rangeText: rangeText ? rangeText.trim() : null,
        },
        create: {
          typeId,
          parameterName: parameterName.trim(),
          unit: unit ? unit.trim() : null,
          standardMin: parsedMin,
          standardMax: parsedMax,
          rangeText: rangeText ? rangeText.trim() : null,
        },
      });
      createdRecords.push(config);
      await resyncRecordStatuses(typeId, parameterName);
    }

    return NextResponse.json({ success: true, data: createdRecords }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to save parameter ranges" }, { status: 500 });
  }
}

// PUT: Update existing parameter range by ID
export async function PUT(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, unit, standardMin, standardMax, rangeText } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Configuration ID is required" }, { status: 400 });
    }

    const updated = await prisma.tankParameterConfig.update({
      where: { id },
      data: {
        unit: unit ? unit.trim() : null,
        standardMin: standardMin !== null && standardMin !== undefined && standardMin !== "" ? parseFloat(standardMin) : null,
        standardMax: standardMax !== null && standardMax !== undefined && standardMax !== "" ? parseFloat(standardMax) : null,
        rangeText: rangeText ? rangeText.trim() : null,
      },
    });

    await resyncRecordStatuses(updated.typeId, updated.parameterName);

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to update configuration" }, { status: 500 });
  }
}

// DELETE: Remove configured parameter range
export async function DELETE(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ success: false, error: "Configuration ID required" }, { status: 400 });

  try {
    const deleted = await prisma.tankParameterConfig.delete({ where: { id } });
    await resyncRecordStatuses(deleted.typeId, deleted.parameterName);
    return NextResponse.json({ success: true, message: "Parameter range deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to delete configuration" }, { status: 500 });
  }
}