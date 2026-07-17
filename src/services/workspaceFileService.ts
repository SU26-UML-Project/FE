import { workspaceItemService } from './workspaceItemService'
import type {
  WorkspaceFileItem,
  WorkspaceFileKind,
  WorkspaceItemKindApi,
  WorkspaceItemResponse,
  WorkspaceTreeState,
} from '../types/workspaceFile'

/**
 * Adapter cho cây file workspace. Items giờ là dữ liệu server (workspace-items API);
 * localStorage chỉ còn giữ UI state (expandedIds/activeItemId) + dữ liệu prototype cũ
 * để one-time import lên backend.
 */

const uiKey = (projectId: string) => `diauml:workspace-tree:${projectId}`
const importedKey = (projectId: string) => `diauml:workspace-tree-imported:${projectId}`

const toApiKind = (kind: WorkspaceFileKind): WorkspaceItemKindApi =>
  kind.toUpperCase() as WorkspaceItemKindApi

function fromResponse(item: WorkspaceItemResponse): WorkspaceFileItem {
  return {
    id: item.id,
    projectId: item.projectId,
    parentId: item.parentId ?? null,
    name: item.name,
    kind: item.kind.toLowerCase() as WorkspaceFileKind,
    orderIndex: item.orderIndex,
    content: item.content,
    sheetId: item.sheetId,
    diagramType: item.diagramType,
    version: item.version,
    createdAt: new Date(item.createdAt).getTime(),
    updatedAt: new Date(item.updatedAt).getTime(),
  }
}

interface StoredUiState {
  items?: WorkspaceFileItem[]
  expandedIds?: string[]
  activeItemId?: string | null
}

function readStored(projectId: string): StoredUiState {
  try {
    return JSON.parse(localStorage.getItem(uiKey(projectId)) || 'null') || {}
  } catch {
    return {}
  }
}

function writeUiState(projectId: string, expandedIds: string[], activeItemId: string | null) {
  localStorage.setItem(uiKey(projectId), JSON.stringify({ expandedIds, activeItemId }))
}

/**
 * One-time import: đẩy folder/markdown của prototype localStorage lên backend và
 * di chuyển các diagram item (match theo sheetId) vào đúng folder cũ.
 * Best-effort: item lỗi (vd trùng tên) bị bỏ qua, không chặn việc load cây.
 */
async function importLocalPrototype(projectId: string, serverItems: WorkspaceFileItem[]): Promise<boolean> {
  const legacyItems = readStored(projectId).items
  if (!Array.isArray(legacyItems) || !legacyItems.length) return false

  const hasStructure = legacyItems.some(item => item.kind !== 'diagram' || item.parentId)
  if (!hasStructure) return false

  const byParent = new Map<string | null, WorkspaceFileItem[]>()
  legacyItems.forEach(item => {
    const list = byParent.get(item.parentId) || []
    list.push(item)
    byParent.set(item.parentId, list)
  })
  const serverBySheet = new Map(serverItems.filter(item => item.sheetId).map(item => [item.sheetId!, item]))
  let migrated = false

  const walk = async (localParentId: string | null, serverParentId: string | null) => {
    const children = (byParent.get(localParentId) || []).sort((a, b) => a.orderIndex - b.orderIndex)
    for (const item of children) {
      if (item.kind === 'folder') {
        try {
          const created = await workspaceItemService.create(projectId, {
            name: item.name, kind: 'FOLDER', parentId: serverParentId,
          })
          migrated = true
          await walk(item.id, created.result.id)
        } catch {
          // Folder tạo lỗi (thường do trùng tên): con của nó rơi về folder cha hiện tại
          await walk(item.id, serverParentId)
        }
      } else if (item.kind === 'markdown') {
        try {
          await workspaceItemService.create(projectId, {
            name: item.name, kind: 'MARKDOWN', parentId: serverParentId, content: item.content || '',
          })
          migrated = true
        } catch { /* bỏ qua item lỗi */ }
      } else if (item.sheetId && serverParentId) {
        const server = serverBySheet.get(item.sheetId)
        if (server && server.parentId !== serverParentId) {
          try {
            await workspaceItemService.move(server.id, { parentId: serverParentId })
            migrated = true
          } catch { /* bỏ qua item lỗi */ }
        }
      }
    }
  }

  await walk(null, null)
  return migrated
}

export const workspaceFileService = {
  /** Tải cây từ server (kèm one-time import prototype) và merge UI state local. */
  async fetchTree(projectId: string): Promise<WorkspaceTreeState> {
    let response = await workspaceItemService.list(projectId)
    let items = (response.result || []).map(fromResponse)

    if (!localStorage.getItem(importedKey(projectId))) {
      const migrated = await importLocalPrototype(projectId, items)
      localStorage.setItem(importedKey(projectId), '1')
      if (migrated) {
        response = await workspaceItemService.list(projectId)
        items = (response.result || []).map(fromResponse)
      }
    }

    const stored = readStored(projectId)
    const validIds = new Set(items.map(item => item.id))
    const expandedIds = (stored.expandedIds || []).filter(value => validIds.has(value))
    const activeItemId = stored.activeItemId && validIds.has(stored.activeItemId) ? stored.activeItemId : null
    writeUiState(projectId, expandedIds, activeItemId)
    return { items, expandedIds, activeItemId }
  },

  /** Chỉ persist UI state (expandedIds/activeItemId) — items là dữ liệu server. */
  saveState(projectId: string, patch: Partial<Pick<WorkspaceTreeState, 'expandedIds' | 'activeItemId'>>) {
    const stored = readStored(projectId)
    writeUiState(
      projectId,
      patch.expandedIds ?? stored.expandedIds ?? [],
      patch.activeItemId !== undefined ? patch.activeItemId : stored.activeItemId ?? null,
    )
  },

  /** Tạo folder / markdown / diagram (diagram: backend tạo sheet + item atomic). */
  async create(
    projectId: string,
    input: Pick<WorkspaceFileItem, 'name' | 'kind' | 'parentId'> & { content?: string; diagramType?: string; diagramData?: string },
  ): Promise<WorkspaceFileItem> {
    const response = await workspaceItemService.create(projectId, {
      parentId: input.parentId,
      name: input.name.trim(),
      kind: toApiKind(input.kind),
      content: input.kind === 'markdown' ? input.content ?? '' : undefined,
      diagramType: input.kind === 'diagram' ? input.diagramType : undefined,
      diagramData: input.kind === 'diagram' ? input.diagramData : undefined,
    })
    return fromResponse(response.result)
  },

  /** Đổi tên / cập nhật nội dung markdown. Backend tự sync tên sheet cho diagram. */
  async update(_projectId: string, id: string, patch: { name?: string; content?: string; expectedVersion?: number }): Promise<WorkspaceFileItem> {
    const response = await workspaceItemService.update(id, patch)
    return fromResponse(response.result)
  },

  /** Di chuyển item sang folder khác (null = gốc). Cycle do server chặn (WORKSPACE_TREE_CYCLE). */
  async move(_projectId: string, id: string, parentId: string | null): Promise<WorkspaceFileItem> {
    const response = await workspaceItemService.move(id, { parentId })
    return fromResponse(response.result)
  },

  /** Nhân bản item (folder đệ quy, diagram tạo sheet mới) — atomic phía server. */
  async duplicate(_projectId: string, id: string, parentId: string | null): Promise<WorkspaceFileItem> {
    const response = await workspaceItemService.duplicate(id, { parentId })
    return fromResponse(response.result)
  },

  /** Xóa 1..n item; server xóa đệ quy subtree + sheet liên kết trong 1 transaction. */
  async remove(_projectId: string, ids: string[], recursive = true): Promise<void> {
    await workspaceItemService.remove(ids, recursive)
  },
}
