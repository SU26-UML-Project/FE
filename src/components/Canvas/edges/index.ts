import { minimalistEdgeTypes } from './MinimalistEdges'

export const edgeTypes = {
  // Minimalist edges
  smoothstep: minimalistEdgeTypes.smoothstep,
  bezier: minimalistEdgeTypes.bezier,
  straight: minimalistEdgeTypes.straight,

  // Keep old types for backward compatibility
  associationEdge: minimalistEdgeTypes.smoothstep,
  useCaseAssociationEdge: minimalistEdgeTypes.smoothstep,
  inheritanceEdge: minimalistEdgeTypes.smoothstep,
  realizationEdge: minimalistEdgeTypes.smoothstep,
  compositionEdge: minimalistEdgeTypes.smoothstep,
  aggregationEdge: minimalistEdgeTypes.smoothstep,
  dependencyEdge: minimalistEdgeTypes.smoothstep,
  includeEdge: minimalistEdgeTypes.smoothstep,
  extendEdge: minimalistEdgeTypes.smoothstep,
  controlFlowEdge: minimalistEdgeTypes.smoothstep,
  objectFlowEdge: minimalistEdgeTypes.smoothstep,
}
