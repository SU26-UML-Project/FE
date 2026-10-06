import { useCallback } from 'react'
import { type FlowNode, type FlowEdge, type DiagramType } from '../../types'
import { layoutElements } from '../lib/elkLayout'

export const useAutoLayout = () => {
  const getLayoutedElements = useCallback(
    async (nodes: FlowNode[], edges: FlowEdge[], type: DiagramType = 'activity') => {
      return await layoutElements(nodes, edges, { diagramType: type });
    },
    []
  );

  return { getLayoutedElements };
}
