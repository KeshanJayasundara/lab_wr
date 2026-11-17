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

// GET: Fetch all or filtered chemical dosages
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const typeId = searchParams.get("typeId");

  try {
    const records = await prisma.parameterChemicalDosage.findMany({
      where: typeId ? { typeId } : {},
      include: {
        type: {
          include: {
            category: true,
          },
        },
        chemical: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: records }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch parameter dosages" }, { status: 500 });
  }
}

// POST: Save multiple chemical dosages for a unit & parameter
export async function POST(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { typeId, parameterName, items } = body;

    if (!typeId || !parameterName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Required fields and chemical rows missing" }, { status: 400 });
    }

    // Upsert each chemical dosage mapping
    for (const item of items) {
      if (!item.chemicalId || item.amount === undefined) continue;

      await prisma.parameterChemicalDosage.upsert({
        where: {
          typeId_parameterName_chemicalId: {
            typeId,
            parameterName: parameterName.trim(),
            chemicalId: item.chemicalId,
          }
        },
        update: {
          amount: parseFloat(item.amount),
          unit: item.unit ? item.unit.trim() : "kg",
          description: item.description ? item.description.trim() : null,
        },
        create: {
          typeId,
          parameterName: parameterName.trim(),
          chemicalId: item.chemicalId,
          amount: parseFloat(item.amount),
          unit: item.unit ? item.unit.trim() : "kg",
          description: item.description ? item.description.trim() : null,
        }
      });
    }

    return NextResponse.json({ success: true, message: "Chemical dosages saved successfully" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to save chemical dosages" }, { status: 500 });
  }
}

// DELETE: Remove chemical dosage mapping
export async function DELETE(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ success: false, error: "Record ID required" }, { status: 400 });

  try {
    await prisma.parameterChemicalDosage.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to delete record" }, { status: 500 });
  }
}