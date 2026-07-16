import type { WorkspaceFileItem, WorkspaceTreeState } from '../types/workspaceFile'

const key = (projectId: string) => `diauml:workspace-tree:${projectId}`
const now = () => Date.now()
const makeId = () => crypto.randomUUID()

const empty = (): WorkspaceTreeState => ({ items: [], expandedIds: [], activeItemId: null })

function read(projectId: string): WorkspaceTreeState {
  try {
    const value = JSON.parse(localStorage.getItem(key(projectId)) || 'null')
    return value && Array.isArray(value.items) ? value : empty()
  } catch {
    return empty()
  }
}

function write(projectId: string, state: WorkspaceTreeState) {
  localStorage.setItem(key(projectId), JSON.stringify(state))
  return state
}

function descendants(items: WorkspaceFileItem[], id: string): Set<string> {
  const found = new Set<string>([id])
  let changed = true
  while (changed) {
    changed = false
    items.forEach(item => {
      if (item.parentId && found.has(item.parentId) && !found.has(item.id)) {
        found.add(item.id)
        changed = true
      }
    })
  }
  return found
}

export const workspaceFileService = {
  load(projectId: string) {
    return read(projectId)
  },

  saveState(projectId: string, patch: Partial<WorkspaceTreeState>) {
    return write(projectId, { ...read(projectId), ...patch })
  },

  syncDiagrams(projectId: string, sheets: Array<{ id: string; name: string; diagramType: string }>) {
    const state = read(projectId)
    const sheetIds = new Set(sheets.map(sheet => sheet.id))
    const local = state.items.filter(item => item.kind !== 'diagram' || (item.sheetId && sheetIds.has(item.sheetId)))
    const bySheet = new Map(local.filter(item => item.sheetId).map(item => [item.sheetId!, item]))
    const items = [...local]
    sheets.forEach((sheet, index) => {
      const current = bySheet.get(sheet.id)
      if (current) {
        current.name = sheet.name
        current.diagramType = sheet.diagramType
        current.updatedAt = now()
      } else {
        items.push({
          id: `diagram:${sheet.id}`,
          projectId,
          parentId: null,
          name: sheet.name,
          kind: 'diagram',
          sheetId: sheet.id,
          diagramType: sheet.diagramType,
          orderIndex: index,
          createdAt: now(),
          updatedAt: now(),
        })
      }
    })
    return write(projectId, { ...state, items })
  },

  create(projectId: string, input: Pick<WorkspaceFileItem, 'name' | 'kind' | 'parentId'> & Partial<WorkspaceFileItem>) {
    const state = read(projectId)
    const siblings = state.items.filter(item => item.parentId === input.parentId)
    const item: WorkspaceFileItem = {
      id: input.id || makeId(),
      projectId,
      parentId: input.parentId,
      name: input.name.trim(),
      kind: input.kind,
      content: input.content,
      sheetId: input.sheetId,
      diagramType: input.diagramType,
      orderIndex: siblings.length,
      createdAt: now(),
      updatedAt: now(),
    }
    write(projectId, { ...state, items: [...state.items, item], activeItemId: item.id })
    return item
  },

  update(projectId: string, id: string, patch: Partial<WorkspaceFileItem>) {
    const state = read(projectId)
    const items = state.items.map(item => item.id === id ? { ...item, ...patch, updatedAt: now() } : item)
    return write(projectId, { ...state, items })
  },

  move(projectId: string, id: string, parentId: string | null) {
    const state = read(projectId)
    const blocked = descendants(state.items, id)
    if (parentId && blocked.has(parentId)) throw new Error('A folder cannot be moved into itself.')
    return this.update(projectId, id, { parentId })
  },

  remove(projectId: string, id: string) {
    const state = read(projectId)
    const removed = descendants(state.items, id)
    return write(projectId, {
      ...state,
      items: state.items.filter(item => !removed.has(item.id)),
      expandedIds: state.expandedIds.filter(value => !removed.has(value)),
      activeItemId: removed.has(state.activeItemId || '') ? null : state.activeItemId,
    })
  },
}
