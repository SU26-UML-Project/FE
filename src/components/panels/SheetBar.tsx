import { useEffect, useRef, useState } from "react";
import type { Sheet } from "../../types";

/**
 * A slim browser-like tab bar for managing diagrams (sheets): switch, rename
 * (double-click), delete, and create new. Full CRUD affordance in one row.
 */
export function SheetBar({
  sheets,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  sheets: Sheet[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  const beginRename = (s: Sheet) => {
    setEditingId(s.id);
    setDraft(s.name);
  };
  const commit = () => {
    if (editingId) {
      const name = draft.trim();
      if (name) onRename(editingId, name);
    }
    setEditingId(null);
  };

  return (
    <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-t border-admin-outline/30 bg-admin-bg/30 px-2 scroll-thin">
      {sheets.map((s) => {
        const active = s.id === activeId;
        const editing = editingId === s.id;
        return (
          <div
            key={s.id}
            onClick={() => !editing && onSelect(s.id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              beginRename(s);
            }}
            className={`group flex h-7 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-[12.5px] transition-colors ${
              active
                ? "border-admin-primary/20 bg-white text-admin-primary shadow-[0_1px_2px_rgba(0,74,198,0.04)]"
                : "border-transparent text-admin-secondary/60 hover:bg-white/70 hover:text-admin-on-surface"
            }`}
            title={s.name}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-admin-primary" : "bg-admin-outline/50"}`} />
            {editing ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="w-32 rounded border border-admin-primary/20 bg-white px-1 py-0 text-[12.5px] text-admin-on-surface font-bold outline-none focus:border-admin-primary"
              />
            ) : (
              <span className={`max-w-[160px] truncate ${active ? "font-bold" : "font-medium"}`}>{s.name}</span>
            )}
            {!editing && sheets.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
                title="Delete sheet"
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-admin-secondary/40 opacity-0 transition-all hover:bg-admin-bg hover:text-admin-error group-hover:opacity-100"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={onCreate}
        title="New sheet"
        className="ml-1 flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[12px] font-bold text-admin-secondary transition-colors hover:bg-white hover:text-admin-primary"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New
      </button>
    </div>
  );
}
