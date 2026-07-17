import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, LogOut, Settings2, Sparkles, X } from "lucide-react";
import { navSections, type SectionId } from "./data";
import { cn } from "../../utils/cn";
import type { User } from "../../types/auth";
import LogoutConfirmModal from "../ui/LogoutConfirmModal";

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
}

function roleLabel(role: User["role"]) {
  if (typeof role === "string") return role;
  return role.roleName === "ADMIN" ? "Admin" : "User";
}

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="13" width="7" height="8" rx="1.5" />
          <path d="M6.5 10v4M6.5 14H14M10 6.5h4" strokeLinecap="round" />
        </svg>
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <p className="text-[14px] font-semibold tracking-tight text-slate-900">DiaUML Studio</p>
          <p className="text-[11px] text-slate-400">Trang quản trị</p>
        </div>
      )}
    </Link>
  );
}

function NavButton({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: { id: SectionId; label: string; sub: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex rounded-lg text-left transition",
        collapsed
          ? "mx-auto h-9 w-9 items-center justify-center"
          : "w-full items-center gap-2.5 px-2.5 py-2",
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium">{item.label}</span>
        </span>
      )}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[12px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
          {item.label}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({
  active,
  onNavigate,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
  user,
}: {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  user: User | null;
}) {
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "scroll-slim fixed inset-y-0 left-0 z-50 flex w-[256px] flex-col border-r border-slate-200 bg-white transition-all duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-[72px]"
        )}
      >
        {/* header + collapse toggle */}
        <div className={cn("flex items-center pb-4 pt-5", collapsed ? "flex-col gap-2 px-3" : "justify-between px-4")}>
          <Logo collapsed={collapsed} />
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* desktop collapse toggle — circular button on right edge */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          className="absolute -right-3 top-8 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:shadow-md lg:flex"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-slate-500" /> : <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />}
        </button>

        <nav className={cn("flex-1 px-3 pb-4", collapsed ? "space-y-3 overflow-visible" : "space-y-5 overflow-y-auto")}>
          {navSections.map((section) => (
            <div key={section.id}>
              {!collapsed && (
                <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.hint}
                </p>
              )}
              <div className={cn(collapsed ? "space-y-0.5 border-t border-slate-100 pt-2 first:border-0 first:pt-0" : "space-y-0.5")}>
                {section.items.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    active={active === item.id}
                    collapsed={collapsed}
                    onClick={() => onNavigate(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* AI engine status */}
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={() => onNavigate("intelligence")}
            title={collapsed ? "AI Engine · Trực tuyến" : undefined}
            className={cn(
              "group relative transition",
              collapsed
                ? "mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
                : cn("w-full rounded-lg border p-3 text-left hover:border-slate-300 hover:bg-slate-50", active === "intelligence" ? "border-slate-300 bg-slate-50" : "border-slate-200")
            )}
          >
            {collapsed ? (
              <>
                <span className="relative">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                </span>
                <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[12px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                  AI Engine · Trực tuyến
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-800">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> AI Engine
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-soft-pulse" /> Trực tuyến
                  </span>
                </div>
                <p className="mt-1.5 truncate font-mono text-[10.5px] text-slate-400">localhost:3001/api</p>
              </>
            )}
          </button>
        </div>

        {/* Back to home */}
        <div className="border-t border-slate-200 px-3 py-2">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-2 rounded-lg text-[13px] font-medium transition",
              collapsed
                ? "justify-center p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                : "px-2.5 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            {!collapsed && <span>Về trang chủ</span>}
          </Link>
        </div>

        {/* User */}
        <div className="border-t border-slate-200 p-3">
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5")}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[12px] font-semibold text-white">
                {getInitials(user?.fullName)}
              </span>
            )}
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[13px] font-medium text-slate-900">{user?.fullName ?? user?.username ?? "Admin"}</p>
                  <p className="truncate text-[11px] text-slate-400">{user ? roleLabel(user.role) : "—"}</p>
                </div>
                <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <Settings2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setLogoutModalOpen(true)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-[15px] w-[15px]" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
      <LogoutConfirmModal open={logoutModalOpen} onClose={() => setLogoutModalOpen(false)} />
    </>
  );
}
