import { useEffect, useRef } from "react";

export interface CtxItem {
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: CtxItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = () => onClose();
    const onScroll = () => onClose();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const W = 212;
  const H = items.length * 36 + 16;
  const px = Math.min(x, window.innerWidth - W - 8);
  const py = Math.min(y, window.innerHeight - H - 8);

  return (
    <div
      ref={ref}
      className="animate-pop fixed z-50 min-w-[200px] overflow-hidden rounded-xl border border-admin-outline/30 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.16)]"
      style={{ left: px, top: py }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="my-1 h-px bg-admin-outline/10" />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-bold transition-colors disabled:opacity-35 ${
              item.danger
                ? "text-red-600 hover:bg-red-50"
                : "text-admin-secondary hover:bg-admin-bg hover:text-admin-primary"
            }`}
          >
            {item.icon && (
              <span className="flex h-4 w-4 items-center justify-center text-admin-secondary/40 group-hover:text-admin-primary">
                {item.icon}
              </span>
            )}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="font-mono text-[10.5px] font-medium text-admin-secondary/30">
                {item.shortcut}
              </span>
            )}
          </button>
        )
      )}
    </div>
  );
}

function I({ children }: { children: React.ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export const CtxIcons = {
  edit: (
    <I>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </I>
  ),
  duplicate: (
    <I>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </I>
  ),
  front: (
    <I>
      <rect x="8" y="3" width="13" height="13" rx="2" />
      <path d="M16 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h3" />
    </I>
  ),
  back: (
    <I>
      <rect x="3" y="8" width="13" height="13" rx="2" />
      <path d="M8 8V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3" />
    </I>
  ),
  delete: (
    <I>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M6.5 7l1 13h9l1-13" />
    </I>
  ),
  copy: (
    <I>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </I>
  ),
  paste: (
    <I>
      <path d="M9 3h6v3H9z" />
      <path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" />
    </I>
  ),
  selectAll: (
    <I>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    </I>
  ),
};
