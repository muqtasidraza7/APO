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
  Sparkles,
  Bell,
  Menu,
  Loader2,
  X,
  Upload,
  Camera,
  MessageSquare,
  Brain,
  ChevronRight,
  CheckCheck,
  Inbox,
  Briefcase,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [notifs, setNotifs] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const name: string = user.user_metadata?.full_name || user.email || "";
      const parts = name.trim().split(/\s+/);
      const initials =
        parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase();
      setUserInitials(initials || "??");
      setUserName(user.user_metadata?.full_name || "");
      setUserEmail(user.email || "");
      setCurrentUserId(user.id);

      fetch("/api/me/role")
        .then((r) => r.ok ? r.json() : { role: "" })
        .then((d) => setUserRole(d.role || ""))
        .catch(() => {});

      if (user.user_metadata?.avatar_url) {
        setAvatarUrl(user.user_metadata.avatar_url);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    fetch("/api/notifications")
      .then((r) => r.ok ? r.json() : { notifications: [] })
      .then((d) => {
        const list = d.notifications || [];
        setNotifs(list);
        setNotifCount(list.filter((n: any) => !n.is_read).length);
      })
      .catch(() => {});

    const supabase = createClient();
    const channel = supabase
      .channel(`notifs-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          setNotifs((prev) => [payload.new as any, ...prev]);
          setNotifCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  function fmtTimeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setNotifCount(0);
  };

  const markRead = async (id: string) => {
    const notif = notifs.find((n) => n.id === id);
    if (notif?.is_read) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setNotifCount((prev) => Math.max(0, prev - 1));
  };

  const isMember = userRole === "member";

  const navItems = isMember
    ? [
        { name: "Dashboard",  href: "/dashboard",           icon: <LayoutDashboard size={18} /> },
        { name: "Projects",   href: "/dashboard/projects",  icon: <FolderKanban size={18} />   },
        { name: "My Work",    href: "/dashboard/my-work",   icon: <Briefcase size={18} />      },
        { name: "Messages",   href: "/dashboard/messages",  icon: <MessageSquare size={18} />  },
        { name: "Settings",   href: "/dashboard/settings",  icon: <Settings size={18} />       },
      ]
    : [
        { name: "Dashboard",   href: "/dashboard",           icon: <LayoutDashboard size={18} /> },
        { name: "Projects",    href: "/dashboard/projects",  icon: <FolderKanban size={18} />   },
        { name: "Messages",    href: "/dashboard/messages",  icon: <MessageSquare size={18} />  },
        { name: "Team",        href: "/dashboard/team",      icon: <Users size={18} />          },
        { name: "AI Insights", href: "/dashboard/insights",  icon: <Brain size={18} />          },
        { name: "Settings",    href: "/dashboard/settings",  icon: <Settings size={18} />       },
      ];

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signout();
  };

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const maxSize = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(async (blob) => {
            if (!blob) return;

            const filePath = `${user.id}/${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
              .from("avatars")
              .upload(filePath, blob, {
                contentType: "image/jpeg",
                upsert: true,
              });

            if (uploadError) {
              console.error("Upload error:", uploadError);
              if (uploadError.message.includes("bucket not found")) {
                alert(
                  "Storage bucket 'avatars' not found. Please run the provided SQL script."
                );
              }
              setIsUploading(false);
              return;
            }

            const {
              data: { publicUrl },
            } = supabase.storage.from("avatars").getPublicUrl(filePath);

            await supabase.auth.updateUser({
              data: { avatar_url: publicUrl },
            });

            setAvatarUrl(publicUrl);
            setIsUploading(false);
            setIsDropdownOpen(false);
          }, "image/jpeg", 0.8);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Avatar upload failed", error);
      setIsUploading(false);
    }
  };

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <div className="space-y-0.5">
      {navItems.map((item) => {
        // Dashboard root must match exactly — otherwise /dashboard/projects
        // would also highlight it. All other items use prefix matching.
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onClose}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${
              isActive
                ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                : "text-slate-300 hover:bg-white/8 hover:text-white"
            }`}
          >
            {/* Active left bar */}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-300 rounded-r-full" />
            )}
            <span
              className={`flex-shrink-0 transition-colors ${
                isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
              }`}
            >
              {item.icon}
            </span>
            <span className="flex-1">{item.name}</span>
            {isActive && (
              <ChevronRight size={14} className="text-violet-300 opacity-70" />
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F2F8] flex font-sans text-slate-900">

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0F172A] fixed h-full z-20 border-r border-white/5">

        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/8">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-900/50 flex-shrink-0">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight leading-none">
              APO<span className="text-violet-400">.</span>
            </span>
            <p className="text-slate-500 text-[10px] font-medium tracking-wider uppercase mt-0.5">
              Project Officer
            </p>
          </div>
        </div>

        {/* Nav label */}
        <div className="px-5 pt-6 pb-2">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
            Navigation
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 pb-4 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* User profile footer */}
        <div className="p-3 border-t border-white/8">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                userInitials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate leading-tight">
                {userName || "My Account"}
              </p>
              <p className="text-slate-500 text-[10px] truncate">{userEmail}</p>
              {userRole && (
                <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${
                  userRole === "owner" ? "bg-violet-900/60 text-violet-300" :
                  userRole === "pm"    ? "bg-indigo-900/60 text-indigo-300" :
                  "bg-slate-700/60 text-slate-400"
                }`}>
                  {userRole === "owner" ? "Owner" : userRole === "pm" ? "Project Manager" : "Team Member"}
                </span>
              )}
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50"
              title="Sign out"
            >
              {isSigningOut ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <LogOut size={14} />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Drawer ───────────────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-[#0F172A] shadow-2xl flex flex-col border-r border-white/5">
            <div className="px-5 py-5 flex items-center justify-between border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-900/50">
                  <Sparkles size={15} className="text-white" />
                </div>
                <span className="text-white font-bold text-lg tracking-tight">
                  APO<span className="text-violet-400">.</span>
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <NavLinks onClose={() => setIsMobileMenuOpen(false)} />
            </nav>

            <div className="p-3 border-t border-white/8">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-all disabled:opacity-50"
              >
                {isSigningOut ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <LogOut size={18} />
                )}
                {isSigningOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">

        {/* Top header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">

          {/* Hamburger (mobile) */}
          <button
            className="md:hidden text-slate-500 hover:text-slate-900 transition-colors p-1"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={22} />
          </button>

          {/* Search */}
          <GlobalSearch />

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Role pill */}
            {userRole && (
              <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                userRole === "owner"  ? "bg-violet-50 text-violet-700 border-violet-200" :
                userRole === "pm"     ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                        "bg-slate-50  text-slate-600  border-slate-200"
              }`}>
                {userRole === "owner" ? <Crown size={11} /> : userRole === "pm" ? <ShieldCheck size={11} /> : <Briefcase size={11} />}
                {userRole === "owner" ? "Owner" : userRole === "pm" ? "Project Manager" : "Team Member"}
              </span>
            )}
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen((o) => !o)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all relative"
              >
                <Bell size={18} />
                {notifCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-0.5">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/80 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Bell size={14} className="text-slate-500" />
                      <span className="font-bold text-slate-900 text-sm">Notifications</span>
                      {notifCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">{notifCount}</span>
                      )}
                    </div>
                    {notifCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                      >
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {notifs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <Inbox size={28} className="mb-2 opacity-30" />
                        <p className="text-sm font-medium">All caught up</p>
                        <p className="text-xs mt-0.5">No notifications yet</p>
                      </div>
                    ) : (
                      notifs.slice(0, 20).map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${!n.is_read ? "bg-indigo-50/60" : ""}`}
                          onClick={() => {
                            markRead(n.id);
                            if (n.link) router.push(n.link);
                            setIsNotifOpen(false);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? "bg-indigo-500" : "bg-slate-200"}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold leading-tight ${!n.is_read ? "text-slate-900" : "text-slate-600"}`}>{n.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{fmtTimeAgo(n.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs select-none hover:opacity-90 transition-all overflow-hidden shadow-md shadow-violet-200"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userInitials
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 size={14} className="animate-spin text-violet-600" />
                  </div>
                )}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/80 overflow-hidden py-2 z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          userInitials
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {userName || "My Account"}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {userEmail}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/dashboard/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors"
                  >
                    <Settings size={15} />
                    Profile &amp; Settings
                  </Link>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors text-left"
                  >
                    <Camera size={15} />
                    Upload Picture
                  </button>
                  <input
                    type="file"
                    accept="image/jpeg, image/png, image/webp"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                  />

                  <div className="h-px bg-slate-100 my-1" />

                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors text-left disabled:opacity-50"
                  >
                    {isSigningOut ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <LogOut size={15} />
                    )}
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
