import { useCallback } from 'react'
import { useReactFlow, type Node, type Edge } from '@xyflow/react'
import * as dagre from '@dagrejs/dagre'

export const useAutoLayout = () => {
  const getLayoutedElements = useCallback((nodes: Node[], edges: Edge[], type: string = 'activity', direction?: string) => {
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))

    // Quyết định hướng layout dựa trên loại biểu đồ nếu không có hướng chỉ định
    let finalDir = direction;
    if (!finalDir) {
      finalDir = (type === 'sequence') ? 'LR' : 'TB';
    }

    dagreGraph.setGraph({ 
      rankdir: finalDir,
      ranksep: type === 'sequence' ? 100 : 80, 
      nodesep: type === 'usecase' ? 40 : 60,
      marginx: 40,
      marginy: 40
    })

    nodes.forEach((node) => {
      // Xác định kích thước mặc định dựa trên loại node để layout chính xác hơn
      // Đồng bộ chính xác với lib/diagrams.ts
      let w = 150;
      let h = 100;

      switch (node.type) {
        case 'actor': w = 76; h = 124; break;
        case 'usecase': w = 170; h = 82; break;
        case 'cls': 
          if ((node.data as any)?.stereotype?.includes('interface')) {
            w = 200; h = 104;
          } else {
            w = 210; h = 150;
          }
          break;
        case 'action': w = 150; h = 54; break;
        case 'decision': w = 150; h = 104; break;
        case 'start': w = 38; h = 38; break;
        case 'final': w = 40; h = 40; break;
        case 'note': w = 170; h = 90; break;
        case 'lifeline': w = 150; h = 340; break;
        case 'package': w = 360; h = 240; break;
        case 'fork': w = 130; h = 12; break;
        case 'component': w = 180; h = 92; break;
      }

      const finalW = node.width || w;
      const finalH = node.height || h;
      
      dagreGraph.setNode(node.id, { width: finalW, height: finalH });
    })

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    const newNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)
      
      // Lấy lại width/height đã dùng để layout
      // Đồng bộ chính xác với lib/diagrams.ts
      let w = 150;
      let h = 100;
      switch (node.type) {
        case 'actor': w = 76; h = 124; break;
        case 'usecase': w = 170; h = 82; break;
        case 'cls': 
          if ((node.data as any)?.stereotype?.includes('interface')) {
            w = 200; h = 104;
          } else {
            w = 210; h = 150;
          }
          break;
        case 'action': w = 150; h = 54; break;
        case 'decision': w = 150; h = 104; break;
        case 'start': w = 38; h = 38; break;
        case 'final': w = 40; h = 40; break;
        case 'note': w = 170; h = 90; break;
        case 'lifeline': w = 150; h = 340; break;
        case 'package': w = 360; h = 240; break;
        case 'fork': w = 130; h = 12; break;
        case 'component': w = 180; h = 92; break;
      }

      const finalW = (node.width as number) || w;
      const finalH = (node.height as number) || h;
      
      // Bảo vệ: Nếu dagre không tính toán được vị trí cho node này, giữ nguyên vị trí cũ hoặc mặc định
      if (!nodeWithPosition) {
        return node;
      }

      return {
        ...node,
        position: {
          x: nodeWithPosition.x - finalW / 2,
          y: nodeWithPosition.y - finalH / 2,
        },
        width: finalW,
        height: finalH,
        style: { ...(node.style as object), width: finalW, height: finalH },
      }
    })

    return { nodes: newNodes, edges }
  }, [])

  return { getLayoutedElements }
}
