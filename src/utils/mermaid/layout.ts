import * as dagre from '@dagrejs/dagre'
import { type Node, type Edge } from '@xyflow/react'

const NODE_PADDING = 40
const LINE_HEIGHT = 22
const CHAR_WIDTH = 8
const MIN_WIDTH = 160
const MIN_HEIGHT = 60
const MAX_WIDTH = 500

export function estimateNodeSize(node: Node): { width: number; height: number } {
  // Handle fixed-size special nodes
  switch (node.type) {
    case 'initialNode':
      return { width: 30, height: 30 }
    case 'finalNode':
      return { width: 35, height: 35 }
    case 'decisionNode':
      return { width: 80, height: 80 }
    case 'forkJoinNode': {
      const isVertical = (node.data as any)?.orientation === 'vertical'
      return isVertical ? { width: 10, height: 100 } : { width: 100, height: 10 }
    }
  }

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
  const g = new dagre.graphlib.Graph({ compound: true })
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 100, marginx: 50, marginy: 50 })

  // 1. Set nodes and parents
  nodes.forEach(n => {
    const { width, height } = estimateNodeSize(n)
    g.setNode(n.id, { width, height })
    if (n.parentId) {
      g.setParent(n.id, n.parentId)
    }
  })

  // 2. Set edges
  edges.forEach(e => {
    g.setEdge(e.source, e.target)
  })

  // 3. Run layout
  dagre.layout(g)

  // 4. Calculate relative positions for children and update parent sizes
  const resultNodes = nodes.map(n => {
    const nodeLayout = g.node(n.id)
    if (!nodeLayout) return n

    const width = nodeLayout.width
    const height = nodeLayout.height

    let position = {
      x: nodeLayout.x - width / 2,
      y: nodeLayout.y - height / 2,
    }

    // If node has a parent, Dagre gives absolute position, 
    // but React Flow needs relative to parent's top-left
    if (n.parentId) {
      const parentLayout = g.node(n.parentId)
      if (parentLayout) {
        const parentLeft = parentLayout.x - parentLayout.width / 2
        const parentTop = parentLayout.y - parentLayout.height / 2
        position = {
          x: position.x - parentLeft,
          y: position.y - parentTop,
        }
      }
    }

    return {
      ...n,
      position,
      style: { width, height },
    }
  })

  return resultNodes
}
