"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  Zap,
  Bell,
  Search,
  Menu,
  Loader2,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { signout } from "../../(auth)/action";
import GlobalSearch from "../../components/GlobalSearch";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userInitials, setUserInitials] = useState("··");
  const pathname = usePathname();
  const router = useRouter();

  // 1.2 Fix: use getUser() (server-verified JWT) not getSession() (cookie only)
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // 1.3 Fix: derive real initials from user metadata
      const name: string =
        user.user_metadata?.full_name ||
        user.email ||
        "";
      const parts = name.trim().split(/\s+/);
      const initials =
        parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase();
      setUserInitials(initials || "??");
    };

    checkAuth();
  }, [router]);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Projects",  href: "/dashboard/projects", icon: <FolderKanban size={20} /> },
    { name: "Team",      href: "/dashboard/team", icon: <Users size={20} /> },
    { name: "Settings",  href: "/dashboard/settings", icon: <Settings size={20} /> },
  ];

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signout();
  };

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-slate-100 text-[var(--color-accent)]"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {item.icon}
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-20">
        <div className="p-6 flex items-center gap-2 border-b border-slate-100">
          <div className="w-8 h-8 bg-[var(--color-accent)] rounded-lg flex items-center justify-center text-white">
            <Zap size={18} fill="currentColor" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            APO<span className="text-[var(--color-accent)]">.</span>
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
          >
            {isSigningOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
            {isSigningOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </aside>

      {/* ── Mobile Drawer ───────────────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer panel */}
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[var(--color-accent)] rounded-lg flex items-center justify-center text-white">
                  <Zap size={18} fill="currentColor" />
                </div>
                <span className="text-xl font-bold tracking-tight">
                  APO<span className="text-[var(--color-accent)]">.</span>
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              <NavLinks />
            </nav>

            <div className="p-4 border-t border-slate-100">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
              >
                {isSigningOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
                {isSigningOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">

          {/* Hamburger (mobile) */}
          <button
            className="md:hidden text-slate-500 hover:text-slate-900 transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>

          {/* Search (desktop) */}
          <GlobalSearch />

          {/* Right actions */}
          <div className="flex items-center gap-4">
            {/* Bell — decorative for now, no fake red dot */}
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
              <Bell size={20} />
            </button>

            {/* Real user initials avatar */}
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs select-none">
              {userInitials}
            </div>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
