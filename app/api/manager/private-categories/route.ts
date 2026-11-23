import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

async function verifyManager(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const tokenCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!tokenCookie) return null;
    const verified = await jwtVerify(tokenCookie, JWT_SECRET);
    const payload = verified.payload as any;
    if (payload.role !== "MANAGER" && payload.role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}

const unauthorized = () => NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

/**
 * Private-sample price categories and their sub-categories.
 * Body / query field `kind` is "category" or "sub".
 */

// POST: { kind: "category", name } or { kind: "sub", categoryId, name }
export async function POST(request: Request) {
  if (!(await verifyManager(request))) return unauthorized();

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return fail("Name is required", 400);

    if (body.kind === "sub") {
      if (!body.categoryId) return fail("Category is required", 400);
      const created = await prisma.privateSubCategory.create({
        data: { categoryId: body.categoryId, name },
      });
      return NextResponse.json({ success: true, data: created }, { status: 201 });
    }

    const created = await prisma.privateCategory.create({ data: { name } });
    return NextResponse.json({ success: true, data: { ...created, subCategories: [] } }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return fail("This name already exists", 409);
    if (error?.code === "P2003") return fail("Category not found", 404);
    return fail(error.message || "Failed to save", 500);
  }
}

// PUT: { kind, id, name } – rename
export async function PUT(request: Request) {
  if (!(await verifyManager(request))) return unauthorized();

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!body.id) return fail("ID required", 400);
    if (!name) return fail("Name is required", 400);

    const updated =
      body.kind === "sub"
        ? await prisma.privateSubCategory.update({ where: { id: body.id }, data: { name } })
        : await prisma.privateCategory.update({ where: { id: body.id }, data: { name } });
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    if (error?.code === "P2002") return fail("This name already exists", 409);
    if (error?.code === "P2025") return fail("Not found", 404);
    return fail(error.message || "Failed to update", 500);
  }
}

// DELETE: ?kind=category|sub&id=...
// Deleting a category also deletes its prices; deleting a sub-category keeps its
// prices in the category (sub-category is set to null by the database).
export async function DELETE(request: Request) {
  if (!(await verifyManager(request))) return unauthorized();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return fail("ID required", 400);

  try {
    if (searchParams.get("kind") === "sub") {
      await prisma.privateSubCategory.delete({ where: { id } });
    } else {
      await prisma.privateCategory.delete({ where: { id } });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    if (error?.code === "P2025") return fail("Not found", 404);
    return fail("Failed to delete", 500);
  }
}