import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyManagerUser } from "@/lib/managerAuth";

const unauthorized = () => NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

// GET: latest notifications (newest first) + how many are still unread (for the bell badge)
export async function GET(request: Request) {
  const manager = await verifyManagerUser(request);
  if (!manager) return unauthorized();

  try {
    const [items, unreadCount] = await Promise.all([
      prisma.managerNotification.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.managerNotification.count({ where: { isRead: false } }),
    ]);
    return NextResponse.json({ success: true, data: { items, unreadCount } }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load notifications" }, { status: 500 });
  }
}

// PATCH: mark one notification ({ id }) or all of them ({ all: true }) as read
export async function PATCH(request: Request) {
  const manager = await verifyManagerUser(request);
  if (!manager) return unauthorized();

  try {
    const body = await request.json();
    if (body?.all === true) {
      await prisma.managerNotification.updateMany({ where: { isRead: false }, data: { isRead: true } });
    } else if (typeof body?.id === "string") {
      await prisma.managerNotification.updateMany({ where: { id: body.id }, data: { isRead: true } });
    } else {
      return NextResponse.json({ success: false, error: "id or all is required" }, { status: 400 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update notification" }, { status: 500 });
  }
}