import { create } from 'zustand'
import type { Workspace, WorkspaceSheet } from '../types/workspace'

interface WorkspaceState {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  activeSheetId: string | null
  isLoading: boolean

  setWorkspaces: (workspaces: Workspace[]) => void
  setCurrentWorkspace: (workspace: Workspace | null) => void
  setActiveSheetId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  updateSheet: (sheetId: string, updates: Partial<WorkspaceSheet>) => void
  addSheet: (sheet: WorkspaceSheet) => void
  deleteSheet: (sheetId: string) => void
  updateWorkspace: (updates: Partial<Workspace>) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  activeSheetId: null,
  isLoading: false,

  setWorkspaces: (workspaces) => set({ workspaces }),

  setCurrentWorkspace: (workspace) => set({
    currentWorkspace: workspace,
    activeSheetId: workspace?.sheets[0]?.id ?? null,
  }),

  setActiveSheetId: (id) => set({ activeSheetId: id }),

  setLoading: (loading) => set({ isLoading: loading }),

  updateSheet: (sheetId, updates) => {
    const current = get().currentWorkspace
    if (!current) return
    const sheets = current.sheets.map((s) =>
      s.id === sheetId ? { ...s, ...updates } : s
    )
    set({ currentWorkspace: { ...current, sheets } })
  },

  addSheet: (sheet) => {
    const current = get().currentWorkspace
    if (!current) return
    set({
      currentWorkspace: { ...current, sheets: [...current.sheets, sheet] },
      activeSheetId: sheet.id,
    })
  },

  deleteSheet: (sheetId) => {
    const current = get().currentWorkspace
    if (!current) return
    const sheets = current.sheets.filter((s) => s.id !== sheetId)
    const activeSheetId = get().activeSheetId === sheetId
      ? sheets[0]?.id ?? null
      : get().activeSheetId
    set({ currentWorkspace: { ...current, sheets }, activeSheetId })
  },

  updateWorkspace: (updates) => {
    const current = get().currentWorkspace
    if (!current) return
    set({ currentWorkspace: { ...current, ...updates } })
  },
}))
