import { type Node, type Edge } from '@xyflow/react'

export interface ParseResult {
  nodes: Node[]
  edges: Edge[]
  name: string
  type: string
}

export type DiagramType =
  | 'class'
  | 'useCase'
  | 'sequence'
  | 'stateDiagram'
  | 'flowchart-v2'
  | 'flowchart'
  | 'er'
  | 'c4'
