import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { evaluateFromDb, withLiveStatus } from "@/lib/statusSync";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

// Technicians can edit a submitted result only for this long
const EDIT_WINDOW_MS = 60 * 60 * 1000;

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

// GET: Fetch technician test records with category and unit relations
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
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch test records" }, { status: 500 });
  }
}

// POST: Submit test result with automatic range evaluation and status detection
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
    return NextResponse.json({ success: false, error: error.message || "Failed to submit test result" }, { status: 500 });
  }
}

// PUT: Technician edits value within the 1-hour grace window. Parameter name & unit stay as originally saved.
// Every real change also creates a notification for the Manager (bell icon + details pop-up).
export async function PUT(request: Request) {
  const user = await verifyTechnician(request);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, value } = body;

    if (!id || value === undefined || value === "") {
      return NextResponse.json({ success: false, error: "Record ID and value are required" }, { status: 400 });
    }

    const record = await prisma.testRecord.findUnique({
      where: { id },
      include: { type: { include: { category: true } } },
    });
    if (!record) {
      return NextResponse.json({ success: false, error: "Test record not found" }, { status: 404 });
    }

    // Once the manager has verified a result it is locked
    if (record.isVerified) {
      return NextResponse.json({ success: false, error: "This result is already verified by the manager and cannot be edited." }, { status: 400 });
    }

    const diffMs = Date.now() - new Date(record.createdAt).getTime();
    if (diffMs > EDIT_WINDOW_MS) {
      return NextResponse.json({ success: false, error: "1-hour edit grace window has expired." }, { status: 400 });
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return NextResponse.json({ success: false, error: "Value must be a valid number" }, { status: 400 });
    }

    // Nothing changed -> no update, no notification
    if (numValue === record.value) {
      return NextResponse.json({ success: true, unchanged: true, data: record }, { status: 200 });
    }

    const newStatus = await evaluateFromDb(record.typeId, record.parameter, numValue);
    const oldStatus = await evaluateFromDb(record.typeId, record.parameter, record.value);

    // The JWT has no display name, so read it from the database
    const editor = await prisma.user.findUnique({ where: { id: user.userId }, select: { name: true } });
    const editedBy = editor?.name || user.email || "Lab Technician";

    const categoryName = record.type?.category?.name ?? "-";
    const unitName = record.type?.name ?? "-";
    const now = new Date();

    // Update + notification are saved together (both succeed or both fail)
    const [updated] = await prisma.$transaction([
      prisma.testRecord.update({
        where: { id },
        data: { value: numValue, status: newStatus },
        include: { type: { include: { category: true } } },
      }),
      prisma.managerNotification.create({
        data: {
          type: "TEST_EDITED",
          title: "Test result edited",
          message: `${editedBy} changed ${record.parameter} from ${record.value} to ${numValue} ${record.unit} (${unitName}, ${record.sampleId})`,
          data: {
            recordId: record.id,
            sampleId: record.sampleId,
            categoryName,
            unitName,
            parameter: record.parameter,
            unit: record.unit,
            oldValue: record.value,
            newValue: numValue,
            oldStatus,
            newStatus,
            editedBy,
            submittedAt: record.createdAt.toISOString(),
            editedAt: now.toISOString(),
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to update record" }, { status: 500 });
  }
}