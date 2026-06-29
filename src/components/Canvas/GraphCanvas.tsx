import { useCallback, useMemo, useRef, useState, useEffect } from 'react' 
 import { 
   ReactFlow, 
   Background, 
   Controls, 
   MiniMap, 
   useReactFlow, 
   ConnectionMode, 
   type Node, 
   type Edge, 
   type OnNodesChange, 
   type OnEdgesChange, 
   type OnConnect, 
   ReactFlowProvider, 
   type XYPosition,
   SelectionMode,
   BackgroundVariant,
 } from '@xyflow/react' 
 import '@xyflow/react/dist/style.css' 
 
 import { useStore } from 'zustand'
 import { useCanvasStore } from '../../stores/canvasStore' 
 import { nodeTypes } from './custom-nodes/registry' 
 import { edgeTypes } from './edges/index' 
 import { MarkerDefs } from './MarkerDefs' 
 import { SmartGuides, type GuidesState } from './features/SmartGuides'
 import { QuickAdd } from './features/QuickAdd'
 import { ContextMenu, type CtxItem, CtxIcons } from './features/ContextMenu'
 import { getDiagram } from '../../utils/diagrams'
 import { computeSnap, nodeBox, emptySnap } from '../../utils/snap'
 import type { PaletteItem } from '../../types/diagrams'

 function GraphCanvasInner({
   zoom,
   onZoomChange,
   showGrid,
   showMinimap,
   snap,
 }: {
   zoom: number;
   onZoomChange: (z: number) => void;
   showGrid: boolean;
   showMinimap: boolean;
   snap: boolean;
 }) { 
   const reactFlowWrapper = useRef<HTMLDivElement>(null) 
   const { screenToFlowPosition, getNodes, getEdges, getViewport, setViewport } = useReactFlow() 
   const nodes = useCanvasStore((s) => s.nodes) 
   const edges = useCanvasStore((s) => s.edges) 
   const diagramType = useCanvasStore((s) => s.diagramType)
   const storeOnNodesChange = useCanvasStore((s) => s.onNodesChange) 
   const onEdgesChange = useCanvasStore((s) => s.onEdgesChange) 
   const onConnect = useCanvasStore((s) => s.onConnect) 
   const selectNode = useCanvasStore((s) => s.selectNode) 
   const selectEdge = useCanvasStore((s) => s.selectEdge) 
   const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId) 
   const addNode = useCanvasStore((s) => s.addNode) 
   const deleteNode = useCanvasStore((s) => s.deleteNode)
   const deleteEdge = useCanvasStore((s) => s.deleteEdge)
   const duplicateNode = useCanvasStore((s) => s.duplicateNode)
   const bringToFront = useCanvasStore((s) => s.bringToFront)
   const sendToBack = useCanvasStore((s) => s.sendToBack)
   const copy = useCanvasStore((s) => s.copy)
   const paste = useCanvasStore((s) => s.paste)
   const selectAll = useCanvasStore((s) => s.selectAll)
   const nudge = useCanvasStore((s) => s.nudge)
   const { undo, redo, pause, resume } = useStore(useCanvasStore.temporal, (s) => s)

   const onNodesChange = useCallback((changes: any) => {
     // Smart alignment guides + snapping
     let nextChanges = changes;
     const dragChanges = changes.filter((c: any) => c.type === 'position');
     const isDragging = dragChanges.some((c: any) => c.dragging);
     
     if (!snap && dragChanges.length) {
       const first = dragChanges[0];
       const dragIds = new Set(dragChanges.map((d: any) => d.id));
       const others = getNodes()
         .filter((n) => !dragIds.has(n.id) && !n.parentId)
         .map(nodeBox);
       
       const refNode = getNodes().find((n) => n.id === first.id);
       const refBox = refNode ? nodeBox(refNode) : null;
       
       if (refBox && first.position) {
         const vp = getViewport();
         const viewCenter = {
           x: (-vp.x + window.innerWidth / 2) / vp.zoom,
           y: (-vp.y + window.innerHeight / 2) / vp.zoom,
         };
         
         const r = computeSnap({ ...refBox, x: first.position.x, y: first.position.y }, others, viewCenter);
         
         if (isDragging) {
           setGuides({ guidesX: r.guidesX, guidesY: r.guidesY });
         } else {
           setGuides(emptySnap);
         }
         
         nextChanges = changes.map((c: any) => {
           if (c.type === 'position' && dragIds.has(c.id) && c.position) {
             return {
               ...c,
               position: { x: c.position.x + r.dx, y: c.position.y + r.dy },
             };
           }
           return c;
         });
       }
     } else if (dragChanges.length) {
       setGuides(emptySnap);
     }

     storeOnNodesChange(nextChanges);
   }, [storeOnNodesChange, getNodes, getViewport, snap]);

   const [guides, setGuides] = useState<GuidesState>(emptySnap)
   const [quickAdd, setQuickAdd] = useState<{ x: number, y: number, flowPos: XYPosition } | null>(null)
   const [menu, setMenu] = useState<{ x: number, y: number, items: CtxItem[] } | null>(null)

   const stableNodeTypes = useMemo(() => nodeTypes, []) 
   const stableEdgeTypes = useMemo(() => edgeTypes, []) 
 
   const onNodeClick = useCallback( 
     (_: React.MouseEvent, node: Node) => { 
       selectNode(node.id) 
     }, 
     [selectNode], 
   ) 
 
   const onNodeDoubleClick = useCallback( 
     (_: React.MouseEvent, node: Node) => { 
       setEditingNodeId(node.id) 
     }, 
     [setEditingNodeId], 
   ) 
 
   const onEdgeClick = useCallback( 
     (_: React.MouseEvent, edge: Edge) => { 
       selectEdge(edge.id) 
     }, 
     [selectEdge], 
   ) 
 
   const onPaneClick = useCallback(() => { 
     selectNode(null) 
     selectEdge(null) 
     setEditingNodeId(null) 
     setQuickAdd(null)
     setMenu(null)
   }, [selectNode, selectEdge, setEditingNodeId]) 

   const onPaneDoubleClick = useCallback(
     (e: React.MouseEvent) => {
       const target = e.target as HTMLElement;
       // Only trigger on empty canvas
       if (
         target.closest(".react-flow__node") ||
         target.closest(".react-flow__edge") ||
         target.closest(".react-flow__controls") ||
         target.closest(".react-flow__minimap") ||
         target.closest(".react-flow__panel")
       ) {
         return;
       }
       setMenu(null);
       const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
       setQuickAdd({ x: e.clientX, y: e.clientY, flowPos });
     },
     [screenToFlowPosition]
   );

   const onEdgeDoubleClick = useCallback(
     (e: React.MouseEvent, edge: Edge) => {
       e.stopPropagation();
       // Open edge label editor if needed, but for now we'll just select it
       selectEdge(edge.id);
     },
     [selectEdge]
   );
 
   const onDragOver = useCallback((event: React.DragEvent) => { 
     event.preventDefault() 
     event.dataTransfer.dropEffect = 'move' 
   }, []) 
 
   const onDrop = useCallback( 
     (event: React.DragEvent) => { 
       event.preventDefault() 
       
       const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
       if (!reactFlowBounds) return;

       // Try to get type from multiple possible sources
       let type = event.dataTransfer.getData('application/reactflow') || 
                  event.dataTransfer.getData('shapeType') ||
                  event.dataTransfer.getData('text/plain');

       const graphiteData = event.dataTransfer.getData("application/graphite");
       
       // If we have full PaletteItem data, we can center the drop better
       if (graphiteData) {
         try {
           const item = JSON.parse(graphiteData) as PaletteItem;
           const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
           addNode(item.type, { 
             x: position.x - (item.width || 100) / 2, 
             y: position.y - (item.height || 50) / 2 
           });
           return;
         } catch (e) {
           console.error("Failed to parse graphite data:", e);
         }
       }

       // Fallback to just using the type string
       if (!type) return;
       
       const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
       addNode(type, position);
     }, 
     [screenToFlowPosition, addNode], 
   ) 

   const onNodeDragStart = useCallback(() => {
     pause();
   }, [pause]);

   const onNodeDrag = useCallback(
     (_: any, _node: Node) => {
       // Snap logic moved to onNodesChange for smoother interaction and to fix release shift
     },
     []
   );

   const onNodeDragStop = useCallback(() => { 
     resume();
     setGuides(emptySnap);
     const { nodes, edges } = useCanvasStore.getState() 
     
     window.dispatchEvent(new CustomEvent('canvas-data-change', { 
       detail: { nodes, edges } 
     })) 
   }, [resume]) 

   const onPaneContextMenu = useCallback(
     (e: React.MouseEvent) => {
       e.preventDefault();
       setQuickAdd(null);
       const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
       const mod = isMac ? "⌘" : "Ctrl";
       
       const items: CtxItem[] = [
         {
           label: "Add shape here",
           icon: CtxIcons.duplicate,
           onClick: () => {
             const diag = getDiagram(diagramType as any);
             const primary = diag.nodes.find((n) => n.type !== "note") ?? diag.nodes[0];
             const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
             addNode(primary.type, { x: pos.x - primary.width / 2, y: pos.y - primary.height / 2 });
           },
         },
         { divider: true },
         {
           label: "Select All",
           shortcut: `${mod}+A`,
           icon: CtxIcons.selectAll,
           onClick: () => selectAll()
         },
         {
           label: "Paste",
           shortcut: `${mod}+V`,
           icon: CtxIcons.paste,
           onClick: () => {
             const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
             paste(pos);
           },
         },
       ];
       setMenu({ x: e.clientX, y: e.clientY, items });
     },
     [diagramType, screenToFlowPosition, addNode, selectAll, paste]
   );

   const onNodeContextMenu = useCallback(
     (e: React.MouseEvent, node: Node) => {
       e.preventDefault();
       setQuickAdd(null);
       const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
       const mod = isMac ? "⌘" : "Ctrl";

       const items: CtxItem[] = [
         {
           label: "Duplicate",
           shortcut: `${mod}+D`,
           icon: CtxIcons.duplicate,
           onClick: () => duplicateNode(node.id),
         },
         {
           label: "Copy",
           shortcut: `${mod}+C`,
           icon: CtxIcons.copy,
           onClick: () => copy(),
         },
         { divider: true },
         {
           label: "Bring to Front",
           shortcut: "]",
           icon: CtxIcons.front,
           onClick: () => bringToFront(node.id),
         },
         {
           label: "Send to Back",
           shortcut: "[",
           icon: CtxIcons.back,
           onClick: () => sendToBack(node.id),
         },
         { divider: true },
         {
           label: "Delete",
           shortcut: "⌫",
           icon: CtxIcons.delete,
           danger: true,
           onClick: () => deleteNode(node.id),
         },
       ];
       setMenu({ x: e.clientX, y: e.clientY, items });
     },
     [duplicateNode, bringToFront, sendToBack, deleteNode, copy]
   );
 
   const onMove = useCallback((_: any, viewport: any) => {
     if (viewport && typeof viewport.zoom === 'number') {
       onZoomChange(viewport.zoom);
     }
   }, [onZoomChange]);

   useEffect(() => {
     const vp = getViewport();
     if (vp && Math.abs(vp.zoom - zoom) > 0.01) {
       setViewport({ ...vp, zoom }, { duration: 200 });
     }
   }, [zoom, getViewport, setViewport]);

   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
       const mod = isMac ? e.metaKey : e.ctrlKey;

       if (mod && e.key === 'c') {
         if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
         copy();
       }
       if (mod && e.key === 'v') {
         if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
         paste();
       }
       if (mod && e.key === 'd') {
         e.preventDefault();
         const selected = getNodes().find(n => n.selected);
         if (selected) duplicateNode(selected.id);
       }
       if (mod && e.key === 'a') {
         if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
         e.preventDefault();
         selectAll();
       }
       if (mod && e.key === 'z') {
         if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
         e.preventDefault();
         if (e.shiftKey) redo();
         else undo();
       }
       if (mod && e.key === 'y') {
         if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
         e.preventDefault();
         redo();
       }
       if (e.key === 'Delete' || e.key === 'Backspace') {
         if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
         const state = useCanvasStore.getState();
         const selectedNodes = state.nodes.filter(n => n.selected);
         const selectedEdges = state.edges.filter(e => e.selected);
         selectedNodes.forEach(n => deleteNode(n.id));
         selectedEdges.forEach(e => deleteEdge(e.id));
       }
       
       // Nudge
       if (e.key.startsWith('Arrow')) {
         if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
         e.preventDefault();
         const step = e.shiftKey ? 10 : 1;
         if (e.key === 'ArrowLeft') nudge(-step, 0);
         else if (e.key === 'ArrowRight') nudge(step, 0);
         else if (e.key === 'ArrowUp') nudge(0, -step);
         else if (e.key === 'ArrowDown') nudge(0, step);
       }
     };

     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, [copy, paste, duplicateNode, selectAll, deleteNode, deleteEdge, getNodes, getEdges, nudge, undo, redo]);

   return ( 
     <div 
       ref={reactFlowWrapper} 
       className="w-full h-full relative outline-none"
       tabIndex={0}
       onDoubleClick={onPaneDoubleClick}
     > 
       <ReactFlow 
         nodes={nodes} 
         edges={edges} 
         onNodesChange={onNodesChange as OnNodesChange} 
         onEdgesChange={onEdgesChange as OnEdgesChange} 
         onConnect={onConnect as OnConnect} 
         onNodeClick={onNodeClick} 
         onNodeDoubleClick={onNodeDoubleClick} 
         onEdgeClick={onEdgeClick} 
         onEdgeDoubleClick={onEdgeDoubleClick}
         onPaneClick={onPaneClick} 
         onDragOver={onDragOver} 
         onDrop={onDrop} 
         onNodeDragStart={onNodeDragStart}
         onNodeDrag={onNodeDrag}
         onNodeDragStop={onNodeDragStop} 
         onSelectionChange={({ nodes, edges }) => {
            // This triggers re-renders which helps PropsPanel see the latest selection
            // even if we don't store the full list in Zustand
         }}
         onPaneContextMenu={onPaneContextMenu}
         onNodeContextMenu={onNodeContextMenu}
         onMove={onMove}
         nodeTypes={stableNodeTypes} 
         edgeTypes={stableEdgeTypes} 
         defaultEdgeOptions={{ type: 'smoothstep', zIndex: 5 }} 
         connectionMode={ConnectionMode.Loose} 
         connectionRadius={20} 
         connectionLineStyle={{ stroke: '#18181b', strokeWidth: 1.5 }} 
         snapToGrid={snap} 
         snapGrid={[16, 16]} 
         fitView 
         deleteKeyCode={null} 
         selectionOnDrag
         selectionMode={SelectionMode.Partial}
         panOnDrag={[1, 2]}
         panOnScroll
         zoomOnDoubleClick={false}
         proOptions={{ hideAttribution: true }} 
         className="react-flow-canvas bg-white" 
       > 
         <MarkerDefs /> 
         {showGrid && (
            <Background 
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1.6}
              color="#e4e4e7"
            />
         )} 
         <Controls showInteractive={false} position="bottom-left" /> 
         {showMinimap && (
           <MiniMap 
             pannable
             zoomable
             position="bottom-right"
             style={{ background: "#ffffff" }}
             nodeColor={() => "#d4d4d8"}
             nodeStrokeColor={() => "#a1a1aa"}
             nodeBorderRadius={4}
             maskColor="rgba(15,23,42,0.05)"
           />
         )}
         <SmartGuides guides={guides} />
       </ReactFlow> 

       {quickAdd && (
         <QuickAdd
           {...quickAdd}
           diagram={getDiagram(diagramType as any)}
           onAdd={(item, pos) => addNode(item.type, pos)}
           onClose={() => setQuickAdd(null)}
         />
       )}

       {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
     </div> 
   ) 
 } 
 
 export function GraphCanvas(props: {
  zoom: number;
  onZoomChange: (z: number) => void;
  showGrid: boolean;
  showMinimap: boolean;
  snap: boolean;
}) { 
   return ( 
     <ReactFlowProvider> 
       <GraphCanvasInner {...props} /> 
     </ReactFlowProvider> 
   ) 
 } 
