import Link from "next/link";
import Image from "next/image";
import { Package, ShieldCheck, ArrowRight, Droplets, MapPin, Phone, Mail } from "lucide-react";

// Shared "frosted glass" look (same as the dashboards)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

export default function LandingPage() {
  return (
    // Colourful backdrop for the glass to blur (stays fixed while scrolling)
    <div className="relative isolate min-h-screen flex flex-col bg-gradient-to-br from-sky-100 via-indigo-100 to-fuchsia-100">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-16 h-96 w-96 rounded-full bg-blue-400/40 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-96 w-96 rounded-full bg-cyan-300/40 blur-3xl" />
      </div>

      {/* Floating glass navigation bar */}
      <header className="sticky top-3 z-50 mx-3 sm:mx-6 mt-3 rounded-2xl bg-white/40 backdrop-blur-2xl border border-white/60 ring-1 ring-inset ring-white/40 shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-4 group">
            {/* Real NWSDB Logo */}
            <div className="flex-shrink-0 bg-white/80 rounded-xl p-1 shadow-sm ring-1 ring-inset ring-white/70 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">
              <Image
                src="/logo.png"
                alt="NWSDB Logo"
                width={40}
                height={40}
                quality={100}
                unoptimized
                className="object-contain sm:w-[44px] sm:h-[44px]"
                priority
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                NWSDB
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-600 mt-1 sm:mt-0.5 tracking-tight">
                Water Reclamation • Kurunegala
              </span>
            </div>
          </div>

          {/* Center Navigation Links (Hidden on small screens) */}
          <nav className="hidden md:flex items-center gap-2">
            {[
              { label: "Home", href: "#home" },
              { label: "About", href: "#about" },
              { label: "Contact", href: "#contact" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-base font-semibold text-slate-700 hover:text-blue-700 hover:bg-white/60 px-4 py-2 rounded-full transition-all duration-200 hover:-translate-y-0.5"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div>
            <Link
              href="/login"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-full font-semibold transition-all text-sm sm:text-base shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section (ID: home) */}
      <main id="home" className="flex-grow flex flex-col items-center justify-center text-center px-3 sm:px-6 py-12 sm:py-20 scroll-mt-28">
        <div className={`${glass} relative overflow-hidden rounded-[2rem] px-5 py-12 sm:px-12 sm:py-16 max-w-5xl w-full flex flex-col items-center`}>
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-blue-400/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />

          <div className="relative inline-block mb-4 px-3.5 py-1 bg-white/60 backdrop-blur-xl text-blue-800 border border-white/70 rounded-full text-[10px] sm:text-xs font-bold tracking-wide uppercase shadow-sm">
            Kurunegala Water Reclamation Section
          </div>
          <h1 className="relative text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 sm:mb-6 max-w-4xl tracking-tight leading-tight">
            Digitizing Water Quality & <br className="hidden md:block" />
            Inventory Management
          </h1>
          <p className="relative text-base sm:text-lg text-slate-700 mb-8 sm:mb-10 max-w-2xl leading-relaxed font-medium px-2">
            A secure, centralized platform for real-time daily testing, wastewater monitoring, and chemical inventory tracking for the NWSDB Water Reclamation facility.
          </p>
          <Link
            href="/login"
            className="group relative flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-all shadow-xl shadow-blue-500/30 ring-1 ring-inset ring-white/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            Login
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>

      {/* Key Features Section (ID: about) */}
      <section id="about" className="py-12 sm:py-16 scroll-mt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">About</h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 sm:mt-3">Key functionalities of our laboratory management platform.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className={`${glass} p-6 sm:p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/60 hover:shadow-[0_16px_40px_rgba(15,23,42,0.15)]`}>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-sky-400 to-blue-600 text-white rounded-2xl flex items-center justify-center mb-5 sm:mb-6 shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40">
                <Droplets size={24} className="sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">Precision Testing</h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                Real-time parameter validation for pH, MLSS, and COD with automated treatment efficiency calculations.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={`${glass} p-6 sm:p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/60 hover:shadow-[0_16px_40px_rgba(15,23,42,0.15)]`}>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-2xl flex items-center justify-center mb-5 sm:mb-6 shadow-lg shadow-emerald-500/30 ring-1 ring-inset ring-white/40">
                <Package size={24} className="sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">Smart Inventory</h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                Track chemical stocks, manage stock-ins/outs, and receive instant low-balance alerts automatically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={`${glass} p-6 sm:p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/60 hover:shadow-[0_16px_40px_rgba(15,23,42,0.15)]`}>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl flex items-center justify-center mb-5 sm:mb-6 shadow-lg shadow-amber-500/30 ring-1 ring-inset ring-white/40">
                <ShieldCheck size={24} className="sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">Secure & Compliant</h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                Role-based access control, PIN-secured data edits, and comprehensive audit trails for full transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section (Compact) */}
      <section id="contact" className="py-12 sm:py-16 scroll-mt-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8">Contact Us</h2>

          <div className={`${glass} p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-6`}>

            {/* Location */}
            <div className="flex flex-col items-center flex-1 group">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 text-white rounded-full flex items-center justify-center mb-3 shadow-md shadow-blue-500/30 ring-1 ring-inset ring-white/40 transition-transform duration-300 group-hover:scale-110">
                <MapPin size={18} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Location</h4>
              <p className="text-xs text-slate-600 mt-1 text-center">Water Reclamation,<br/>Kurunegala.</p>
            </div>

            {/* Dividers */}
            <div className="hidden sm:block w-px h-16 bg-white/70"></div>
            <div className="block sm:hidden w-16 h-px bg-white/70"></div>

            {/* Phone */}
            <div className="flex flex-col items-center flex-1 group">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 text-white rounded-full flex items-center justify-center mb-3 shadow-md shadow-blue-500/30 ring-1 ring-inset ring-white/40 transition-transform duration-300 group-hover:scale-110">
                <Phone size={18} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Phone</h4>
              <p className="text-xs text-slate-600 mt-1">+94 37 222 2222</p>
            </div>

            {/* Dividers */}
            <div className="hidden sm:block w-px h-16 bg-white/70"></div>
            <div className="block sm:hidden w-16 h-px bg-white/70"></div>

            {/* Email */}
            <div className="flex flex-col items-center flex-1 group">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 text-white rounded-full flex items-center justify-center mb-3 shadow-md shadow-blue-500/30 ring-1 ring-inset ring-white/40 transition-transform duration-300 group-hover:scale-110">
                <Mail size={18} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Email</h4>
              <p className="text-xs text-slate-600 mt-1">info@waterboard.lk</p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer (dark glass) */}
      <footer className="mx-3 sm:mx-6 mb-3 rounded-2xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 ring-1 ring-inset ring-white/10 text-slate-300 py-6 text-center text-xs sm:text-sm font-medium px-4 shadow-[0_8px_32px_rgba(15,23,42,0.25)]">
        <p>© 2026 National Water Supply & Drainage Board - Water Reclamation Section, Kurunegala.</p>
        <p className="mt-1 text-slate-400">All rights reserved.</p>
      </footer>
    </div>
  );
}