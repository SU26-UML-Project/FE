import { LogOut, Settings2 } from "lucide-react";
import { navSections, type SectionId } from "@/data/mock";
import { cn } from "@/utils/cn";

type NavItem = { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> };

const allItems: NavItem[] = navSections.flatMap((s) => s.items);

export default function Sidebar({
  active,
  onNavigate,
}: {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
}) {
  return (
    <aside className="flex w-[58px] shrink-0 flex-col items-center rounded-3xl border border-white/60 bg-surface py-5 shadow-soft sm:w-[68px]">
      {/* Logo */}
      <div className="mb-7 flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-[18px] font-bold text-white">
        U
      </div>

      {/* Nav icons */}
      <nav className="flex flex-1 flex-col items-center gap-2.5">
        {allItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "group relative flex h-10 w-10 items-center justify-center rounded-full transition",
                isActive
                  ? "bg-gold text-white shadow-soft"
                  : "text-gray-400 hover:bg-white/60 hover:text-ink"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-2 flex flex-col items-center gap-2.5">
        <div className="h-px w-7 bg-black/10" />
        <button className="group relative flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/60 hover:text-ink">
          <Settings2 className="h-[18px] w-[18px]" />
          <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
            Cài đặt
          </span>
        </button>
        <button className="group relative flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition hover:bg-rose-50 hover:text-rose-600">
          <LogOut className="h-[17px] w-[17px]" />
          <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
            Đăng xuất
          </span>
        </button>
      </div>
    </aside>
  );
}
