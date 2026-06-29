import { minimalistNodeTypes } from './MinimalistNodes'

export const nodeTypes = {
  // Minimalist nodes
  action: minimalistNodeTypes.action,
  decision: minimalistNodeTypes.decision,
  start: minimalistNodeTypes.start,
  final: minimalistNodeTypes.final,
  fork: minimalistNodeTypes.fork,
  cls: minimalistNodeTypes.cls,
  interface: minimalistNodeTypes.interface,
  component: minimalistNodeTypes.component,
  usecase: minimalistNodeTypes.usecase,
  actor: minimalistNodeTypes.actor,
  lifeline: minimalistNodeTypes.lifeline,
  note: minimalistNodeTypes.note,
  text: minimalistNodeTypes.text,
  package: minimalistNodeTypes.package,

  // Keep old types for backward compatibility during transition if needed
  classNode: minimalistNodeTypes.cls,
  interfaceNode: minimalistNodeTypes.cls,
  useCaseNode: minimalistNodeTypes.usecase,
  actorNode: minimalistNodeTypes.actor,
  systemBoundaryNode: minimalistNodeTypes.package,
  initialNode: minimalistNodeTypes.start,
  finalNode: minimalistNodeTypes.final,
  decisionNode: minimalistNodeTypes.decision,
  stateNode: minimalistNodeTypes.action,
  actionNode: minimalistNodeTypes.action,
  forkJoinNode: minimalistNodeTypes.fork,
}
