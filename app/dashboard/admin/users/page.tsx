"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Mail,
  CheckCircle2,
  XCircle,
  X,
  ChevronDown,
  Check,
  Loader2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

// text-base on mobile prevents iOS Safari from zooming on focus; 44px min touch target
const glassField =
  "w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm " +
  "transition-all duration-300 ease-out hover:bg-white/85 hover:border-blue-300 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90";

type Option = { value: string; label: string };

const isActive = (status: string) => status?.toUpperCase() === "ACTIVE";

const initials = (name: string) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

/* ------------------------- Delete confirmation code ------------------------- */

// Random code like "K7QM-X4R9-T2WB" (no look-alike characters such as O/0 or I/1)
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateConfirmCode = () => {
  const bytes = new Uint32Array(12);
  window.crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((g) => g.join("")).join("-");
};

// Keeps only letters/digits, upper-cases them and puts "-" after every 4 characters automatically.
// While typing, the dash appears right after the 4th / 8th character; while deleting it does not come back.
const formatConfirmInput = (value: string, isDeleting: boolean) => {
  const raw = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
  const groups = raw.match(/.{1,4}/g) || [];
  let out = groups.join("-");
  if (!isDeleting && raw.length > 0 && raw.length < 12 && raw.length % 4 === 0) out += "-";
  return out;
};

/* ---------------------------------- Select --------------------------------- */

function GlassSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // pointerdown covers mouse + touch
    const onDocPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${glassField} cursor-pointer flex items-center justify-between gap-2 text-left sm:hover:-translate-y-0.5 sm:hover:shadow-[0_8px_24px_rgba(59,130,246,0.25)]`}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-blue-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* In-flow (not absolute) so it never gets clipped by the scrollable modal on small screens */}
      {open && (
        <ul
          role="listbox"
          className="relative mt-2 w-full rounded-2xl p-1.5 space-y-0.5 bg-white/90 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between gap-3 px-3 min-h-[44px] sm:min-h-[36px] rounded-xl text-sm cursor-pointer transition-all duration-200 ease-out hover:bg-blue-500/15 hover:text-blue-700 active:bg-blue-500/20 ${
                  isSelected ? "bg-blue-500/10 font-semibold text-blue-700" : "text-slate-700"
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------- Badges ---------------------------------- */

function RoleBadge({ role }: { role: string }) {
  const displayRole =
    role === "ADMIN"
      ? "Super Admin (WR Boss)"
      : role === "MANAGER"
      ? "Lab Head (Manager)"
      : role === "INVENTORY_MANAGER"
      ? "Stock Keeper"
      : "Lab Assistant";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-xl border max-w-full ${
        role === "ADMIN"
          ? "bg-purple-400/20 text-purple-700 border-purple-400/40"
          : role === "MANAGER"
          ? "bg-amber-400/20 text-amber-700 border-amber-400/40"
          : role === "INVENTORY_MANAGER"
          ? "bg-blue-400/20 text-blue-700 border-blue-400/40"
          : "bg-emerald-400/20 text-emerald-700 border-emerald-400/40"
      }`}
    >
      <Shield size={12} className="shrink-0" />
      <span className="truncate">{displayRole}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return isActive(status) ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-xl bg-emerald-400/20 text-emerald-700 border border-emerald-400/40 whitespace-nowrap shrink-0">
      <CheckCircle2 size={12} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-xl bg-red-400/20 text-red-700 border border-red-400/40 whitespace-nowrap shrink-0">
      <XCircle size={12} /> Inactive
    </span>
  );
}

/* ----------------------------------- Page ---------------------------------- */

export default function AdminUsersPage() {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [confirmInput, setConfirmInput] = useState("");

  // Form state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("TECHNICIAN");
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch users");
      setUsersList(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Auto-dismiss success message
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 6000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // Lock background scroll + Escape to close while modal is open
  useEffect(() => {
    if (!isModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (deleteTarget) {
      setConfirmCode(generateConfirmCode());
      setConfirmInput("");
    }
  }, [deleteTarget]);

  useEffect(() => {
    if (!deleteTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) setDeleteTarget(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [deleteTarget, deleting]);

  const superAdminExists = usersList.some((u) => u.role === "ADMIN");

  const roleOptions: Option[] = [
    ...(!superAdminExists ? [{ value: "ADMIN", label: "Super Admin (WR Boss)" }] : []),
    { value: "MANAGER", label: "Lab Head (Manager)" },
    { value: "INVENTORY_MANAGER", label: "Stock Keeper (Inventory)" },
    { value: "TECHNICIAN", label: "Lab Assistant (Technician)" },
  ];

  const q = searchTerm.toLowerCase();
  const filteredUsers = usersList
    .filter(
      (user) =>
        (user.name ?? "").toLowerCase().includes(q) ||
        (user.email ?? "").toLowerCase().includes(q) ||
        (user.username ?? "").toLowerCase().includes(q) ||
        (user.role ?? "").toLowerCase().includes(q)
    )
    // Super Admin is always pinned to the top (sort is stable, so the rest keep their order)
    .sort((a, b) => Number(b.role === "ADMIN") - Number(a.role === "ADMIN"));

  const resetForm = () => {
    setNewUserName("");
    setNewUserEmail("");
    setNewUserUsername("");
    setNewUserPassword("");
    setNewUserRole("TECHNICIAN");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          username: newUserUsername,
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      setSuccessMsg("User created successfully! Forced password reset enabled on first login.");
      closeModal();
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = isActive(currentStatus) ? "INACTIVE" : "ACTIVE";
    setTogglingId(userId);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!confirmCode || confirmInput.trim().toUpperCase() !== confirmCode) return;
    setDeleting(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      setSuccessMsg(`User "${deleteTarget.name}" was deleted permanently.`);
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const renderToggleButton = (
    user: { id: string; role: string; status: string; name?: string; email?: string },
    fullWidth: boolean
  ) => {
    // 🔒 Lock out Super Admin from deactivation
    if (user.role === "ADMIN") {
      return (
        <span
          className={`text-xs font-semibold text-purple-700 bg-purple-400/10 border border-purple-300/40 px-3 py-1.5 rounded-full inline-flex items-center justify-center ${
            fullWidth ? "w-full min-h-[44px]" : ""
          }`}
        >
          Protected Account
        </span>
      );
    }

    const active = isActive(user.status);
    const busy = togglingId === user.id;

    const toggleButton = (
      <button
        onClick={() => toggleUserStatus(user.id, user.status)}
        disabled={busy}
        className={`font-semibold rounded-full border backdrop-blur-xl shadow-sm transition-all active:scale-[0.98] sm:hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${
          fullWidth ? "flex-1 min-h-[44px] px-3.5 py-2.5 text-sm" : "px-3.5 py-1.5 text-xs"
        } ${
          active
            ? "text-red-600 hover:text-red-700 bg-red-400/10 hover:bg-red-400/20 border-red-300/60"
            : "text-emerald-700 hover:text-emerald-800 bg-emerald-400/10 hover:bg-emerald-400/20 border-emerald-300/60"
        }`}
      >
        {busy && <Loader2 className="animate-spin h-4 w-4" />}
        {active ? "Deactivate" : "Activate"}
      </button>
    );

    const deleteButton = (
      <button
        onClick={() => setDeleteTarget({ id: user.id, name: (user as any).name, email: (user as any).email })}
        disabled={busy}
        aria-label="Delete user"
        className={`font-semibold rounded-full border backdrop-blur-xl shadow-sm transition-all active:scale-[0.98] sm:hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 text-white bg-red-500 hover:bg-red-600 border-red-500 ${
          fullWidth ? "flex-1 min-h-[44px] px-3.5 py-2.5 text-sm" : "px-3.5 py-1.5 text-xs"
        }`}
      >
        <Trash2 size={fullWidth ? 16 : 14} />
        Delete
      </button>
    );

    return (
      <div className={fullWidth ? "flex gap-2" : "inline-flex items-center gap-2"}>
        {toggleButton}
        {deleteButton}
      </div>
    );
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6 relative">
      {/* Header */}
      <div
        className={`${glass} flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl`}
      >
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 text-white shadow-lg shadow-purple-500/30 shrink-0">
              <Users size={22} />
            </span>
            <span className="min-w-0 break-words">User Management &amp; Access Control</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Manage NWSDB Kurunegala staff accounts, roles (WR Boss, Lab Head, Stock Keeper, Assistants).
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="default"
          className="w-full lg:w-auto min-h-[44px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-5 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
        >
          <UserPlus size={18} />
          Add New User
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500 text-red-600 p-3 sm:p-4 rounded-xl text-sm font-medium flex items-start justify-between gap-3"
        >
          <span className="min-w-0 break-words">{error}</span>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
            className="shrink-0 p-1 -m-1 rounded-full hover:bg-red-500/10 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {successMsg && (
        <div
          role="status"
          className="bg-emerald-500/10 border border-emerald-500 text-emerald-600 p-3 sm:p-4 rounded-xl text-sm font-medium flex items-start justify-between gap-3"
        >
          <span className="min-w-0 break-words">{successMsg}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setSuccessMsg("")}
            className="shrink-0 p-1 -m-1 rounded-full hover:bg-emerald-500/10 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search bar */}
      <div
        className={`${glass} p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between items-stretch sm:items-center`}
      >
        <div className="w-full sm:max-w-sm relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
            <Search size={18} />
          </span>
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Search users, email, username or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 min-h-[44px] sm:min-h-0 rounded-full border border-white/70 bg-white/60 text-base sm:text-sm text-slate-800 font-medium placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          />
        </div>
        <div className="text-xs text-slate-600 font-medium shrink-0">
          Total system users: <span className="font-bold text-slate-800">{filteredUsers.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className={`${glass} rounded-2xl sm:rounded-3xl p-8 text-center text-sm text-slate-600`}>
          No users found{searchTerm ? " matching your search." : "."}
        </div>
      ) : (
        <>
          {/* Phone + tablet: card list (below lg) */}
          <div className="lg:hidden grid gap-3 sm:grid-cols-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`${glass} p-4 space-y-3 rounded-2xl border-l-4 min-w-0 ${
                  user.role === "ADMIN"
                    ? "border-l-purple-500 !bg-purple-400/15 ring-purple-300/60"
                    : isActive(user.status)
                    ? "border-l-emerald-400"
                    : "border-l-red-400"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                      {initials(user.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {user.name}
                        {user.role === "ADMIN" && (
                          <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide text-purple-700 bg-purple-400/20 border border-purple-300/50 px-1.5 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </p>
                      {user.username && (
                        <p className="text-xs text-slate-500 truncate">@{user.username}</p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={user.status} />
                </div>

                <div className="flex items-start gap-1.5 text-xs text-slate-600 min-w-0">
                  <Mail size={14} className="text-slate-500 mt-0.5 shrink-0" />
                  <span className="break-all">{user.email}</span>
                </div>

                <div className="flex items-center min-w-0">
                  <RoleBadge role={user.role} />
                </div>

                {renderToggleButton(user, true)}
              </div>
            ))}
          </div>

          {/* Desktop: table (lg and up) */}
          <div className={`hidden lg:block ${glass} rounded-3xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/40 border-b border-white/60 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-6">User Name &amp; Username</th>
                    <th className="py-3.5 px-6">Email Address</th>
                    <th className="py-3.5 px-6">Assigned Role</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/50 text-sm">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`transition-all ${
                        user.role === "ADMIN"
                          ? "bg-purple-400/15 hover:bg-purple-400/20 shadow-[inset_4px_0_0_0_rgba(168,85,247,0.8)]"
                          : "hover:bg-white/55"
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                            {initials(user.name)}
                          </div>
                          <div>
                            <div>
                              {user.name}
                              {user.role === "ADMIN" && (
                                <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide text-purple-700 bg-purple-400/20 border border-purple-300/50 px-1.5 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            {user.username && (
                              <div className="text-xs text-slate-500 font-normal">@{user.username}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Mail size={14} className="text-slate-500 shrink-0" />
                          {user.email}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {renderToggleButton(user, false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add-user modal: bottom sheet on phones, centered dialog on sm+ */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-title"
            className="bg-white/85 sm:bg-white/70 backdrop-blur-2xl border border-white/70 shadow-2xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92dvh] sm:max-h-[90dvh] flex flex-col"
          >
            <div className="flex justify-between items-center gap-3 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-white/60 shrink-0">
              <div className="flex items-center gap-2 text-slate-900 min-w-0">
                <UserPlus className="text-blue-600 shrink-0" size={22} />
                <h3 id="add-user-title" className="text-base font-semibold truncate">
                  Add New System User
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeModal}
                className="text-slate-500 hover:text-slate-800 p-2.5 -mr-2 rounded-full cursor-pointer shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-4 min-h-0">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nu-name" className="text-xs font-semibold text-slate-700">
                    Full Name
                  </label>
                  <input
                    id="nu-name"
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. Kasun Weerasinghe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className={glassField}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nu-username" className="text-xs font-semibold text-slate-700">
                    Username (Optional)
                  </label>
                  <input
                    id="nu-username"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="e.g. kasunw"
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    className={glassField}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nu-email" className="text-xs font-semibold text-slate-700">
                    Email Address (@waterboard.lk)
                  </label>
                  <input
                    id="nu-email"
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="kasun.w@waterboard.lk"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className={glassField}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nu-password" className="text-xs font-semibold text-slate-700">
                    Temporary Password
                  </label>
                  <input
                    id="nu-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className={glassField}
                    required
                    minLength={6}
                  />
                  <p className="text-[11px] text-slate-500">
                    User will be forced to change this password on first login.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">System Role &amp; Access Level</span>
                  <GlassSelect value={newUserRole} onChange={setNewUserRole} options={roleOptions} />
                  {superAdminExists && (
                    <p className="text-[11px] text-purple-700 font-medium">
                      ⚠️ Super Admin (WR Boss) already exists. Creation restricted.
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 px-4 sm:px-6 pt-3 sm:pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 border-t border-white/60">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-full text-sm font-semibold text-slate-700 border border-white/70 bg-white/60 hover:bg-white/90 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md flex items-center justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {creating ? <Loader2 className="animate-spin h-5 w-5" /> : "Create User Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="bg-white/85 sm:bg-white/75 backdrop-blur-2xl border border-white/70 shadow-2xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-start gap-3">
              <span className="p-2.5 rounded-2xl bg-red-500/15 text-red-600 shrink-0">
                <AlertTriangle size={22} />
              </span>
              <div className="min-w-0">
                <h3 id="delete-user-title" className="text-base font-semibold text-slate-900">
                  Delete this user permanently?
                </h3>
                <p className="mt-1 text-sm text-slate-700 break-words">
                  <span className="font-semibold">{deleteTarget.name}</span>
                  <span className="text-slate-500"> ({deleteTarget.email})</span>
                </p>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  This removes the account from the database and it cannot be undone. Test records and other data created by
                  this user are kept.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-slate-700">Type this code exactly to confirm:</p>
              <div
                aria-label="Confirmation code"
                onCopy={(e) => e.preventDefault()}
                className="select-none text-center font-mono text-lg sm:text-xl font-bold tracking-[0.25em] text-red-700 bg-red-500/10 border border-red-300/60 rounded-2xl py-2.5"
              >
                {confirmCode}
              </div>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(formatConfirmInput(e.target.value, e.target.value.length < confirmInput.length))}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                maxLength={14}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                disabled={deleting}
                placeholder="XXXX-XXXX-XXXX"
                aria-label="Type the confirmation code"
                className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-2xl border bg-white/70 text-center font-mono text-base tracking-[0.2em] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 ${
                  confirmInput && confirmInput !== confirmCode
                    ? "border-red-300 focus:ring-red-400/60"
                    : confirmInput === confirmCode
                    ? "border-emerald-400 focus:ring-emerald-400/60"
                    : "border-white/70 focus:ring-blue-500/60"
                }`}
              />
              <p className="text-[11px] text-slate-500 text-center">
                Just type the 12 characters - the dashes are added automatically. Pasting is disabled and a new code is generated every time.
              </p>
            </div>

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-full text-sm font-semibold text-slate-700 border border-white/70 bg-white/60 hover:bg-white/90 cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting || !confirmCode || confirmInput !== confirmCode}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-full text-sm font-semibold bg-red-500 hover:bg-red-600 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 size={16} />}
                {deleting ? "Deleting..." : "Yes, delete user"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}