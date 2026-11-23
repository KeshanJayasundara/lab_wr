import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

// Returns the logged-in Plant Operator (from the DB) or null.
// Also makes sure the account is still ACTIVE.
export async function verifyPlantOperator(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const tokenVal = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    if (!tokenVal) return null;

    const { payload } = await jwtVerify(tokenVal, JWT_SECRET);
    if (payload.role !== "PLANT_OPERATOR" || typeof payload.userId !== "string") return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, role: true, status: true },
    });
    if (!user || user.status !== "ACTIVE" || user.role !== "PLANT_OPERATOR") return null;
    return user;
  } catch {
    return null;
  }
}