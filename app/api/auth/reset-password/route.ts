import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { hashOtp } from "@/lib/otp";

const isDev = process.env.NODE_ENV !== "production";
const MAX_ATTEMPTS = 5;
// The cloud database (Neon) sometimes drops an idle connection or is still waking up.
// Retrying a couple of times makes that invisible to the user.
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const waits = [600, 1500];
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= waits.length) throw e;
      await new Promise((r) => setTimeout(r, waits[i]));
    }
  }
}

// Short, readable reason for the DEV NOTE (the useful part of a Prisma error is at the END of its message)
function devReason(error: any) {
  const code = error?.code ? `[${error.code}] ` : "";
  const msg = String(error?.message || error);
  const hint = error?.code === "P2021" ? " -> the PasswordReset table is missing: run `npx prisma db push`." : "";
  return (code + msg.slice(-350) + hint).trim();
}

const INVALID = "Invalid or expired code. Please check the code or request a new one.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    // verifyOnly = just check the code (used to unlock the "new password" fields). Nothing is changed or burned.
    const verifyOnly = body.verifyOnly === true;

    if (!email || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ success: false, error: INVALID }, { status: 400 });
    }
    if (!verifyOnly && newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const user = await withRetry(() =>
      prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      })
    );
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ success: false, error: INVALID }, { status: 400 });
    }

    const reset = await withRetry(() => prisma.passwordReset.findUnique({ where: { userId: user.id } }));
    if (!reset) {
      return NextResponse.json({ success: false, error: INVALID }, { status: 400 });
    }

    // Expired -> the code is dead
    if (reset.expiresAt.getTime() < Date.now()) {
      await prisma.passwordReset.delete({ where: { userId: user.id } }).catch(() => {});
      return NextResponse.json({ success: false, error: INVALID }, { status: 400 });
    }

    // Too many wrong guesses -> the code is dead, a new one must be requested
    if (reset.attempts >= MAX_ATTEMPTS) {
      await prisma.passwordReset.delete({ where: { userId: user.id } }).catch(() => {});
      return NextResponse.json(
        { success: false, error: "Too many wrong attempts. Please request a new code." },
        { status: 429 }
      );
    }

    const given = Buffer.from(hashOtp(otp, user.id), "hex");
    const stored = Buffer.from(reset.otpHash, "hex");
    const matches = given.length === stored.length && timingSafeEqual(given, stored);

    if (!matches) {
      const updated = await prisma.passwordReset.update({
        where: { userId: user.id },
        data: { attempts: { increment: 1 } },
      });
      const left = Math.max(0, MAX_ATTEMPTS - updated.attempts);
      return NextResponse.json(
        { success: false, error: `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` },
        { status: 400 }
      );
    }

    // Code is correct. For a "verify only" call we stop here (the code stays valid for the final step).
    if (verifyOnly) {
      return NextResponse.json({ success: true, verified: true }, { status: 200 });
    }

    // Correct code: set the new password and burn the code (single use)
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashed, mustChangePassword: false },
      }),
      prisma.passwordReset.delete({ where: { userId: user.id } }),
    ]);

    return NextResponse.json(
      { success: true, message: "Password changed successfully. You can sign in now." },
      { status: 200 }
    );
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong. Please try again in a moment.",
        ...(isDev ? { dev: devReason(error) } : {}),
      },
      { status: 500 }
    );
  }
}