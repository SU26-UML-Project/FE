import * as dagre from '@dagrejs/dagre'
import { type Node, type Edge } from '@xyflow/react'

const NODE_PADDING = 40
const LINE_HEIGHT = 22
const CHAR_WIDTH = 8
const MIN_WIDTH = 160
const MIN_HEIGHT = 60
const MAX_WIDTH = 500

export function estimateNodeSize(node: Node): { width: number; height: number } {
  const d = node.data as any
  const lines: string[] = []

  if (d.label) lines.push(d.label)
  if (d.stereotype) lines.push(`«${d.stereotype}»`)
  if (d.attributes) lines.push(...d.attributes)
  if (d.methods) lines.push(...d.methods)
  if (d.sections) lines.push(...d.sections.map((s: any) => s.content))
  if (d.sourceType) lines.push(d.sourceType)

  const maxChars = Math.max(...lines.map(l => (l || '').length), 20)
  const lineCount = Math.max(lines.length, 1)

  return {
    width: Math.min(Math.max(maxChars * CHAR_WIDTH + NODE_PADDING, MIN_WIDTH), MAX_WIDTH),
    height: Math.max(lineCount * LINE_HEIGHT + NODE_PADDING, MIN_HEIGHT),
  }
}

export function applyLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 })

  nodes.forEach(n => {
    const { width, height } = estimateNodeSize(n)
    g.setNode(n.id, { width, height })
  })

  edges.forEach(e => {
    g.setEdge(e.source, e.target)
  })

  dagre.layout(g)

  return nodes.map(n => {
    const pos = g.node(n.id)
    if (!pos) return n
    const { width, height } = estimateNodeSize(n)
    return {
      ...n,
      position: {
        x: pos.x - width / 2,
        y: pos.y - height / 2,
      },
      style: { width, height },
    }
  })
}
