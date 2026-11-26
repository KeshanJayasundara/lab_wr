import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

// Logged-in Manager / Admin (from the DB, must be ACTIVE) or null.
export async function verifyManagerUser(request: Request) {
  try {
    const tokenVal = request.headers
      .get("cookie")
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    if (!tokenVal) return null;
    const { payload } = await jwtVerify(tokenVal, JWT_SECRET);
    if (typeof payload.userId !== "string") return null;
    if (payload.role !== "MANAGER" && payload.role !== "ADMIN") return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, role: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") return null;
    if (user.role !== "MANAGER" && user.role !== "ADMIN") return null;
    return user;
  } catch {
    return null;
  }
}