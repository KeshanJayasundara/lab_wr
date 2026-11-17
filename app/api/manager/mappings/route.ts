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
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");

  try {
    const mappings = await prisma.parameterMapping.findMany({
      where: locationId ? { locationId } : {},
      include: {
        location: true,
        parameter: true,
        chemical: true,
      },
    });
    return NextResponse.json({ success: true, data: mappings }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch mappings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { locationId, parameterId, chemicalId, defaultVolume, volumeUnit, standardMin, standardMax, unit } = body;

    if (!locationId || !parameterId) {
      return NextResponse.json({ success: false, error: "Tank location and parameter are required" }, { status: 400 });
    }

    const mapping = await prisma.parameterMapping.upsert({
      where: {
        locationId_parameterId: { locationId, parameterId },
      },
      update: {
        chemicalId: chemicalId || null,
        defaultVolume: defaultVolume !== "" && defaultVolume !== null ? parseFloat(defaultVolume) : null,
        volumeUnit: volumeUnit || null,
        standardMin: standardMin !== "" && standardMin !== null ? parseFloat(standardMin) : null,
        standardMax: standardMax !== "" && standardMax !== null ? parseFloat(standardMax) : null,
        unit: unit || null,
      },
      create: {
        locationId,
        parameterId,
        chemicalId: chemicalId || null,
        defaultVolume: defaultVolume !== "" && defaultVolume !== null ? parseFloat(defaultVolume) : null,
        volumeUnit: volumeUnit || null,
        standardMin: standardMin !== "" && standardMin !== null ? parseFloat(standardMin) : null,
        standardMax: standardMax !== "" && standardMax !== null ? parseFloat(standardMax) : null,
        unit: unit || null,
      },
    });

    return NextResponse.json({ success: true, data: mapping }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to save mapping" }, { status: 500 });
  }
}