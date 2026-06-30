import { create } from "zustand";
import type { DiagramType, Sheet } from "../types";

/**
 * workspaceStore — Zustand store for the WORKSPACE (project) level.
 *
 * Workspace Data Flow (step 2):
 *   Holds project metadata + the list of sheets + which sheet is active.
 *   The persistence layer (store/sheetStore.ts) backs this — loadSheets() seeds
 *   it on init, and every mutation is mirrored to localStorage (auto-save).
 */

interface WorkspaceState {
  /** the project's sheets (multi-sheet CRUD) */
  sheets: Sheet[];
  activeSheetId: string;
  /** the diagram type of the active sheet (drives palette + connectors) */
  diagramType: DiagramType;
  /** which connector is active for the next connection */
  activeEdgeId: string;
  loaded: boolean;

  setSheets: (sheets: Sheet[]) => void;
  setActiveSheetId: (id: string) => void;
  setDiagramType: (type: DiagramType) => void;
  setActiveEdgeId: (id: string) => void;
  setLoaded: (v: boolean) => void;
  /** upsert a single sheet (create or update) */
  upsertSheet: (sheet: Sheet) => void;
  removeSheet: (id: string) => void;
  renameSheet: (id: string, name: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  sheets: [],
  activeSheetId: "",
  diagramType: "activity",
  activeEdgeId: "cf",
  loaded: false,

  setSheets: (sheets) => set({ sheets }),
  setActiveSheetId: (activeSheetId) => set({ activeSheetId }),
  setDiagramType: (diagramType) => set({ diagramType }),
  setActiveEdgeId: (activeEdgeId) => set({ activeEdgeId }),
  setLoaded: (loaded) => set({ loaded }),

  upsertSheet: (sheet) =>
    set((s) => {
      const exists = s.sheets.some((x) => x.id === sheet.id);
      const sheets = exists
        ? s.sheets.map((x) => (x.id === sheet.id ? sheet : x))
        : [...s.sheets, sheet];
      return { sheets };
    }),
  removeSheet: (id) =>
    set((s) => ({ sheets: s.sheets.filter((x) => x.id !== id) })),
  renameSheet: (id, name) =>
    set((s) => ({
      sheets: s.sheets.map((x) => (x.id === id ? { ...x, name } : x)),
    })),
}));
