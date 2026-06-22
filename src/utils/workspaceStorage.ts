import type { Workspace } from '../types/workspace'

const STORAGE_KEY = 'uml_workspaces'

function getAllWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAllWorkspaces(workspaces: Workspace[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces))
}

export function getWorkspace(id: string): Workspace | undefined {
  return getAllWorkspaces().find((w) => w.id === id)
}

export function upsertWorkspace(workspace: Workspace): void {
  const workspaces = getAllWorkspaces()
  const idx = workspaces.findIndex((w) => w.id === workspace.id)
  if (idx >= 0) {
    workspaces[idx] = workspace
  } else {
    workspaces.push(workspace)
  }
  saveAllWorkspaces(workspaces)
}

export function deleteWorkspace(id: string): void {
  const workspaces = getAllWorkspaces().filter((w) => w.id !== id)
  saveAllWorkspaces(workspaces)
}

export function listWorkspaces(): Workspace[] {
  return getAllWorkspaces().filter((w) => w.type === 'user')
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
