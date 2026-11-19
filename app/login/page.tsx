"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Message shown when the user was signed out automatically (/login?reason=...)
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "ACCOUNT_DEACTIVATED") {
      setError("Your account has been deactivated by the administrator, so you have been signed out. Please contact the admin to get it reactivated.");
    } else if (reason === "ACCOUNT_DELETED") {
      setError("Your account has been removed by the administrator, so you have been signed out.");
    } else if (reason === "session") {
      setError("Your session has ended. Please sign in again.");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid credentials");
      }

      // Check role-based redirection for all 4 roles
      if (data.data.mustChangePassword) {
        router.push("/change-password");
      } else if (data.data.role === "ADMIN") {
        router.push("/dashboard/admin"); // Super Admin (WR Boss)
      } else if (data.data.role === "MANAGER") {
        router.push("/dashboard/manager"); // Lab Head (Manager)
      } else if (data.data.role === "INVENTORY_MANAGER") {
        router.push("/dashboard/inventory"); // Stock Keeper
      } else if (data.data.role === "TECHNICIAN") {
        router.push("/dashboard/technician"); // Lab Assistants (Technicians)
      } else {
        router.push("/dashboard"); // Fallback default dashboard
      }
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
            Sign in
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium px-2">
            NWSDB Water Reclamation Section • Kurunegala
          </p>
        </div>

        <div className="bg-white py-6 px-5 sm:py-8 sm:px-10 shadow-xl rounded-2xl border border-slate-200/80">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-600 px-4 py-3 rounded-xl text-xs sm:text-sm mb-5 font-medium">
              {error}
            </div>
          )}

          <form className="space-y-4 sm:space-y-5" onSubmit={handleLogin}>
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs sm:text-sm font-semibold text-slate-700">
                Email Address or Username
              </label>
              <Input 
                type="text" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin or admin@nwsdb.lk" 
                required 
                className="text-base sm:text-sm h-11"
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs sm:text-sm font-semibold text-slate-700">
                Password
              </label>
              <Input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                required 
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
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign In"}
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