"use client";

import React, { useEffect, useState } from "react";
import { X, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export interface ManagerProfile {
  name: string;
  email: string;
}

interface ProfileModalProps {
  open: boolean;
  profile: ManagerProfile;
  onClose: () => void;
  onUpdated: (profile: ManagerProfile) => void;
}

const inputClass =
  "w-full h-10 rounded-xl border border-white/70 bg-white/70 px-3 text-sm text-slate-800 " +
  "placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40";

export default function ProfileModal({ open, profile, onClose, onUpdated }: ProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Reset the form every time the popup is opened
  useEffect(() => {
    if (open) {
      setName(profile.name);
      setEmail(profile.email);
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setShowPasswords(false);
      setError("");
      setSuccess("");
    }
  }, [open, profile.name, profile.email]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) return setError("Name is required");
    if (!email.trim()) return setError("Email is required");
    if (newPassword && newPassword.length < 6) {
      return setError("New password must be at least 6 characters long");
    }
    if (newPassword !== confirmPassword) return setError("New passwords do not match");
    if (!currentPassword) return setError("Enter your current password to save changes");

    setSaving(true);
    try {
      const res = await fetch("/api/manager/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          currentPassword,
          newPassword: newPassword || undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Failed to update profile");
        return;
      }

      onUpdated({ name: json.data.name, email: json.data.email });
      setSuccess("Profile updated successfully");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setTimeout(onClose, 900);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_16px_48px_rgba(15,23,42,0.25)] animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h3 id="profile-modal-title" className="text-lg font-bold text-slate-900">
              My Profile
            </h3>
            <p className="text-xs text-slate-600">Update your name, email or password</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/70 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Full name"
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="manager@waterboard.lk"
              autoComplete="email"
            />
          </div>

          <div className="pt-2 border-t border-white/60 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">
                Change password <span className="font-normal text-slate-500">(optional)</span>
              </p>
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPasswords ? "Hide" : "Show"}
              </button>
            </div>

            <input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder="New password (leave blank to keep current)"
              autoComplete="new-password"
            />
            <input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
          </div>

          <div className="pt-2 border-t border-white/60 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Current password <span className="text-red-500">*</span>
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              placeholder="Required to confirm any change"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-300/60 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-300/60 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl text-sm font-medium text-slate-700 hover:bg-white/70 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 h-10 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition cursor-pointer inline-flex items-center gap-2"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}