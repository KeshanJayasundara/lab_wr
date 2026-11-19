"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Bell } from "lucide-react";
import ProfileModal, { ManagerProfile } from "@/components/manager/ProfileModal";

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export function Header({ setSidebarOpen }: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  // Logged-in user's real name + email (from the database)
  const [profile, setProfile] = useState<ManagerProfile | null>(null);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch("/api/manager/profile", { cache: "no-store", credentials: "same-origin" });
        const json = await res.json();
        // Account deleted / deactivated by the admin (or session gone) -> sign out automatically
        if (res.status === 401 || res.status === 403) {
          window.location.replace(`/login?reason=${json?.code || "session"}`);
          return;
        }
        if (res.ok && json.success) {
          setProfile({ name: json.data.name, email: json.data.email });
          setProfileError("");
        } else {
          console.error("Admin profile load failed:", res.status, json);
          setProfileError(json?.error || `Error ${res.status}`);
        }
      } catch (err) {
        console.error("Admin profile load failed:", err);
        setProfileError("Could not load profile");
      }
    };

    loadProfile();
        // Check the account every 5 seconds (and when the tab regains focus)
    const timer = setInterval(loadProfile, 5000);
    window.addEventListener("focus", loadProfile);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", loadProfile);
    };
  }, []);

  const initials = profile
    ? profile.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "AD"
    : "";

  return (
    <>
    <header className="h-16 mx-3 mt-3 lg:ml-0 rounded-2xl bg-white/40 backdrop-blur-2xl border border-white/60 ring-1 ring-inset ring-white/40 shadow-[0_8px_32px_rgba(15,23,42,0.08)] flex items-center justify-between px-4 sm:px-6 sticky top-3 z-30">
      <div className="flex items-center gap-4 min-w-0">
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden text-slate-600 hover:text-slate-900 p-1 rounded-lg hover:bg-white/60 cursor-pointer transition-all"
        >
          <Menu size={22} />
        </button>
        <h2 className="text-base sm:text-lg font-semibold text-slate-800 tracking-tight truncate">
          Kurunegala Water Reclamation Plant
        </h2>
      </div>

      {/* Right Header Icons / Profile */}
      <div className="flex items-center gap-4">
        {/* Notification Bell with Badge linked to Notifications Center */}
        <Link
          href="/dashboard/admin/notifications"
          className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer block"
          title="View Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white/70 animate-pulse"></span>
        </Link>

        {/* Admin Profile Pill (click to edit profile) */}
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          title="Edit profile"
          className="flex items-center gap-3 pl-3 border-l border-white/60 cursor-pointer rounded-xl py-1 pr-2 transition-all hover:bg-white/60"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/30 ring-1 ring-inset ring-white/40">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            {profile ? (
              <>
                <p className="text-xs font-bold text-slate-800">{profile.name}</p>
                <p className="text-[10px] text-slate-600">{profile.email}</p>
              </>
            ) : profileError ? (
              <p className="text-xs font-semibold text-red-600">{profileError}</p>
            ) : (
              <>
                <div className="h-3 w-28 rounded bg-white/60 animate-pulse" />
                <div className="mt-1.5 h-2.5 w-36 rounded bg-white/50 animate-pulse" />
              </>
            )}
          </div>
        </button>
      </div>
    </header>

    {/* Rendered outside <header> so the blur on the header doesn't trap the fixed popup */}
    {profile && (
      <ProfileModal
        open={profileOpen}
        profile={profile}
        onClose={() => setProfileOpen(false)}
        onUpdated={setProfile}
      />
    )}
    </>
  );
}