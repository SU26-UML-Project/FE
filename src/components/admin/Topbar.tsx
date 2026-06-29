import { Bell, Search } from "lucide-react";
import type { SectionId } from "./data";
import { cn } from "../../utils/cn";

const tabs: { id: SectionId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "Người dùng" },
  { id: "projects", label: "Dự án" },
  { id: "intelligence", label: "AI Engine" },
  { id: "operation", label: "Mẫu Workspace" },
  { id: "subscription", label: "Gói Subscription" },
];

export default function Topbar({ active, onNavigate }: { active: SectionId; onNavigate: (id: SectionId) => void }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 pb-4 pt-1">
      <div className="av2-scroll-slim flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/60 bg-av2-surface p-1 shadow-av2-soft">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onNavigate(t.id)}
            className={cn("whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition", active === t.id ? "bg-white text-av2-ink shadow-sm" : "text-gray-500 hover:text-av2-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-white/60 bg-av2-surface px-4 py-2 shadow-av2-soft">
          <Search className="mr-2 h-4 w-4 text-gray-500" />
          <input placeholder="Tìm kiếm..." className="w-28 bg-transparent text-[13px] text-av2-ink outline-none placeholder:text-gray-400 sm:w-40" />
        </div>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-av2-surface text-gray-500 shadow-av2-soft transition hover:text-av2-ink">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-av2-surface" />
        </button>
        <button className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <div className="text-[13px] font-bold text-av2-ink">Admin</div>
            <div className="text-[11px] text-gray-500">Super Admin</div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-av2-gold text-[13px] font-bold text-white ring-2 ring-white shadow-av2-soft">AD</span>
        </button>
      </div>
    </header>
  );
}
