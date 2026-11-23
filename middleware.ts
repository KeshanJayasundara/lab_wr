import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const tokenCookie = request.cookies.get("token");

  // 1. Protect Admin Dashboard Routes
  if (path.startsWith("/dashboard/admin")) {
    if (!tokenCookie) return NextResponse.redirect(new URL("/login", request.url));
    try {
      const verified = await jwtVerify(tokenCookie.value, JWT_SECRET);
      const payload = verified.payload as any;

      if (payload.mustChangePassword) return NextResponse.redirect(new URL("/change-password", request.url));
      if (payload.role !== "ADMIN") return NextResponse.redirect(new URL("/login", request.url));
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 2. Protect Lab Head / Manager Dashboard Routes
  if (path.startsWith("/dashboard/manager")) {
    if (!tokenCookie) return NextResponse.redirect(new URL("/login", request.url));
    try {
      const verified = await jwtVerify(tokenCookie.value, JWT_SECRET);
      const payload = verified.payload as any;

      if (payload.mustChangePassword) return NextResponse.redirect(new URL("/change-password", request.url));
      if (payload.role !== "MANAGER" && payload.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 3. Protect Plant Operator Dashboard Routes
  if (path.startsWith("/dashboard/plant-operator")) {
    if (!tokenCookie) return NextResponse.redirect(new URL("/login", request.url));
    try {
      const verified = await jwtVerify(tokenCookie.value, JWT_SECRET);
      const payload = verified.payload as any;

      if (payload.mustChangePassword) return NextResponse.redirect(new URL("/change-password", request.url));
      if (payload.role !== "PLANT_OPERATOR") return NextResponse.redirect(new URL("/login", request.url));
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 4. Protect /change-password route
  if (path === "/change-password") {
    if (!tokenCookie) return NextResponse.redirect(new URL("/login", request.url));
    try {
      const verified = await jwtVerify(tokenCookie.value, JWT_SECRET);
      const payload = verified.payload as any;

      if (!payload.mustChangePassword) {
        if (payload.role === "ADMIN") return NextResponse.redirect(new URL("/dashboard/admin", request.url));
        if (payload.role === "MANAGER") return NextResponse.redirect(new URL("/dashboard/manager", request.url));
        if (payload.role === "PLANT_OPERATOR") return NextResponse.redirect(new URL("/dashboard/plant-operator", request.url));
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/admin/:path*", "/dashboard/manager/:path*", "/dashboard/plant-operator/:path*", "/change-password"],
};