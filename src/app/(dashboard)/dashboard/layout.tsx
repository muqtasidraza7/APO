"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "../../utils/supabase/client"; // Use Client version
import { useRouter } from "next/navigation";
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
  Loader2, // Import Loader
} from "lucide-react";
import { useState, useEffect } from "react";
// Import the server action (Ensure this path matches where you created the action)
import { signout } from "../../(auth)/action";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Track auth state
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
      } else {
        setIsAuthenticated(true);
      }
    };

    checkAuth();
  }, [router]);

  // Prevent "Flashed Content" - Don't show anything until we confirm auth
  if (!isAuthenticated) {
    return null; // Or return a Loading Spinner <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>
  }

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: "Projects",
      href: "/dashboard/projects",
      icon: <FolderKanban size={20} />,
    },
    { name: "Team", href: "/dashboard/team", icon: <Users size={20} /> },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: <Settings size={20} />,
    },
  ];

  // Handler for Sign Out
  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signout(); // Call the server action to clear session
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* 1. SIDEBAR (Desktop) */}
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
          {navItems.map((item) => {
            // Check if active (handles sub-routes too)
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
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
        </nav>

        {/* SIGN OUT BUTTON (Updated) */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
          >
            {isSigningOut ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <LogOut size={20} />
            )}
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          {/* Mobile Menu Trigger */}
          <button
            className="md:hidden text-slate-500"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu size={24} />
          </button>

          {/* Search Bar */}
          <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-96">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search projects, documents, or people..."
              className="bg-transparent border-none outline-none text-sm ml-2 w-full text-slate-600 placeholder:text-slate-400"
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
              JD
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
