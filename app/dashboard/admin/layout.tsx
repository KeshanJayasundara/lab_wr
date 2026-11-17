"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // Colourful backdrop for the glass sidebar, header and cards to blur
    <div className="relative isolate h-screen flex overflow-hidden bg-gradient-to-br from-sky-100 via-indigo-100 to-fuchsia-100">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-16 h-96 w-96 rounded-full bg-blue-400/40 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-96 w-96 rounded-full bg-cyan-300/40 blur-3xl" />
      </div>

      {/* Floating glass sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Wrapper - Only this part scrolls */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header setSidebarOpen={setSidebarOpen} />

        {/* Dynamic Page Content (Scrollable) */}
        <main className="flex-1 min-h-0 p-3 sm:p-6 overflow-y-auto bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}