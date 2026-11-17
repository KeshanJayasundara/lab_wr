"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      router.push("/dashboard/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-3 sm:mb-4">
            <Link href="/" className="inline-block transition-transform hover:scale-105" title="Go to Home">
              <Image 
                src="/logo.png" 
                alt="NWSDB Logo" 
                width={56} 
                height={56} 
                quality={100}
                unoptimized
                className="object-contain cursor-pointer w-14 h-14 sm:w-16 sm:h-16"
              />
            </Link>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            Security Password Reset
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium px-2">
            First-time login policy: Please update your temporary password
          </p>
        </div>

        <div className="bg-white py-6 px-5 sm:py-8 sm:px-10 shadow-xl rounded-2xl border border-slate-200/80">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-600 px-4 py-3 rounded-xl text-xs sm:text-sm mb-5 font-medium">
              {error}
            </div>
          )}

          <form className="space-y-4 sm:space-y-5" onSubmit={handleChangePassword}>
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs sm:text-sm font-semibold text-slate-700">
                New Password
              </label>
              <Input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters" 
                required 
                minLength={6}
                className="text-base sm:text-sm h-11"
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs sm:text-sm font-semibold text-slate-700">
                Confirm New Password
              </label>
              <Input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password" 
                required 
                minLength={6}
                className="text-base sm:text-sm h-11"
              />
            </div>

            <div className="pt-2 sm:pt-3">
              <Button 
                type="submit" 
                disabled={loading}
                variant="default" 
                className="w-full h-11 text-base font-semibold bg-blue-700 hover:bg-blue-800 text-white cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Update Password & Proceed"}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 National Water Supply & Drainage Board
        </p>
      </div>
    </div>
  );
}