import apiClient from './apiClient'
import type { ApiResponse } from '../types/api'
import type {
  DiagramDiff,
  DiagramSnapshot,
  DiagramVersion,
  DiagramVersionCreateRequest,
  DiagramVersionResponse,
  DiagramVersionSource,
} from '../types/diagramVersion'

/**
 * Version history giờ lưu trên backend (/sheets/{sheetId}/versions).
 * diff() vẫn là hàm thuần chạy client-side — server chỉ lưu/truy xuất snapshot.
 */

const stable = (value: unknown) => JSON.stringify(value, Object.keys((value || {}) as object).sort())

function parseSnapshot(diagramData?: string): DiagramSnapshot | undefined {
  if (!diagramData) return undefined
  try {
    const parsed = JSON.parse(diagramData)
    return {
      schemaVersion: 1,
      diagramType: parsed.diagramType || 'activity',
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      viewport: parsed.viewport,
    }
  } catch {
    return undefined
  }
}

function fromResponse(item: DiagramVersionResponse): DiagramVersion {
  return {
    id: item.id,
    sheetId: item.sheetId,
    versionNumber: item.versionNumber,
    name: item.name,
    note: item.note,
    source: item.source,
    snapshot: parseSnapshot(item.diagramData),
    contentHash: item.contentHash,
    createdAt: new Date(item.createdAt).getTime(),
    restoredFromVersionId: item.restoredFromVersionId,
  }
}

function changedFields(before: Record<string, unknown>, after: Record<string, unknown>, includePosition: boolean) {
  const ignored = new Set(['selected', 'dragging', 'measured', ...(includePosition ? [] : ['position'])])
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(field => !ignored.has(field) && stable(before[field]) !== stable(after[field]))
}

export const diagramVersionService = {
  /** Danh sách version (mới nhất trước), KHÔNG kèm snapshot — gọi get() khi cần nội dung. */
  async list(sheetId: string): Promise<DiagramVersion[]> {
    const response = await apiClient.get<any, ApiResponse<DiagramVersionResponse[]>>(`/sheets/${sheetId}/versions`)
    return (response.result || []).map(fromResponse)
  },

  /** Chi tiết một version kèm snapshot đầy đủ. */
  async get(sheetId: string, versionId: string): Promise<DiagramVersion> {
    const response = await apiClient.get<any, ApiResponse<DiagramVersionResponse>>(`/sheets/${sheetId}/versions/${versionId}`)
    return fromResponse(response.result)
  },

  /**
   * Tạo checkpoint. Không force: nội dung trùng hash → server trả version đã có (không thêm bản ghi).
   * AUTO được server giới hạn số lượng mỗi sheet.
   */
  async create(sheetId: string, snapshot: DiagramSnapshot, options?: { name?: string; note?: string; source?: DiagramVersionSource; force?: boolean }): Promise<DiagramVersion> {
    const body: DiagramVersionCreateRequest = {
      name: options?.name?.trim() || undefined,
      note: options?.note?.trim() || undefined,
      source: options?.source || 'AUTO',
      diagramData: JSON.stringify(snapshot),
      force: options?.force,
    }
    const response = await apiClient.post<any, ApiResponse<DiagramVersionResponse>>(`/sheets/${sheetId}/versions`, body)
    return fromResponse(response.result)
  },

  /**
   * Restore phía server (1 transaction: backup BEFORE_RESTORE → ghi sheet → bản ghi RESTORE).
   * Trả về bản ghi RESTORE kèm snapshot để áp lên canvas.
   */
  async restore(sheetId: string, versionId: string): Promise<DiagramVersion> {
    const response = await apiClient.post<any, ApiResponse<DiagramVersionResponse>>(`/sheets/${sheetId}/versions/${versionId}/restore`)
    return fromResponse(response.result)
  },

  diff(before: DiagramSnapshot, after: DiagramSnapshot, includePosition = false): DiagramDiff {
    const beforeNodes = new Map(before.nodes.map(item => [item.id, item])); const afterNodes = new Map(after.nodes.map(item => [item.id, item]))
    const beforeEdges = new Map(before.edges.map(item => [item.id, item])); const afterEdges = new Map(after.edges.map(item => [item.id, item]))
    const changedNodes: DiagramDiff['changedNodes'] = []; const changedEdges: DiagramDiff['changedEdges'] = []
    beforeNodes.forEach((item, id) => { const next = afterNodes.get(id); if (next) { const fields = changedFields(item as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>, includePosition); if (fields.length) changedNodes.push({ before: item, after: next, fields }) } })
    beforeEdges.forEach((item, id) => { const next = afterEdges.get(id); if (next) { const fields = changedFields(item as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>, includePosition); if (fields.length) changedEdges.push({ before: item, after: next, fields }) } })
    return {
      addedNodes: after.nodes.filter(item => !beforeNodes.has(item.id)), removedNodes: before.nodes.filter(item => !afterNodes.has(item.id)), changedNodes,
      addedEdges: after.edges.filter(item => !beforeEdges.has(item.id)), removedEdges: before.edges.filter(item => !afterEdges.has(item.id)), changedEdges,
    }
  },
}
