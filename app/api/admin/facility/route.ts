import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

async function verifyAdmin(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const tokenCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!tokenCookie) return null;

    const verified = await jwtVerify(tokenCookie, JWT_SECRET);
    const payload = verified.payload as any;

    if (payload.role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}

const FIELDS = [
  "region",
  "departmentName",
  "departmentHead",
  "officialEmail",
  "officialPhone",
  "regionAddress",
  "privateContact",
] as const;

// Shown the very first time (before anything has been saved)
const DEFAULTS = {
  region: "Kurunegala",
  departmentName: "NWSDB Regional Water Reclamation Facility - Kurunegala",
  departmentHead: "Eng. Upul Shantha",
  officialEmail: "kurunegala.lab@waterboard.lk",
  officialPhone: "",
  regionAddress: "",
  privateContact: "",
};

const SETUP_HINT =
  "Facility profile table is missing. Add the FacilityProfile model to prisma/schema.prisma and run: npx prisma db push";

// GET: the saved facility profile (or the defaults if nothing is saved yet)
export async function GET(request: Request) {
  await connection(); // always run at request time (never prerendered / cached)
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const row = await prisma.facilityProfile.findUnique({ where: { id: "singleton" } });
    const data = row
      ? Object.fromEntries(FIELDS.map((f) => [f, (row as any)[f]]))
      : DEFAULTS;
    return NextResponse.json({ success: true, saved: !!row, data }, { status: 200 });
  } catch (error: any) {
    console.error("FACILITY GET ERROR:", error);
    return NextResponse.json({ success: false, error: SETUP_HINT }, { status: 500 });
  }
}

// PUT: save the facility profile
export async function PUT(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const clean: Record<string, string> = {};
    for (const f of FIELDS) {
      clean[f] = typeof body[f] === "string" ? body[f].trim() : "";
    }

    const labels: Record<string, string> = {
      region: "Region",
      departmentName: "Department Name",
      departmentHead: "Department Head",
      officialEmail: "Official Email",
      officialPhone: "Official Phone Number",
      regionAddress: "Region Address",
      privateContact: "Private Contact Number",
    };
    for (const f of FIELDS) {
      if (!clean[f]) {
        return NextResponse.json({ success: false, error: `${labels[f]} is required` }, { status: 400 });
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.officialEmail)) {
      return NextResponse.json({ success: false, error: "Official Email is not a valid email address" }, { status: 400 });
    }
    const phoneRe = /^[0-9+()\-\s]{7,20}$/;
    if (!phoneRe.test(clean.officialPhone)) {
      return NextResponse.json({ success: false, error: "Official Phone Number is not valid" }, { status: 400 });
    }
    if (!phoneRe.test(clean.privateContact)) {
      return NextResponse.json({ success: false, error: "Private Contact Number is not valid" }, { status: 400 });
    }

    const saved = await prisma.facilityProfile.upsert({
      where: { id: "singleton" },
      update: clean as any,
      create: { id: "singleton", ...(clean as any) },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Facility profile saved successfully",
        data: Object.fromEntries(FIELDS.map((f) => [f, (saved as any)[f]])),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("FACILITY PUT ERROR:", error);
    return NextResponse.json({ success: false, error: SETUP_HINT }, { status: 500 });
  }
}