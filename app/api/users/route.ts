import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
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

// GET: Fetch all system users
export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST: Create new user with forced password reset
export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, username, password, role } = body;

    // 🔒 RESTRICTION: Only one Super Admin (ADMIN) allowed
    if (role === "ADMIN") {
      const existingAdmin = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      });
      if (existingAdmin) {
        return NextResponse.json(
          { success: false, error: "A Super Admin (WR Boss) already exists in the system." },
          { status: 400 }
        );
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(username ? [{ username }] : [])],
      },
    });

    if (existingUser) {
      return NextResponse.json({ success: false, error: "User with this email or username already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        username: username || null,
        password: hashedPassword,
        role: role || "TECHNICIAN",
        status: "ACTIVE",
        mustChangePassword: true, // 👈 Force password reset on first login!
      },
    });

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to create user" }, { status: 500 });
  }
}

// PATCH: Update user status (Active/Inactive)
export async function PATCH(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, status } = body;

    if (!userId || !["ACTIVE", "INACTIVE"].includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    // 🔒 The Super Admin account can never be deactivated
    if (target.role === "ADMIN") {
      return NextResponse.json(
        { success: false, error: "The Super Admin account is protected and cannot be deactivated." },
        { status: 403 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    return NextResponse.json({ success: true, data: updatedUser }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update user status" }, { status: 500 });
  }
}

// DELETE: Permanently remove a user account from the database.
// Only the User row is deleted - test records, chemical logs and every other
// piece of data that user created stays untouched (nothing is linked by a foreign key).
export async function DELETE(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "User id is required" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    // 🔒 Super Admin (and yourself) can never be deleted
    if (target.role === "ADMIN" || target.id === admin.userId) {
      return NextResponse.json(
        { success: false, error: "The Super Admin account is protected and cannot be deleted." },
        { status: 403 }
      );
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, message: "User deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    return NextResponse.json({ success: false, error: "Failed to delete user" }, { status: 500 });
  }
}