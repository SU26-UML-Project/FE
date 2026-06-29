import {create} from 'zustand' 
 import {temporal} from 'zundo' 
 import {immer} from 'zustand/middleware/immer' 
 import {nanoid} from 'nanoid' 
 import {applyEdgeChanges, applyNodeChanges, type Edge, type Node, type Connection} from '@xyflow/react' 
import { DiagramType } from '../types/diagrams' 
import { getEdgeOption, patchFromOption, getDiagram } from '../utils/diagrams'
 
 export type EdgeType = 
     | 'association' 
     | 'useCaseAssociation' 
     | 'inheritance' 
     | 'generalization' 
     | 'realization' 
     | 'composition' 
     | 'aggregation' 
     | 'dependency' 
     | 'include' 
     | 'extend' 
     | 'noteLink' 
     | 'controlFlow'
     | 'objectFlow'
     | 'associationEdge'
     | 'useCaseAssociationEdge'
     | 'inheritanceEdge'
     | 'generalizationEdge'
     | 'realizationEdge'
     | 'compositionEdge'
     | 'aggregationEdge'
     | 'dependencyEdge'
     | 'includeEdge'
     | 'extendEdge'
     | 'controlFlowEdge'
     | 'objectFlowEdge'
 
 export interface CanvasState { 
     nodes: Node[] 
     edges: Edge[] 
     selectedNodeId: string | null 
     selectedEdgeId: string | null 
     editingNodeId: string | null 
    activeEdgeId: string
    diagramName: string 
    diagramType: string 
    saveStatus: 'idle' | 'saving' | 'saved' | 'error' 
    isLocked: boolean 
    selectedNodes: Node[]
    selectedEdges: Edge[]
 
    onNodesChange: (changes: any) => void 
    onEdgesChange: (changes: any) => void 
    onConnect: (connection: any) => void 
    addNode: (type: string, position: { x: number; y: number }, parentId?: string) => void 
    selectNode: (id: string | null) => void 
    selectEdge: (id: string | null) => void 
    setEdgeType: (id: string, type: EdgeType) => void 
    setEdgeLabel: (id: string, label: string) => void
    setEdgeStyle: (id: string, style: Record<string, string>) => void 
    setEdgeMarker: (id: string, markers: { markerStart?: string; markerEnd?: string }) => void
    setEdgeDashed: (id: string, dashed: boolean) => void
    flipEdge: (id: string) => void 
     setEditingNodeId: (id: string | null) => void 
    setActiveEdgeId: (id: string) => void
    setNodeData: (id: string, patch: Partial<any>) => void 
    duplicateNode: (id: string) => void
    deleteNode: (id: string) => void
    deleteEdge: (id: string) => void
    bringToFront: (id: string) => void
    sendToBack: (id: string) => void
    setDiagramName: (name: string) => void 
     setDiagramType: (type: string) => void 
     setLocked: (locked: boolean) => void 
    nudge: (dx: number, dy: number) => void
    alignNodes: (mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom' | 'distH' | 'distV') => void
     loadDiagram: (nodes: Node[], edges: Edge[], name: string, type?: string) => void 
     clearCanvas: () => void 

    // Clipboard & Selection
    clipboard: { nodes: Node[], edges: Edge[] } | null
    copy: () => void
    paste: (position?: { x: number, y: number }) => void
    selectAll: () => void
    clearSelection: () => void
 } 
 
 function toReactFlowEdgeType(type: string): string { 
    // Handle minimalist types from UI
    switch (type) {
        case 'ortho':
        case 'smoothstep':
            return 'smoothstep';
        case 'curve':
        case 'bezier':
            return 'bezier';
        case 'line':
        case 'straight':
            return 'straight';
    }

    // Handle legacy/internal types
    if (type.endsWith('Edge')) return type

    switch (type) { 
        case 'association': return 'associationEdge' 
        case 'useCaseAssociation': return 'useCaseAssociationEdge' 
        case 'inheritance': return 'inheritanceEdge' 
        case 'generalization': return 'generalizationEdge' 
        case 'realization': return 'realizationEdge' 
        case 'composition': return 'compositionEdge' 
        case 'aggregation': return 'aggregationEdge' 
        case 'dependency': return 'dependencyEdge' 
        case 'include': return 'includeEdge' 
        case 'extend': return 'extendEdge' 
        case 'controlFlow': return 'controlFlowEdge'
        case 'objectFlow': return 'objectFlowEdge'
        default: return type || 'smoothstep' 
    } 
} 
 
 function getDefaultEdgeType(diagramType: string): string { 
     switch (diagramType) { 
         case 'useCaseDiagram': 
             return 'useCaseAssociationEdge' 
 
         case 'classDiagram': 
             return 'associationEdge' 
 
         default: 
             return 'associationEdge' 
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
             activeEdgeId: 'assoc',
             diagramName: 'Untitled Diagram', 
             diagramType: 'class', 
             saveStatus: 'idle', 
             isLocked: false, 
             selectedNodes: [],
             selectedEdges: [],
 
             onNodesChange: (changes) => { 
                 if (get().isLocked) return 
                 set((state) => { 
                     state.nodes = applyNodeChanges(changes, state.nodes) as Node[] 
                     state.selectedNodes = state.nodes.filter(n => n.selected)
                 }) 
             }, 
 
             onEdgesChange: (changes) => { 
                 if (get().isLocked) return 
                 set((state) => { 
                     state.edges = applyEdgeChanges(changes, state.edges) as Edge[] 
                     state.selectedEdges = state.edges.filter(e => e.selected)
                 }) 
             }, 
 
     onConnect: (connection: Connection) => { 
                 if (get().isLocked) return 
                 set((state) => { 
                    const opt = getEdgeOption(state.diagramType, state.activeEdgeId || 'assoc')
                    const p = patchFromOption(opt)
                     state.edges.push({ 
                         id: nanoid(6), 
                         ...connection, 
                         sourceHandle: connection.sourceHandle ?? null, 
                         targetHandle: connection.targetHandle ?? null, 
                         type: p.type, 
                         label: p.label,
                         data: { marker: p.marker, markerStart: p.markerStart, dashed: p.dashed },
                         zIndex: 5, 
                     } as unknown as Edge) 
                 }) 
             }, 
 
             addNode: (type, position, parentId) => { 
                if (get().isLocked) return 
 
                set((state) => { 
                    const id = nanoid(6) 
                    const diag = getDiagram(state.diagramType)
                    const item = diag.nodes.find(n => n.type === type) || diag.nodes[0]
                    const data = { ...item.data }
                    
                    const width = item.width
                    const height = item.height
                    state.nodes.push({ 
                        id, 
                        type, 
                        position, 
                        parentId,
                        extent: parentId ? 'parent' : undefined,
                        data, 
                        width,
                        height,
                        style: { width, height },
                        zIndex: type === 'package' ? 0 : 10, 
                    } as Node) 
                }) 
            }, 
 
             selectNode: (id) => set((state) => { 
                 state.selectedNodeId = id; 
                 state.selectedEdgeId = null 
             }), 
 
             selectEdge: (id) => set((state) => { 
                 state.selectedEdgeId = id; 
                 state.selectedNodeId = null 
             }), 
 
             setEdgeType: (id, type) => { 
                 if (get().isLocked) return 
                 set((state) => { 
                     const e = state.edges.find((e) => e.id === id) 
                     if (e) { 
                         e.type = toReactFlowEdgeType(type) 
                         e.style = {} 
                         switch (type) { 
                             case 'realization': 
                             case 'dependency': 
                             case 'include': 
                             case 'extend': 
                                 e.style = {strokeDasharray: '5 5'}; 
                                 break 
                             case 'objectFlow':
                                 e.style = {strokeDasharray: '4 4'};
                                 break
                         } 
                         // Refresh selectedEdges reference to trigger UI update
                         state.selectedEdges = state.edges.filter(edge => edge.selected)
                     } 
                 }) 
             }, 

             setEdgeLabel: (id, label) => {
                 if (get().isLocked) return
                 set((state) => {
                     const e = state.edges.find((e) => e.id === id)
                     if (e) {
                         e.label = label
                         // Refresh selectedEdges reference to trigger UI update
                         state.selectedEdges = state.edges.filter(edge => edge.selected)
                     }
                 })
             },
 
             setEdgeStyle: (id, style) => { 
                if (get().isLocked) return 
                set((state) => { 
                    const e = state.edges.find((e) => e.id === id) 
                    if (e) { 
                        e.style = {...(e.style || {}), ...style} 
                        // Refresh selectedEdges reference to trigger UI update
                        state.selectedEdges = state.edges.filter(edge => edge.selected)
                    } 
                }) 
            }, 
 
            setEdgeMarker: (id, { markerStart, markerEnd }) => {
                if (get().isLocked) return
                set((state) => {
                    const e = state.edges.find((e) => e.id === id)
                    if (e) {
                        // Always update, even if undefined/null to allow clearing
                        e.markerStart = markerStart
                        e.markerEnd = markerEnd
                        
                        if (!e.data) e.data = {}
                        const d = e.data as any
                        d.markerStart = markerStart
                        d.marker = markerEnd
                        
                        // Refresh selectedEdges reference to trigger UI update
                        state.selectedEdges = state.edges.filter(edge => edge.selected)
                    }
                })
            },

            setEdgeDashed: (id, dashed) => {
                if (get().isLocked) return
                set((state) => {
                    const e = state.edges.find((e) => e.id === id)
                    if (e) {
                        const dash = dashed ? '5 5' : undefined
                        e.style = { ...(e.style || {}), strokeDasharray: dash }
                        if (e.data) (e.data as any).dashed = dashed
                        // Refresh selectedEdges reference to trigger UI update
                        state.selectedEdges = state.edges.filter(edge => edge.selected)
                    }
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
                 set((state) => { 
                     state.editingNodeId = id 
                 }) 
             }, 
 
             setActiveEdgeId: (id) => set((state) => {
                state.activeEdgeId = id
             }),

             setNodeData: (id, patch) => { 
                 if (get().isLocked) return 
                 set((state) => { 
                     const n = state.nodes.find((n) => n.id === id) 
                     if (n) {
                        Object.assign(n.data, patch)
                        // Refresh selectedNodes reference to trigger UI update
                        state.selectedNodes = state.nodes.filter(node => node.selected)
                     }
                 }) 
             }, 
 
             duplicateNode: (id) => {
                if (get().isLocked) return
                set((state) => {
                    const node = state.nodes.find((n) => n.id === id)
                    if (node) {
                        const newId = nanoid(6)
                        state.nodes.push({
                            ...JSON.parse(JSON.stringify(node)),
                            id: newId,
                            position: { x: node.position.x + 20, y: node.position.y + 20 },
                            selected: true,
                        })
                        state.nodes.forEach((n) => { if (n.id !== newId) n.selected = false })
                        state.selectedNodes = state.nodes.filter(n => n.selected)
                    }
                })
             },

             deleteNode: (id) => {
                if (get().isLocked) return
                set((state) => {
                    state.nodes = state.nodes.filter((n) => n.id !== id)
                    state.edges = state.edges.filter((e) => e.source !== id && e.target !== id)
                    state.selectedNodes = state.nodes.filter(n => n.selected)
                    state.selectedEdges = state.edges.filter(e => e.selected)
                })
             },

             deleteEdge: (id) => {
                if (get().isLocked) return
                set((state) => {
                    state.edges = state.edges.filter((e) => e.id !== id)
                    state.selectedEdges = state.edges.filter(e => e.selected)
                })
             },

             bringToFront: (id) => {
                set((state) => {
                    const index = state.nodes.findIndex((n) => n.id === id)
                    if (index !== -1) {
                        const node = state.nodes.splice(index, 1)[0]
                        state.nodes.push(node)
                    }
                })
             },

             sendToBack: (id) => {
                set((state) => {
                    const index = state.nodes.findIndex((n) => n.id === id)
                    if (index !== -1) {
                        const node = state.nodes.splice(index, 1)[0]
                        state.nodes.unshift(node)
                    }
                })
             },

             setDiagramName: (name) => set((state) => { 
                 state.diagramName = name 
             }), 
             setDiagramType: (type) => set((state) => { 
                 state.diagramType = type as DiagramType 
             }), 
             setLocked: (locked) => set((state) => { 
                 state.isLocked = locked 
             }), 
 
             nudge: (dx, dy) => set((state) => {
                 if (state.isLocked) return
                 state.nodes.forEach((n) => {
                     if (n.selected) {
                         n.position.x += dx
                         n.position.y += dy
                     }
                 })
              }),

              alignNodes: (mode) => set((state) => {
                  if (state.isLocked) return
                  const selectedNodes = state.nodes.filter(n => n.selected)
                  if (selectedNodes.length < 2) return

                  const boxes = selectedNodes.map(n => {
                      const w = n.measured?.width ?? n.width ?? 120
                      const h = n.measured?.height ?? n.height ?? 40
                      return { id: n.id, x: n.position.x, y: n.position.y, w, h }
                  })

                  const minX = Math.min(...boxes.map(b => b.x))
                  const maxX = Math.max(...boxes.map(b => b.x + b.w))
                  const minY = Math.min(...boxes.map(b => b.y))
                  const maxY = Math.max(...boxes.map(b => b.y + b.h))
                  const midX = (minX + maxX) / 2
                  const midY = (minY + maxY) / 2

                  selectedNodes.forEach(n => {
                      const b = boxes.find(box => box.id === n.id)!
                      switch (mode) {
                          case 'left': n.position.x = minX; break
                          case 'right': n.position.x = maxX - b.w; break
                          case 'centerH': n.position.x = midX - b.w / 2; break
                          case 'top': n.position.y = minY; break
                          case 'bottom': n.position.y = maxY - b.h; break
                          case 'centerV': n.position.y = midY - b.h / 2; break
                      }
                  })

                  if (mode === 'distH') {
                      const sorted = [...boxes].sort((a, b) => a.x - b.x)
                      const totalW = sorted.reduce((sum, b) => sum + b.w, 0)
                      const gap = (maxX - minX - totalW) / (sorted.length - 1)
                      let currX = minX
                      sorted.forEach(b => {
                          const n = selectedNodes.find(node => node.id === b.id)!
                          n.position.x = currX
                          currX += b.w + gap
                      })
                  }

                  if (mode === 'distV') {
                      const sorted = [...boxes].sort((a, b) => a.y - b.y)
                      const totalH = sorted.reduce((sum, b) => sum + b.h, 0)
                      const gap = (maxY - minY - totalH) / (sorted.length - 1)
                      let currY = minY
                      sorted.forEach(b => {
                          const n = selectedNodes.find(node => node.id === b.id)!
                          n.position.y = currY
                          currY += b.h + gap
                      })
                  }
              }),
 
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

             // Clipboard & Selection
             clipboard: null,

             copy: () => {
                const state = get()
                const selectedNodes = state.nodes.filter(n => n.selected)
                const selectedEdges = state.edges.filter(e => e.selected)
                if (selectedNodes.length > 0 || selectedEdges.length > 0) {
                    set(state => {
                        state.clipboard = {
                            nodes: JSON.parse(JSON.stringify(selectedNodes)),
                            edges: JSON.parse(JSON.stringify(selectedEdges))
                        }
                    })
                }
             },

             paste: (pos) => {
                const state = get()
                if (!state.clipboard) return
                
                set(s => {
                    const idMap = new Map<string, string>()
                    
                    // Duplicate nodes
                    const newNodes = state.clipboard!.nodes.map(node => {
                        const newId = nanoid(6)
                        idMap.set(node.id, newId)
                        
                        // Calculate new position
                        const position = pos 
                            ? { x: pos.x, y: pos.y } // If target position provided
                            : { x: node.position.x + 40, y: node.position.y + 40 }

                        return {
                            ...node,
                            id: newId,
                            position,
                            selected: true
                        }
                    })

                    // Duplicate edges that are between copied nodes
                    const newEdges = state.clipboard!.edges.map(edge => {
                        const sourceId = idMap.get(edge.source) || edge.source
                        const targetId = idMap.get(edge.target) || edge.target
                        return {
                            ...edge,
                            id: nanoid(6),
                            source: sourceId,
                            target: targetId,
                            selected: true
                        }
                    })

                    s.nodes.forEach(n => n.selected = false)
                    s.edges.forEach(e => e.selected = false)
                    s.nodes.push(...newNodes)
                    s.edges.push(...newEdges)
                })
             },

             selectAll: () => set(state => {
                state.nodes.forEach(n => n.selected = true)
                state.edges.forEach(e => e.selected = true)
             }),

             clearSelection: () => set(state => {
                state.nodes.forEach(n => n.selected = false)
                state.edges.forEach(e => e.selected = false)
                state.selectedNodeId = null
                state.selectedEdgeId = null
             })
         })), 
         { 
             partialize: (state) => ({nodes: state.nodes, edges: state.edges, diagramType: state.diagramType}), 
             limit: 50, 
         }, 
     ), 
 )
