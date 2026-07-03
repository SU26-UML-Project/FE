import { BaseEdge } from './BaseEdge' 
 import { UseCaseAssociationEdge } from './UseCaseAssociationEdge' 
 
 export const edgeTypes = { 
   associationEdge: BaseEdge, 
   useCaseAssociationEdge: UseCaseAssociationEdge, 
   inheritanceEdge: BaseEdge, 
   realizationEdge: BaseEdge, 
   compositionEdge: BaseEdge, 
   aggregationEdge: BaseEdge, 
   dependencyEdge: BaseEdge, 
   includeEdge: BaseEdge, 
   extendEdge: BaseEdge, 
   controlFlowEdge: BaseEdge,
   objectFlowEdge: BaseEdge,
 } 
