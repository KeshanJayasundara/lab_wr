import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomInt } from "crypto";
import { hashOtp } from "@/lib/otp";
import { sendPasswordResetOtp } from "@/lib/mailer";

const isDev = process.env.NODE_ENV !== "production";

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


const OTP_MINUTES = 10; // code lifetime
const COOLDOWN_SECONDS = 60; // minimum gap between two codes
const MAX_PER_HOUR = isDev ? 100 : 5; // max codes per account per hour (strict in production, relaxed while testing)

// While developing (npm run dev) the reason is also sent back + printed in the terminal, so you can see WHY no
// mail arrived. In production the visitor never gets any hint.
const generic = (devNote?: string) => {
  if (devNote) console.log(`[forgot-password] ${devNote}`);
  return NextResponse.json({ ...GENERIC, ...(isDev && devNote ? { dev: devNote } : {}) }, { status: 200 });
};

// The answer is ALWAYS the same, so nobody can use this form to find out which e-mails have an account.
const GENERIC = {
  success: true,
  message: "If that e-mail belongs to an active account, a 6-digit code has been sent to it.",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Enter a valid email address" }, { status: 400 });
    }

    const user = await withRetry(() =>
      prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      })
    );

    // Unknown / deactivated / pending accounts get the same answer but no code
    if (!user) {
      return generic(`No user with the e-mail "${email}" exists in the database (the e-mail must be an account e-mail from User Management).`);
    }
    if (user.status !== "ACTIVE") {
      return generic(`User found, but its status is ${user.status} (only ACTIVE accounts get a code).`);
    }

    const now = new Date();
    const existing = await withRetry(() => prisma.passwordReset.findUnique({ where: { userId: user.id } }));

    let sendCount = 1;
    let windowStartAt = now;

    if (existing) {
      const sinceLast = (now.getTime() - existing.lastSentAt.getTime()) / 1000;
      if (sinceLast < COOLDOWN_SECONDS) {
        return generic(`Too soon: wait ${Math.ceil(COOLDOWN_SECONDS - sinceLast)} more seconds before asking for another code.`);
      }

      const windowAgeMs = now.getTime() - existing.windowStartAt.getTime();
      if (windowAgeMs < 60 * 60 * 1000) {
        if (existing.sendCount >= MAX_PER_HOUR) {
          return generic(`Hourly limit reached (${MAX_PER_HOUR} codes per hour for this account).`);
        }
        sendCount = existing.sendCount + 1;
        windowStartAt = existing.windowStartAt;
      }
    }

    // 6-digit code from a cryptographically secure generator
    const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const data = {
      otpHash: hashOtp(otp, user.id),
      expiresAt: new Date(now.getTime() + OTP_MINUTES * 60 * 1000),
      attempts: 0,
      lastSentAt: now,
      sendCount,
      windowStartAt,
    };

    await withRetry(() =>
      prisma.passwordReset.upsert({
        where: { userId: user.id },
        update: data,
        create: { userId: user.id, ...data },
      })
    );

    try {
      await sendPasswordResetOtp(user.email, user.name, otp, OTP_MINUTES);
    } catch (mailError: any) {
      // Logged for the admin; the visitor still sees the same generic answer
      console.error("PASSWORD RESET MAIL ERROR:", mailError);
      // The mail never left, so this attempt must not count against the user's limits
      await prisma.passwordReset.delete({ where: { userId: user.id } }).catch(() => {});
      return generic(`The code was created but the e-mail could NOT be sent: ${mailError?.message || mailError}`);
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return generic("SMTP_USER / SMTP_PASS are not set in .env, so no e-mail was sent. The code was printed in the terminal (npm run dev window).");
    }
    return generic(`Code e-mailed to ${user.email}. If it is not in the inbox, check Spam.`);
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
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