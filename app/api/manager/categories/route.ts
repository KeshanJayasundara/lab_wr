import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { generateUniqueCode } from "@/lib/codeGenerator";

// Shortest unique letters-only code, avoiding every code already used by another category
async function getUniqueCategoryCode(name: string, excludeId?: string) {
  const others = await prisma.testCategory.findMany({
    where: excludeId ? { NOT: { id: excludeId } } : {},
    select: { code: true },
  });
  const taken = others.map((o) => o.code).filter((c): c is string => !!c);
  return generateUniqueCode(name, taken) || "CAT";
}

// Case-insensitive duplicate name check
async function findDuplicateName(name: string, excludeId?: string) {
  return prisma.testCategory.findFirst({
    where: {
      name: { equals: name.trim(), mode: "insensitive" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
}

export async function GET() {
  try {
    const categories = await prisma.testCategory.findMany({
      include: { types: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: categories }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Category name is required and cannot be empty" }, { status: 400 });
    }

    const duplicate = await findDuplicateName(name);
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: `Category "${duplicate.name}" already exists!` },
        { status: 409 }
      );
    }

    const code = await getUniqueCategoryCode(name);

    const category = await prisma.testCategory.create({
      data: {
        name: name.trim(),
        code,
        description: description ? description.trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, error: "This category already exists!" }, { status: 409 });
    }
    console.error("❌ Error creating category:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create category" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, name, description } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ success: false, error: "ID and category name are required" }, { status: 400 });
    }

    const duplicate = await findDuplicateName(name, id);
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: `Category "${duplicate.name}" already exists!` },
        { status: 409 }
      );
    }

    // Keep the existing code when the name itself did not change (e.g. only description edited)
    const current = await prisma.testCategory.findUnique({ where: { id } });
    const code =
      current?.code && current.name.trim().toLowerCase() === name.trim().toLowerCase()
        ? current.code
        : await getUniqueCategoryCode(name, id);

    const category = await prisma.testCategory.update({
      where: { id },
      data: {
        name: name.trim(),
        code,
        description: description ? description.trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 200 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, error: "This category already exists!" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Category ID is required" }, { status: 400 });
    }

    await prisma.testCategory.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Category deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to delete category" }, { status: 500 });
  }
}