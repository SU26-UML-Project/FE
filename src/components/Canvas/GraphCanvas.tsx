import { useCallback, useMemo, useRef } from 'react' 
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
 } from '@xyflow/react' 
 import '@xyflow/react/dist/style.css' 
 
 import { useCanvasStore } from '../../stores/canvasStore' 
 import { nodeTypes } from './custom-nodes/registry' 
 import { edgeTypes } from './edges/index' 
 import { MarkerDefs } from './MarkerDefs' 
 
 
 function GraphCanvasInner() { 
   const reactFlowWrapper = useRef<HTMLDivElement>(null) 
   const { screenToFlowPosition } = useReactFlow() 
   const nodes = useCanvasStore((s) => s.nodes) 
   const edges = useCanvasStore((s) => s.edges) 
   const onNodesChange = useCanvasStore((s) => s.onNodesChange) 
   const onEdgesChange = useCanvasStore((s) => s.onEdgesChange) 
   const onConnect = useCanvasStore((s) => s.onConnect) 
   const selectNode = useCanvasStore((s) => s.selectNode) 
   const selectEdge = useCanvasStore((s) => s.selectEdge) 
   const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId) 
   const addNode = useCanvasStore((s) => s.addNode) 
 
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
   }, [selectNode, selectEdge, setEditingNodeId]) 
 
   const onDragOver = useCallback((event: React.DragEvent) => { 
     event.preventDefault() 
     event.dataTransfer.dropEffect = 'move' 
   }, []) 
 
   const onDrop = useCallback( 
     (event: React.DragEvent) => { 
       event.preventDefault() 
       const type = event.dataTransfer.getData('shapeType') 
       if (!type) return 
       const position = screenToFlowPosition({ x: event.clientX, y: event.clientY }) 
       addNode(type, position) 
     }, 
     [screenToFlowPosition, addNode], 
   ) 
 
   const onNodeDragStop = useCallback(() => { 
     // When a node stops moving, we force an update to the workspace store 
     // This will trigger the useEffect in WorkspacePage to mark the diagram as unsaved 
     // and provide fresh data for the next AI chat. 
     const { nodes, edges } = useCanvasStore.getState() 
     
     // Dispatch a custom event to notify WorkspacePage that nodes have moved 
     window.dispatchEvent(new CustomEvent('canvas-data-change', { 
       detail: { nodes, edges } 
     })) 
   }, []) 
 
   return ( 
     <div ref={reactFlowWrapper} className="w-full h-full relative"> 
       <ReactFlow 
         nodes={nodes} 
         edges={edges} 
         onNodesChange={onNodesChange as OnNodesChange} 
         onEdgesChange={onEdgesChange as OnEdgesChange} 
         onConnect={onConnect as OnConnect} 
         onNodeClick={onNodeClick} 
         onNodeDoubleClick={onNodeDoubleClick} 
         onEdgeClick={onEdgeClick} 
         onPaneClick={onPaneClick} 
         onDragOver={onDragOver} 
         onDrop={onDrop} 
         onNodeDragStop={onNodeDragStop} 
         nodeTypes={stableNodeTypes} 
         edgeTypes={stableEdgeTypes} 
         defaultEdgeOptions={{ type: 'associationEdge', zIndex: 5 }} 
         connectionMode={ConnectionMode.Loose} 
         connectionRadius={20} 
         connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2.5 }} 
         snapToGrid 
         snapGrid={[15, 15]} 
         fitView 
         deleteKeyCode="Delete" 
         proOptions={{ hideAttribution: true }} 
         className="react-flow-canvas" 
       > 
         <MarkerDefs /> 
         <Background color="#f0f0f0" gap={20} /> 
         <Controls /> 
         <MiniMap 
           nodeStrokeColor="#666" 
           nodeColor="#fff" 
           nodeBorderRadius={2} 
           style={{ bottom: 10, right: 10 }} 
         /> 
       </ReactFlow> 
     </div> 
   ) 
 } 
 
 export function GraphCanvas() { 
   return ( 
     <ReactFlowProvider> 
       <GraphCanvasInner /> 
     </ReactFlowProvider> 
   ) 
 } 
