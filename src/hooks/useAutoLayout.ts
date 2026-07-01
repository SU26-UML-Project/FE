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

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)
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

      if (!nodeWithPosition) return node;

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
    });

    // Bước 1: Chuyển vị trí children về relative với absolute position của parent
    let processedNodes = layoutedNodes.map((node) => {
      if (node.parentId) {
        const parent = layoutedNodes.find((n) => n.id === node.parentId);
        if (parent) {
          return {
            ...node,
            position: {
              x: node.position.x - parent.position.x,
              y: node.position.y - parent.position.y,
            },
          };
        }
      }
      return node;
    });

    // Bước 2: Tính toán lại kích thước và vị trí của parent để bao phủ children, 
    // đồng thời dịch chuyển children để có padding đẹp
    const finalNodes = processedNodes.map((node) => {
      if (node.type === 'package') {
        const children = processedNodes.filter((n) => n.parentId === node.id);
        if (children.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          children.forEach((c) => {
            const x = c.position.x;
            const y = c.position.y;
            const w = (c.width as number) || 150;
            const h = (c.height as number) || 100;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w);
            maxY = Math.max(maxY, y + h);
          });

          const padding = 40;
          const headerHeight = 32;
          const newW = Math.max(360, (maxX - minX) + padding * 2);
          const newH = Math.max(240, (maxY - minY) + padding * 2 + headerHeight);

          // Vị trí mới của parent (dịch chuyển để bao bọc các con ở vị trí hiện tại của chúng)
          const newParentX = node.position.x + minX - padding;
          const newParentY = node.position.y + minY - padding - headerHeight;

          return {
            ...node,
            width: newW,
            height: newH,
            position: { x: newParentX, y: newParentY },
            style: { ...(node.style as object), width: newW, height: newH }
          };
        }
      }
      return node;
    });

    // Bước 3: Sau khi parent đã thay đổi vị trí/kích thước, 
    // ta phải cập nhật lại tọa độ relative của children để chúng nằm đúng trong padding
    const adjustedNodes = finalNodes.map((node) => {
      if (node.parentId) {
        const parent = finalNodes.find((n) => n.id === node.parentId);
        const originalNode = processedNodes.find(n => n.id === node.id);
        
        if (parent && originalNode) {
          // Tìm bounding box gốc của các con để biết chúng đã bị dịch chuyển bao nhiêu
          const children = processedNodes.filter((n) => n.parentId === parent.id);
          let minX = Infinity, minY = Infinity;
          children.forEach((c) => {
            minX = Math.min(minX, c.position.x);
            minY = Math.min(minY, c.position.y);
          });

          const padding = 40;
          const headerHeight = 32;

          return {
            ...node,
            position: {
              x: originalNode.position.x - minX + padding,
              y: originalNode.position.y - minY + padding + headerHeight,
            }
          };
        }
      }
      return node;
    });

    return { nodes: adjustedNodes, edges }
  }, [])

  return { getLayoutedElements }
}
