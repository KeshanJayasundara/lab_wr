import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { serialize } from "cookie";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

// Returns the logged-in user's token payload (or null). Works for any role; it only ever edits the user's OWN record (id comes from the JWT).
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
    if (!payload.userId) return null;
    return payload;
  } catch {
    return null;
  }
}

// Removes the login cookie (used when the account was deleted / deactivated by the admin)
function clearedSessionResponse(code: "ACCOUNT_DELETED" | "ACCOUNT_DEACTIVATED", error: string, status: number) {
  const response = NextResponse.json({ success: false, code, error }, { status });
  response.headers.set(
    "Set-Cookie",
    serialize("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    })
  );
  return response;
}

// GET: current user's profile (name + email) - also doubles as the "is my account still valid?" check

export async function GET(request: Request) {
  const session = await verifyManager(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const findUser = () =>
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true, status: true },
      });
    // Neon (serverless Postgres) can be asleep on the first request -> retry once
    let user;
    try {
      user = await findUser();
    } catch {
      await new Promise((r) => setTimeout(r, 800));
      user = await findUser();
    }
    if (!user) {
      return clearedSessionResponse("ACCOUNT_DELETED", "Your account no longer exists.", 401);
    }
    if (user.status !== "ACTIVE") {
      return clearedSessionResponse("ACCOUNT_DEACTIVATED", "Your account has been deactivated.", 403);
    }
    return NextResponse.json(
      { success: true, data: { id: user.id, name: user.name, email: user.email } },
      { status: 200 }
    );
  } catch (error) {
    console.error("PROFILE GET ERROR:", error);
    return NextResponse.json({ success: false, error: "Failed to load profile" }, { status: 500 });
  }
}

// PUT: update name / email / password of the logged-in manager
export async function PUT(request: Request) {
  const session = await verifyManager(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "A valid email is required" }, { status: 400 });
    }
    if (newPassword && newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }
    if (!currentPassword) {
      return NextResponse.json(
        { success: false, error: "Enter your current password to save changes" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return clearedSessionResponse("ACCOUNT_DELETED", "Your account no longer exists.", 401);
    }
    if (user.status !== "ACTIVE") {
      return clearedSessionResponse("ACCOUNT_DEACTIVATED", "Your account has been deactivated.", 403);
    }

    const passwordOk = await bcrypt.compare(currentPassword, user.password);
    if (!passwordOk) {
      return NextResponse.json({ success: false, error: "Current password is incorrect" }, { status: 403 });
    }

    // Email must stay unique
    if (email !== user.email) {
      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id: user.id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { success: false, error: "That email is already used by another account" },
          { status: 409 }
        );
      }
    }

    const data: { name: string; email: string; password?: string; mustChangePassword?: boolean } = {
      name,
      email,
    };
    if (newPassword) {
      data.password = await bcrypt.hash(newPassword, 10);
      data.mustChangePassword = false;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { id: true, name: true, email: true, role: true },
    });

    // The JWT carries the email, so re-issue it with the fresh value
    const newToken = await new SignJWT({
      userId: updated.id,
      email: updated.email,
      role: updated.role,
      mustChangePassword: false,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    const cookie = serialize("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
        data: { id: updated.id, name: updated.name, email: updated.email },
      },
      { status: 200 }
    );
    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (error: any) {
    console.error("PROFILE UPDATE ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}