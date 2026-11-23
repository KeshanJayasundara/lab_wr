"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, ArrowLeft, MailCheck, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "login" | "forgot-email" | "forgot-reset";

const RESEND_SECONDS = 60;
const EMPTY_CODE = ["", "", "", "", "", ""];

// Small eye button that sits inside a password field
function EyeToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      title={shown ? "Hide password" : "Show password"}
      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700 cursor-pointer"
    >
      {shown ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

// a***@gmail.com
const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name[0]}${"*".repeat(Math.max(2, name.length - 1))}@${domain}`;
};

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  // sign in
  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // forgot password
  const [resetEmail, setResetEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(EMPTY_CODE); // the 6 code boxes
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [banner, setBanner] = useState(false); // "password changed" banner
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);
  const newPasswordRef = useRef<HTMLInputElement | null>(null);
  const lastCheckedRef = useRef("");

  const otp = digits.join("");

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

  // "Resend code" countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // "Password changed" banner hides itself
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(false), 8000);
    return () => clearTimeout(t);
  }, [banner]);

  // As soon as the 6th digit is typed, check the code automatically
  useEffect(() => {
    if (mode !== "forgot-reset" || codeVerified || verifying) return;
    if (!/^\d{6}$/.test(otp)) return;
    if (lastCheckedRef.current === otp) return;
    lastCheckedRef.current = otp;
    verifyCode(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, mode, codeVerified, verifying]);

  // When the code is accepted, jump to the new-password field
  useEffect(() => {
    if (codeVerified) newPasswordRef.current?.focus();
  }, [codeVerified]);

  const clearCode = () => {
    setDigits(EMPTY_CODE);
    setCodeVerified(false);
    lastCheckedRef.current = "";
  };

  const goTo = (next: Mode) => {
    setMode(next);
    setError("");
    setInfo("");
    clearCode();
    setNewPassword("");
    setConfirmPassword("");
  };

  /* ---------------------------- 6 code boxes ---------------------------- */

  const fillFrom = (start: number, text: string) => {
    const chars = text.replace(/\D/g, "").slice(0, 6 - start).split("");
    if (chars.length === 0) return;
    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((c, k) => {
        next[start + k] = c;
      });
      return next;
    });
    const focusAt = Math.min(start + chars.length, 5);
    setTimeout(() => boxRefs.current[focusAt]?.focus(), 0);
  };

  const onBoxChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "");
    if (!v) {
      setDigits((prev) => prev.map((d, k) => (k === i ? "" : d)));
      return;
    }
    fillFrom(i, v); // 1 digit when typing, several when the phone auto-fills the code
  };

  const onBoxKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      setDigits((prev) => prev.map((d, k) => (k === i - 1 ? "" : d)));
      boxRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      boxRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      e.preventDefault();
      boxRefs.current[i + 1]?.focus();
    }
  };

  const onBoxPaste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fillFrom(0, e.clipboardData.getData("text"));
  };

  /* ------------------------------- API calls ------------------------------ */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

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
      } else if (data.data.role === "PLANT_OPERATOR") {
        router.push("/dashboard/plant-operator"); // Plant Operators
      } else {
        router.push("/dashboard"); // Fallback default dashboard
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: ask for the code
  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send the code");

      setMode("forgot-reset");
      clearCode();
      setCooldown(RESEND_SECONDS);
      setInfo(`If that e-mail belongs to an active account, a 6-digit code was sent to ${maskEmail(resetEmail)}. It expires in 10 minutes.`);
      setTimeout(() => boxRefs.current[0]?.focus(), 50);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2a: the code is checked automatically when the 6th digit is typed
  const verifyCode = async (code: string) => {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, otp: code, verifyOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify the code");

      setCodeVerified(true);
      setInfo("");
    } catch (err: any) {
      setError(err.message);
      clearCode();
      setTimeout(() => boxRefs.current[0]?.focus(), 0);
    } finally {
      setVerifying(false);
    }
  };

  // Step 2b: set the new password
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) return setError("New password must be at least 8 characters long");
    if (newPassword !== confirmPassword) return setError("The two passwords do not match");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        // e.g. the code expired in the meantime -> start the code step again
        clearCode();
        throw new Error(data.error || "Could not reset the password");
      }

      // back to sign in + success banner
      clearCode();
      setNewPassword("");
      setConfirmPassword("");
      setPassword("");
      setIdentifier(resetEmail);
      setInfo("");
      setMode("login");
      setBanner(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, { h: string; p: string }> = {
    login: { h: "Sign in", p: "NWSDB Water Reclamation Section • Kurunegala" },
    "forgot-email": { h: "Forgot password?", p: "Enter your account e-mail and we will send you a code" },
    "forgot-reset": {
      h: "Reset password",
      p: codeVerified ? "Code verified - choose your new password" : "Enter the 6-digit code from your e-mail",
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      {/* Password changed banner */}
      {banner && (
        <div
          role="status"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-emerald-600 text-white rounded-2xl shadow-2xl px-4 py-3.5 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <CheckCircle2 size={22} className="shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm">Password changed successfully</p>
            <p className="text-xs text-emerald-50 mt-0.5">You can now sign in with your new password.</p>
          </div>
          <button
            type="button"
            onClick={() => setBanner(false)}
            aria-label="Close"
            className="shrink-0 text-emerald-100 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      )}

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
            {titles[mode].h}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium px-2">
            {titles[mode].p}
          </p>
        </div>

        <div className="bg-white py-6 px-5 sm:py-8 sm:px-10 shadow-xl rounded-2xl border border-slate-200/80">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-600 px-4 py-3 rounded-xl text-xs sm:text-sm mb-5 font-medium">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-700 px-4 py-3 rounded-xl text-xs sm:text-sm mb-5 font-medium flex items-start gap-2">
              <MailCheck size={18} className="shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          {/* ---------------------------- SIGN IN ---------------------------- */}
          {mode === "login" && (
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
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(identifier.includes("@") ? identifier : "");
                      goTo("forgot-email");
                    }}
                    className="text-xs sm:text-sm font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    required 
                    autoComplete="current-password"
                    className="text-base sm:text-sm h-11 pr-11"
                  />
                  <EyeToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                </div>
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
          )}

          {/* ------------------- FORGOT: step 1 (e-mail) ------------------- */}
          {mode === "forgot-email" && (
            <form className="space-y-4 sm:space-y-5" onSubmit={requestCode}>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs sm:text-sm font-semibold text-slate-700">
                  Account Email Address
                </label>
                <Input
                  type="email"
                  inputMode="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="text-base sm:text-sm h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-semibold bg-blue-700 hover:bg-blue-800 text-white cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Send verification code"}
              </Button>

              <button
                type="button"
                onClick={() => goTo("login")}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft size={16} /> Back to sign in
              </button>
            </form>
          )}

          {/* ----------- FORGOT: step 2 (code boxes -> new password) ----------- */}
          {mode === "forgot-reset" && (
            <form className="space-y-5" onSubmit={handleReset}>
              {/* 6 boxes */}
              <div className="space-y-2">
                <label className="block text-center text-xs sm:text-sm font-semibold text-slate-700">
                  6-digit code
                </label>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        boxRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      maxLength={i === 0 ? 6 : 1}
                      value={d}
                      disabled={codeVerified || verifying}
                      onChange={(e) => onBoxChange(i, e)}
                      onKeyDown={(e) => onBoxKeyDown(i, e)}
                      onPaste={(e) => onBoxPaste(i, e)}
                      onFocus={(e) => e.target.select()}
                      aria-label={`Digit ${i + 1}`}
                      className={`w-11 h-12 sm:w-12 sm:h-14 py-3 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 outline-none transition-all ${
                        codeVerified
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
                      } ${verifying ? "opacity-60" : ""}`}
                    />
                  ))}
                </div>

                <div className="h-5 flex items-center justify-center text-xs font-semibold">
                  {verifying && (
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Loader2 size={14} className="animate-spin" /> Checking the code...
                    </span>
                  )}
                  {codeVerified && (
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <ShieldCheck size={15} /> Code verified
                    </span>
                  )}
                </div>
              </div>

              {/* appears only after the code is correct */}
              {codeVerified && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700">New password</label>
                    <div className="relative">
                      <Input
                        ref={newPasswordRef as any}
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        required
                        autoComplete="new-password"
                        className="text-base sm:text-sm h-11 pr-11"
                      />
                      <EyeToggle shown={showNewPassword} onToggle={() => setShowNewPassword((v) => !v)} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700">Confirm new password</label>
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Type it again"
                      required
                      autoComplete="new-password"
                      className="text-base sm:text-sm h-11"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 text-base font-semibold bg-blue-700 hover:bg-blue-800 text-white cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center"
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Change password"}
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => goTo("forgot-email")}
                  className="flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ArrowLeft size={16} /> Change e-mail
                </button>
                {!codeVerified && (
                  <button
                    type="button"
                    disabled={cooldown > 0 || loading || verifying}
                    onClick={() => requestCode()}
                    className="font-semibold text-blue-700 hover:text-blue-900 cursor-pointer disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 National Water Supply & Drainage Board
        </p>
      </div>
    </div>
  );
}