import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateUniqueCode } from "@/lib/codeGenerator";

// Shortest unique letters-only code, avoiding every code already used by another unit
// (TestType.code is globally @unique, so we check across all categories)
async function getUniqueTypeCode(name: string, excludeId?: string) {
  const others = await prisma.testType.findMany({
    where: excludeId ? { NOT: { id: excludeId } } : {},
    select: { code: true },
  });
  const taken = others.map((o) => o.code).filter((c): c is string => !!c);
  return generateUniqueCode(name, taken) || "UNT";
}

// Case-insensitive duplicate check: same name inside the same category
async function findDuplicateType(categoryId: string, name: string, excludeId?: string) {
  return prisma.testType.findFirst({
    where: {
      categoryId,
      name: { equals: name.trim(), mode: "insensitive" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    include: { category: true },
  });
}

export async function GET() {
  try {
    const types = await prisma.testType.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: types }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch types" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { categoryId, name, description } = body;

    if (!categoryId || !name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Category ID and name are required" }, { status: 400 });
    }

    const duplicate = await findDuplicateType(categoryId, name);
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: `Tank / Unit "${duplicate.name}" already exists in ${duplicate.category.name}!` },
        { status: 409 }
      );
    }

    const code = await getUniqueTypeCode(name);

    const testType = await prisma.testType.create({
      data: {
        categoryId,
        name: name.trim(),
        code,
        description: description ? description.trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: testType }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, error: "This Tank / Unit already exists!" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to create type" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, categoryId, name, description } = body;

    if (!id || !categoryId || !name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "ID, Category ID, and name are required" }, { status: 400 });
    }

    const duplicate = await findDuplicateType(categoryId, name, id);
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: `Tank / Unit "${duplicate.name}" already exists in ${duplicate.category.name}!` },
        { status: 409 }
      );
    }

    // Keep the existing code when the name itself did not change
    const current = await prisma.testType.findUnique({ where: { id } });
    const code =
      current?.code && current.name.trim().toLowerCase() === name.trim().toLowerCase()
        ? current.code
        : await getUniqueTypeCode(name, id);

    const testType = await prisma.testType.update({
      where: { id },
      data: {
        categoryId,
        name: name.trim(),
        code,
        description: description ? description.trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: testType }, { status: 200 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, error: "This Tank / Unit already exists!" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to update type" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Unit ID is required" }, { status: 400 });
    }

    await prisma.testType.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Unit deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to delete unit" }, { status: 500 });
  }
}