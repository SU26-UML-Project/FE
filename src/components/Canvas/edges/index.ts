import { AssociationEdge } from './AssociationEdge'
import { InheritanceEdge } from './InheritanceEdge'
import { RealizationEdge } from './RealizationEdge'
import { CompositionEdge } from './CompositionEdge'
import { AggregationEdge } from './AggregationEdge'
import { DependencyEdge } from './DependencyEdge'
import { IncludeEdge } from './IncludeEdge'
import { ExtendEdge } from './ExtendEdge'
import { UseCaseAssociationEdge } from './UseCaseAssociationEdge'

export const edgeTypes = {
  associationEdge: AssociationEdge,
  useCaseAssociationEdge: UseCaseAssociationEdge,
  inheritanceEdge: InheritanceEdge,
  realizationEdge: RealizationEdge,
  compositionEdge: CompositionEdge,
  aggregationEdge: AggregationEdge,
  dependencyEdge: DependencyEdge,
  includeEdge: IncludeEdge,
  extendEdge: ExtendEdge,
}
