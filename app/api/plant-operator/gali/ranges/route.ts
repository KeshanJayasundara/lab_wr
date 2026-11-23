import { NextResponse } from "next/server";
import { verifyPlantOperator } from "@/lib/plantOperatorAuth";
import { getGaliRanges } from "@/lib/plantConfig";

// GET: current ES / PH limits (set by the Manager)
export async function GET(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ success: true, data: await getGaliRanges() });
  } catch (error) {
    console.error("GALI RANGES GET ERROR:", error);
    return NextResponse.json({ success: false, error: "Failed to load ranges" }, { status: 500 });
  }
}