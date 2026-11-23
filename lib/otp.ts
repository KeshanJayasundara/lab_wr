import { createHmac } from "crypto";

// Only the HASH of a reset code is stored in the database, never the code itself.
export function hashOtp(otp: string, userId: string) {
  const secret = process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026";
  return createHmac("sha256", secret).update(`${userId}:${otp}`).digest("hex");
}