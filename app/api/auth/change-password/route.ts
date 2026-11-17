import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { serialize } from "cookie";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const tokenCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!tokenCookie) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const verified = await jwtVerify(tokenCookie, JWT_SECRET);
    const payload = verified.payload as any;
    const userId = payload.userId;

    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false,
      },
    });

    const newToken = await new SignJWT({ 
      userId: updatedUser.id, 
      email: updatedUser.email, 
      role: updatedUser.role,
      mustChangePassword: false 
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
      { success: true, message: "Password updated successfully" },
      { status: 200 }
    );

    response.headers.set("Set-Cookie", cookie);
    return response;

  } catch (error: any) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to change password" }, { status: 500 });
  }
}