import type { DiagramDiff, DiagramSnapshot, DiagramVersion, DiagramVersionSource } from '../types/diagramVersion'

const key = (sheetId: string) => `diauml:diagram-versions:${sheetId}`
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const stable = (value: unknown) => JSON.stringify(value, Object.keys((value || {}) as object).sort())

function normalized(snapshot: DiagramSnapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    diagramType: snapshot.diagramType,
    nodes: snapshot.nodes.map(node => ({ ...node, selected: undefined, dragging: undefined })).sort((a, b) => a.id.localeCompare(b.id)),
    edges: snapshot.edges.map(edge => ({ ...edge, selected: undefined })).sort((a, b) => a.id.localeCompare(b.id)),
  }
}

function hash(snapshot: DiagramSnapshot) {
  const input = JSON.stringify(normalized(snapshot))
  let value = 2166136261
  for (let index = 0; index < input.length; index++) value = Math.imul(value ^ input.charCodeAt(index), 16777619)
  return (value >>> 0).toString(36)
}

function read(sheetId: string): DiagramVersion[] {
  try {
    const value = JSON.parse(localStorage.getItem(key(sheetId)) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

function changedFields(before: Record<string, unknown>, after: Record<string, unknown>, includePosition: boolean) {
  const ignored = new Set(['selected', 'dragging', 'measured', ...(includePosition ? [] : ['position'])])
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(field => !ignored.has(field) && stable(before[field]) !== stable(after[field]))
}

export const diagramVersionService = {
  list(sheetId: string) { return read(sheetId).sort((a, b) => b.versionNumber - a.versionNumber) },
  create(sheetId: string, snapshot: DiagramSnapshot, options?: { name?: string; note?: string; source?: DiagramVersionSource; restoredFromVersionId?: string; force?: boolean }) {
    const versions = read(sheetId)
    const contentHash = hash(snapshot)
    if (!options?.force && versions.some(version => version.contentHash === contentHash)) return null
    const version: DiagramVersion = {
      id: crypto.randomUUID(), sheetId, versionNumber: Math.max(0, ...versions.map(item => item.versionNumber)) + 1,
      name: options?.name?.trim() || `Version ${versions.length + 1}`, note: options?.note?.trim() || undefined,
      source: options?.source || 'AUTO', snapshot: clone(snapshot), contentHash, createdAt: Date.now(), restoredFromVersionId: options?.restoredFromVersionId,
    }
    localStorage.setItem(key(sheetId), JSON.stringify([...versions, version]))
    return version
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
