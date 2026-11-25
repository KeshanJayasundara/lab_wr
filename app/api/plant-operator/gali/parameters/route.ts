import { NextResponse } from "next/server";
import { verifyPlantOperator } from "@/lib/plantOperatorAuth";
import { getGaliParameters } from "@/lib/plantConfig";

// GET: the parameters + ranges the Manager added under Plant Operator > Gali Operator > Parameters & Ranges
export async function GET(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ success: true, data: await getGaliParameters() });
  } catch (error) {
    console.error("GALI PARAMETERS GET ERROR:", error);
    return NextResponse.json({ success: false, error: "Failed to load parameters" }, { status: 500 });
  }
}