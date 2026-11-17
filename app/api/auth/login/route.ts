import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { serialize } from "cookie";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username, identifier, password } = body;

    // Accept email, username, or generic identifier from frontend
    const loginKey = email || identifier || username;

    if (!loginKey || !password) {
      return NextResponse.json({ success: false, error: "Email/Username and password are required" }, { status: 400 });
    }

    // Find user by email OR username dynamically
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginKey },
          { username: loginKey },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid email/username or password" }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Account is pending approval or inactive" }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, error: "Invalid email/username or password" }, { status: 401 });
    }

    // Generate JWT Token including mustChangePassword flag
    const token = await new SignJWT({ 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      mustChangePassword: user.mustChangePassword 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    const cookie = serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      },
      { status: 200 }
    );

    response.headers.set("Set-Cookie", cookie);
    return response;

  } catch (error: any) {
    console.error("LOGIN API ERROR:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}