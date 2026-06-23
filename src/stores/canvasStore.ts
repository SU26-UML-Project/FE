import { create } from 'zustand'
import { temporal } from 'zundo'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { type Node, type Edge, MarkerType, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'

export type EdgeType = 'association' | 'inheritance' | 'realization' | 'composition' | 'aggregation' | 'dependency' | 'include' | 'extend'

export interface CanvasState {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  diagramName: string
  diagramType: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'

  onNodesChange: (changes: any) => void
  onEdgesChange: (changes: any) => void
  onConnect: (connection: any) => void
  addNode: (type: string, position: { x: number; y: number }) => void
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  setEdgeType: (id: string, type: EdgeType) => void
  setNodeData: (id: string, patch: Partial<any>) => void
  setDiagramName: (name: string) => void
  setDiagramType: (type: string) => void
  loadDiagram: (nodes: Node[], edges: Edge[], name: string, type?: string) => void
  clearCanvas: () => void
}

function defaultNodeData(type: string): any {
  switch (type) {
    case 'classNode':
      return { type: 'classNode', label: 'Class', attributes: [], methods: [] }
    case 'interfaceNode':
      return { type: 'interfaceNode', label: 'Interface', methods: [] }
    case 'useCaseNode':
      return { type: 'useCaseNode', label: 'Use Case' }
    case 'actorNode':
      return { type: 'actorNode', label: 'Actor' }
    default:
      return { type: 'genericNode', label: 'Node', sourceType: type }
  }
}

export const useCanvasStore = create<CanvasState>()(
  temporal(
    immer((set) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      diagramName: 'Untitled Diagram',
      diagramType: 'custom',
      saveStatus: 'idle',

      onNodesChange: (changes) => {
        set((state) => { state.nodes = applyNodeChanges(changes, state.nodes) as Node[] })
      },

      onEdgesChange: (changes) =>
        set((state) => { state.edges = applyEdgeChanges(changes, state.edges) as Edge[] }),

      onConnect: (connection) =>
        set((state) => {
          const id = nanoid(6)
          const newEdge: any = {
            id,
            ...connection,
            sourceHandle: connection.sourceHandle ?? null,
            targetHandle: connection.targetHandle ?? null,
            type: 'associationEdge',
            style: {},
            markerEnd: { type: MarkerType.ArrowClosed, color: '#333' },
            markerStart: undefined,
          }
          state.edges.push(newEdge as unknown as Edge)
        }),

      addNode: (type, position) => {
        set((state) => {
          state.nodes.push({ id: nanoid(6), type, position, data: defaultNodeData(type) } as Node)
        })
      },

      selectNode: (id) => set((state) => { state.selectedNodeId = id; state.selectedEdgeId = null }),

      selectEdge: (id) => set((state) => { state.selectedEdgeId = id; state.selectedNodeId = null }),

      setEdgeType: (id, type) =>
        set((state) => {
          const e = state.edges.find((e) => e.id === id)
          if (e) {
            e.type = `${type}Edge`
            e.markerStart = undefined
            e.markerEnd = { type: MarkerType.ArrowClosed, color: '#333' }
            e.style = {}
            switch (type) {
              case 'realization':
                e.markerEnd = { type: MarkerType.Arrow, color: '#333' }
                e.style = { strokeDasharray: '6 4' }; break
              case 'dependency': case 'include': case 'extend':
                e.style = { strokeDasharray: '6 4' }; break
              case 'composition':
                e.markerStart = { type: MarkerType.ArrowClosed, color: '#333' }; break
              case 'aggregation':
                e.markerStart = { type: MarkerType.Arrow, color: '#333' }; break
            }
          }
        }),

      setNodeData: (id, patch) =>
        set((state) => {
          const n = state.nodes.find((n) => n.id === id)
          if (n) Object.assign(n.data, patch)
        }),

      setDiagramName: (name) => set((state) => { state.diagramName = name }),
      setDiagramType: (type) => set((state) => { state.diagramType = type }),

      loadDiagram: (nodes, edges, name, type = 'custom') =>
        set((state) => { state.nodes = nodes; state.edges = edges; state.diagramName = name; state.diagramType = type }),

      clearCanvas: () =>
        set((state) => { state.nodes = []; state.edges = []; state.selectedNodeId = null; state.selectedEdgeId = null; state.diagramType = 'custom' }),
    })),
    {
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges, diagramType: state.diagramType }),
      limit: 50,
    },
  ),
)
