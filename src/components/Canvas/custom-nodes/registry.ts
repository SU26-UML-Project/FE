import { ClassNode } from './ClassNode'
import { InterfaceNode } from './InterfaceNode'
import { UseCaseNode } from './UseCaseNode'
import { ActorNode } from './ActorNode'
import { InitialNode } from './InitialNode'
import { FinalNode } from './FinalNode'
import { DecisionNode } from './DecisionNode'
import { StateNode } from './StateNode'
import { ActionNode } from './ActionNode'
import { ForkJoinNode } from './ForkJoinNode'

export const nodeTypes = {
  classNode: ClassNode,
  interfaceNode: InterfaceNode,
  useCaseNode: UseCaseNode,
  actorNode: ActorNode,
  initialNode: InitialNode,
  finalNode: FinalNode,
  decisionNode: DecisionNode,
  stateNode: StateNode,
  actionNode: ActionNode,
  forkJoinNode: ForkJoinNode,
}
