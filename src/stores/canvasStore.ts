import { create } from 'zustand'
import { temporal } from 'zundo'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { type Node, type Edge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'

export type EdgeType = 'association' | 'inheritance' | 'realization' | 'composition' | 'aggregation' | 'dependency' | 'include' | 'extend'

export interface CanvasState {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  editingNodeId: string | null
  diagramName: string
  diagramType: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  isLocked: boolean

  onNodesChange: (changes: any) => void
  onEdgesChange: (changes: any) => void
  onConnect: (connection: any) => void
  addNode: (type: string, position: { x: number; y: number }) => void
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  setEdgeType: (id: string, type: EdgeType) => void
  setEdgeStyle: (id: string, style: Record<string, string>) => void
  flipEdge: (id: string) => void
  setEditingNodeId: (id: string | null) => void
  setNodeData: (id: string, patch: Partial<any>) => void
  setDiagramName: (name: string) => void
  setDiagramType: (type: string) => void
  setLocked: (locked: boolean) => void
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
    immer((set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      editingNodeId: null,
      diagramName: 'Untitled Diagram',
      diagramType: 'custom',
      saveStatus: 'idle',
      isLocked: false,

      onNodesChange: (changes) => {
        if (get().isLocked) return
        set((state) => { state.nodes = applyNodeChanges(changes, state.nodes) as Node[] })
      },

      onEdgesChange: (changes) => {
        if (get().isLocked) return
        set((state) => { state.edges = applyEdgeChanges(changes, state.edges) as Edge[] })
      },

      onConnect: (connection) => {
        if (get().isLocked) return
        set((state) => {
          state.edges.push({
            id: nanoid(6),
            ...connection,
            sourceHandle: connection.sourceHandle ?? null,
            targetHandle: connection.targetHandle ?? null,
            type: 'associationEdge',
            style: {},
          } as unknown as Edge)
        })
      },

      addNode: (type, position) => {
        if (get().isLocked) return
        set((state) => {
          state.nodes.push({ id: nanoid(6), type, position, data: defaultNodeData(type) } as Node)
        })
      },

      selectNode: (id) => set((state) => { state.selectedNodeId = id; state.selectedEdgeId = null }),

      selectEdge: (id) => set((state) => { state.selectedEdgeId = id; state.selectedNodeId = null }),

      setEdgeType: (id, type) => {
        if (get().isLocked) return
        set((state) => {
          const e = state.edges.find((e) => e.id === id)
          if (e) {
            e.type = `${type}Edge`
            e.style = {}
            switch (type) {
              case 'realization': case 'dependency': case 'include': case 'extend':
                e.style = { strokeDasharray: '5 5' }; break
            }
          }
        })
      },

      setEdgeStyle: (id, style) => {
        if (get().isLocked) return
        set((state) => {
          const e = state.edges.find((e) => e.id === id)
          if (e) { e.style = { ...(e.style || {}), ...style } }
        })
      },

      flipEdge: (id) => {
        if (get().isLocked) return
        set((state) => {
          const e = state.edges.find((e) => e.id === id)
          if (e) {
            const tmpSource = e.source
            const tmpSourceHandle = e.sourceHandle
            e.source = e.target
            e.sourceHandle = e.targetHandle
            e.target = tmpSource
            e.targetHandle = tmpSourceHandle
          }
        })
      },

      setEditingNodeId: (id) => {
        if (get().isLocked && id !== null) return
        set((state) => { state.editingNodeId = id })
      },

      setNodeData: (id, patch) => {
        if (get().isLocked) return
        set((state) => {
          const n = state.nodes.find((n) => n.id === id)
          if (n) Object.assign(n.data, patch)
        })
      },

      setDiagramName: (name) => set((state) => { state.diagramName = name }),
      setDiagramType: (type) => set((state) => { state.diagramType = type }),
      setLocked: (locked) => set((state) => { state.isLocked = locked }),

      loadDiagram: (nodes, edges, name, type = 'custom') =>
        set((state) => {
          state.nodes = nodes
          state.edges = edges
          state.diagramName = name
          state.diagramType = type
          state.selectedNodeId = null
          state.selectedEdgeId = null
          state.editingNodeId = null
        }),

      clearCanvas: () => {
        if (get().isLocked) return
        set((state) => {
          state.nodes = []
          state.edges = []
          state.selectedNodeId = null
          state.selectedEdgeId = null
          state.editingNodeId = null
          state.diagramType = 'custom'
        })
      },
    })),
    {
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges, diagramType: state.diagramType }),
      limit: 50,
    },
  ),
)
