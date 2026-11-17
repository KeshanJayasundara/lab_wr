import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { evaluateFromDb } from "@/lib/statusSync";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

async function verifyManager(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const tokenVal = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!tokenVal) return null;
    const verified = await jwtVerify(tokenVal, JWT_SECRET);
    const payload = verified.payload as any;
    if (payload.role !== "MANAGER" && payload.role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function PUT(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, isVerified, value } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required" }, { status: 400 });
    }

    const record = await prisma.testRecord.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    let calculatedStatus = record.status;
    let newVal = record.value;

    if (value !== undefined) {
      const diffMs = Date.now() - new Date(record.createdAt).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours > 24) {
        return NextResponse.json({ success: false, error: "24-hour update window has expired." }, { status: 400 });
      }

      newVal = parseFloat(value);
      if (isNaN(newVal)) {
        return NextResponse.json({ success: false, error: "Invalid value number" }, { status: 400 });
      }

      calculatedStatus = await evaluateFromDb(record.typeId, record.parameter, newVal);
    }

    const updated = await prisma.testRecord.update({
      where: { id },
      data: {
        ...(isVerified !== undefined ? { isVerified: Boolean(isVerified) } : {}),
        ...(value !== undefined ? { value: newVal, status: calculatedStatus } : {}),
      },
      include: {
        type: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "Record ID required" }, { status: 400 });
  }

  try {
    const record = await prisma.testRecord.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    const diffMs = Date.now() - new Date(record.createdAt).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours > 24) {
      return NextResponse.json({ success: false, error: "24-hour deletion window has expired." }, { status: 400 });
    }

    await prisma.testRecord.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Test record deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to delete record" }, { status: 500 });
  }
}