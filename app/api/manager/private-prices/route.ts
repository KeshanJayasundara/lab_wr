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

function parsePrice(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100; // 2 decimal places
}

const paramSelect = { select: { id: true, name: true, unit: true } };

// GET: categories (with sub-categories) and every private-sample price
export async function GET(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const [categories, prices] = await Promise.all([
      prisma.privateCategory.findMany({
        orderBy: { createdAt: "asc" },
        include: { subCategories: { orderBy: { createdAt: "asc" } } },
      }),
      prisma.privateParameterPrice.findMany({
        include: { parameter: paramSelect },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return NextResponse.json({ success: true, data: { categories, prices } }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch prices" }, { status: 500 });
  }
}

// POST: bulk add prices – { categoryId, subCategoryId?, items: [{ name, unit?, price }] }
// Parameters are matched by name (case-insensitive) and created automatically if they don't exist yet.
export async function POST(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { categoryId, subCategoryId, items } = await request.json();

    if (!categoryId) {
      return NextResponse.json({ success: false, error: "Please select a category" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Add at least one parameter" }, { status: 400 });
    }

    const rows: { name: string; unit: string | null; price: number }[] = [];
    const seen = new Set<string>();
    for (const it of items) {
      const name = typeof it?.name === "string" ? it.name.trim() : "";
      const amount = parsePrice(it?.price);
      if (!name || amount === null) {
        return NextResponse.json({ success: false, error: "Every parameter needs a name and a valid price (0 or more)" }, { status: 400 });
      }
      if (seen.has(name.toLowerCase())) {
        return NextResponse.json({ success: false, error: `"${name}" is listed more than once` }, { status: 400 });
      }
      seen.add(name.toLowerCase());
      const unit = typeof it?.unit === "string" && it.unit.trim() ? it.unit.trim() : null;
      rows.push({ name, unit, price: amount });
    }

    if (subCategoryId) {
      const sub = await prisma.privateSubCategory.findFirst({ where: { id: subCategoryId, categoryId } });
      if (!sub) return NextResponse.json({ success: false, error: "Sub-category not found in this category" }, { status: 404 });
    }

    // 1) find each parameter by name (or create it) – outside the transaction so a slow
    //    connection can't make the transaction time out
    const resolved = await Promise.all(
      rows.map(async (r) => {
        let param = await prisma.testParameter.findFirst({ where: { name: { equals: r.name, mode: "insensitive" } } });
        if (!param) {
          param = await prisma.testParameter.create({ data: { name: r.name, unit: r.unit } });
        } else if (!param.unit && r.unit) {
          param = await prisma.testParameter.update({ where: { id: param.id }, data: { unit: r.unit } });
        }
        return { parameterId: param.id, price: r.price };
      })
    );

    // 1b) same parameter may exist in other sub-categories, but not twice in THIS one
    //     (explicit check because NULL sub-categories are not covered by the DB unique index)
    const already = await prisma.privateParameterPrice.findMany({
      where: {
        categoryId,
        subCategoryId: subCategoryId || null,
        parameterId: { in: resolved.map((r) => r.parameterId) },
      },
      include: { parameter: paramSelect },
    });
    if (already.length > 0) {
      const names = already.map((a) => a.parameter.name).join(", ");
      return NextResponse.json(
        { success: false, error: `Already priced in this ${subCategoryId ? "sub-category" : "category (no sub-category)"}: ${names}. Edit it instead.` },
        { status: 409 }
      );
    }

    // 2) save all prices together (all or nothing)
    const created = await prisma.$transaction(
      resolved.map((r) =>
        prisma.privateParameterPrice.create({
          data: { categoryId, subCategoryId: subCategoryId || null, parameterId: r.parameterId, price: r.price },
          include: { parameter: paramSelect },
        })
      )
    );
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, error: "This parameter already has a price in this sub-category. Edit it instead." }, { status: 409 });
    }
    if (error?.code === "P2003") {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to add prices" }, { status: 500 });
  }
}

// PUT: edit an existing price
export async function PUT(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { id, price } = await request.json();
    const amount = parsePrice(price);

    if (!id) return NextResponse.json({ success: false, error: "Price ID required" }, { status: 400 });
    if (amount === null) {
      return NextResponse.json({ success: false, error: "Enter a valid price (0 or more)" }, { status: 400 });
    }

    const updated = await prisma.privateParameterPrice.update({
      where: { id },
      data: { price: amount },
      include: { parameter: paramSelect },
    });
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ success: false, error: "Price not found" }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to update price" }, { status: 500 });
  }
}

// DELETE: remove a parameter from the private-sample price list
export async function DELETE(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "Price ID required" }, { status: 400 });

  try {
    await prisma.privateParameterPrice.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Price removed" }, { status: 200 });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ success: false, error: "Price not found" }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: "Failed to remove price" }, { status: 500 });
  }
}