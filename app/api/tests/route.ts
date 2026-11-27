import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { evaluateFromDb, withLiveStatus } from "@/lib/statusSync";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

async function verifyTechnician(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const tokenCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!tokenCookie) return null;
    const verified = await jwtVerify(tokenCookie, JWT_SECRET);
    return verified.payload as any;
  } catch {
    return null;
  }
}

// GET: Fetch technician test records
export async function GET(request: Request) {
  try {
    const records = await prisma.testRecord.findMany({
      include: {
        type: {
          include: { category: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: await withLiveStatus(records) }, { status: 200 });
  } catch (error: any) {
    console.error("GET records error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch test records" }, { status: 500 });
  }
}

// POST: Submit test result
export async function POST(request: Request) {
  const user = await verifyTechnician(request);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { sampleId, typeId, parameter, value, unit } = body;

    if (!sampleId || !typeId || !parameter || value === undefined) {
      return NextResponse.json({ success: false, error: "All required fields must be filled" }, { status: 400 });
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return NextResponse.json({ success: false, error: "Test value must be a valid number" }, { status: 400 });
    }

    const status = await evaluateFromDb(typeId, parameter, numValue);

    const testRecord = await prisma.testRecord.create({
      data: {
        sampleId: sampleId.trim(),
        typeId,
        parameter: parameter.trim(),
        value: numValue,
        unit: unit ? unit.trim() : "mg/L",
        status,
        testedBy: user.name || user.email || "Lab Technician",
        isVerified: false,
      },
      include: {
        type: { include: { category: true } },
      },
    });

    return NextResponse.json({ success: true, data: testRecord }, { status: 201 });
  } catch (error: any) {
    console.error("POST record error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to submit test result" }, { status: 500 });
  }
}

// NOTE: there is no PUT here on purpose. Edits must go through PUT /api/technician/tests,
// which checks the login, the 1-hour window and notifies the Manager.