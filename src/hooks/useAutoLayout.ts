import { useCallback } from 'react'
import { useReactFlow, type Node, type Edge } from '@xyflow/react'
import * as dagre from '@dagrejs/dagre'

export const useAutoLayout = () => {
  const { setNodes, setEdges } = useReactFlow()

  const layout = useCallback((nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))

    const nodeWidth = 180
    const nodeHeight = 120

    dagreGraph.setGraph({ rankdir: direction })

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
    })

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    const newNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      }
    })

    setNodes(newNodes)
    setEdges(edges)
  }, [setNodes, setEdges])

  return { layout }
}
