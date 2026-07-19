import { Menu, Search } from "lucide-react";
import type { User } from "../../types/auth";

export default function Topbar({
  title,
  subtitle,
  onOpenSidebar,
  user,
}: {
  title: string;
  subtitle: string;
  onOpenSidebar: () => void;
  user: User | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-slate-900 sm:text-[19px]">
            {subtitle}
          </h1>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-400">
            <span>Trang quản trị</span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-500">{title}</span>
          </div>
        </div>

        <div className="ml-auto hidden flex-1 justify-center md:flex">
          <label className="relative flex w-full max-w-sm items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input
              placeholder="Tìm người dùng, dự án, workspace…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-16 text-[13px] text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
            <kbd className="absolute right-2.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              ⌘K
            </kbd>
          </label>
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <span className="hidden text-[13px] font-medium text-slate-600 md:inline">{user?.fullName ?? user?.username ?? "Admin"}</span>
        </div>
      </div>
    </header>
  );
}
