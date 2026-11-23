import { NextResponse } from "next/server";
import { verifyManagerUser } from "@/lib/managerAuth";

export const unauthorized = () => NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
export const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });
export const ok = (data: unknown, status = 200) => NextResponse.json({ success: true, data }, { status });
export const guard = verifyManagerUser;
export const numOrNull = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));