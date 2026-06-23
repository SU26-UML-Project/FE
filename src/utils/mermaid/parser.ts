import { nanoid } from 'nanoid'
import type { ParseResult } from './types'

export function parseMermaid(code: string): ParseResult {
  const type = detectType(code)
  const name = extractTitle(code) || 'Imported Diagram'

  try {
    switch (type) {
      case 'class':
        return parseClassDiagram(code, name)
      case 'useCase':
        return parseUseCaseDiagram(code, name)
      default:
        return parseGenericDiagram(code, name, type)
    }
  } catch (e) {
    console.error(`MermaidParser error for ${type}:`, e)
    return { nodes: [], edges: [], name, type }
  }
}

function detectType(code: string): string {
  const firstLine = code.trim().split('\n')[0].trim()
  if (firstLine.startsWith('classDiagram')) return 'class'
  if (firstLine.startsWith('useCaseDiagram')) return 'useCase'
  if (firstLine.startsWith('sequenceDiagram')) return 'sequence'
  if (firstLine.startsWith('stateDiagram-v2')) return 'stateDiagram'
  if (firstLine.startsWith('flowchart')) return 'flowchart-v2'
  if (firstLine.startsWith('graph ')) return 'flowchart'
  if (firstLine.startsWith('erDiagram')) return 'er'
  if (firstLine.startsWith('C4Context') || firstLine.startsWith('C4Container')
    || firstLine.startsWith('C4Component') || firstLine.startsWith('C4Code')) return 'c4'
  if (firstLine.match(/^(classDiagram|usecaseDiagram|stateDiagram|erDiagram)/i)) {
    const m = firstLine.match(/^(\w+)/)
    return m ? m[1].toLowerCase() : 'unknown'
  }
  return 'unknown'
}

function extractTitle(code: string): string {
  const lines = code.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('---')) continue
    if (trimmed.startsWith('title ')) {
      return trimmed.replace(/^title\s+/, '').replace(/"/g, '')
    }
  }
  return ''
}

/* ── classDiagram parser ── */
function parseClassDiagram(code: string, name: string): ParseResult {
  const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('classDiagram'))
  const nodes: Node[] = []
  const edges: Edge[] = []
  const classMap = new Map<string, { label: string; stereotype?: string; attrs: string[]; methods: string[] }>()
  const relationships: { src: string; dst: string; type: string; label?: string; arrow: string }[] = []

  let currentClass: string | null = null

  for (const line of lines) {
    if (line.startsWith('class ')) {
      const m = line.match(/^class\s+(\S+)\s*(?:<<(\w+)>>)?\s*\{?$/)
      if (m) {
        currentClass = m[1]
        if (!classMap.has(currentClass)) {
          classMap.set(currentClass, { label: currentClass, stereotype: m[2] || undefined, attrs: [], methods: [] })
        }
        continue
      }
    }

    if (currentClass) {
      if (line === '}') { currentClass = null; continue }
      if (line.startsWith('<<') && line.endsWith('>>')) {
        const stereo = line.replace(/^<<|>>$/g, '')
        const entry = classMap.get(currentClass)
        if (entry) entry.stereotype = stereo
        continue
      }
      if (line.startsWith('{')) continue
      const isMethod = line.includes('(') || line.startsWith('+') || line.startsWith('#') || line.startsWith('-')
      if (isMethod) {
        const entry = classMap.get(currentClass)
        if (entry) entry.methods.push(line.replace(/[;{}]$/, ''))
      } else if (line) {
        const entry = classMap.get(currentClass)
        if (entry) entry.attrs.push(line.replace(/[;{}]$/, ''))
      }
      continue
    }

    // Handle class with stereotype in one line: ClassName <<stereotype>>
    const inlineStereo = line.match(/^(\S+)\s*<<(\w+)>>\s*$/)
    if (inlineStereo) {
      if (!classMap.has(inlineStereo[1])) {
        classMap.set(inlineStereo[1], { label: inlineStereo[1], stereotype: inlineStereo[2], attrs: [], methods: [] })
      }
      continue
    }

    // Handle simple class declaration: ClassName
    const simpleClass = line.match(/^([A-Za-z_]\w*)\s*$/)
    if (simpleClass && !['title', 'namespace'].includes(simpleClass[1]) && !line.includes('-->') && !line.includes('--')) {
      if (!classMap.has(simpleClass[1])) {
        classMap.set(simpleClass[1], { label: simpleClass[1], attrs: [], methods: [] })
      }
      continue
    }

    // Handle edge: Class1 --> Class2 : label
    const edgeMatch = line.match(/^(\S+)\s*(-->|\.\.>|--\|>|\.\.\|>|<\|--|<\|\.\.)\s*(\S+)\s*(?::\s*(.+))?$/)
    if (edgeMatch) {
      const [, src, arrow, dst, label] = edgeMatch
      relationships.push({ src, dst, type: mapArrowToEdgeType(arrow), label, arrow })
      if (!classMap.has(src)) classMap.set(src, { label: src, attrs: [], methods: [] })
      if (!classMap.has(dst)) classMap.set(dst, { label: dst, attrs: [], methods: [] })
    }
  }

  for (const [id, data] of classMap) {
    const nodeId = nanoid(6)
    nodes.push({
      id: nodeId,
      type: 'classNode',
      position: { x: 0, y: 0 },
      data: {
        type: 'classNode',
        label: data.label,
        stereotype: data.stereotype,
        attributes: data.attrs,
        methods: data.methods,
      },
    })
    classMap.set(id, { ...data, _nodeId: nodeId } as any)
  }

  for (const rel of relationships) {
    const srcEntry = classMap.get(rel.src) as any
    const dstEntry = classMap.get(rel.dst) as any
    if (srcEntry?._nodeId && dstEntry?._nodeId) {
      edges.push({
        id: nanoid(6),
        source: srcEntry._nodeId,
        target: dstEntry._nodeId,
        type: `${rel.type}Edge`,
        data: { label: rel.label },
      })
    }
  }

  return { nodes, edges, name, type: 'classDiagram' }
}

function mapArrowToEdgeType(arrow: string): string {
  switch (arrow) {
    case '--|>': case '<|--': return 'inheritance'
    case '..|>': case '<|..': return 'realization'
    case '-->': case '<--': return 'association'
    case '..>': case '<..': return 'dependency'
    default: return 'association'
  }
}

/* ── useCaseDiagram parser ── */
function parseUseCaseDiagram(code: string, name: string): ParseResult {
  const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('useCaseDiagram'))
  const nodes: Node[] = []
  const edges: Edge[] = []
  const actorMap = new Map<string, string>()
  const ucMap = new Map<string, string>()

  function getOrCreateActor(name: string): string {
    if (actorMap.has(name)) return actorMap.get(name)!
    const id = nanoid(6)
    actorMap.set(name, id)
    nodes.push({ id, type: 'actorNode', position: { x: 0, y: 0 }, data: { type: 'actorNode', label: name } })
    return id
  }

  function getOrCreateUseCase(name: string): string {
    if (ucMap.has(name)) return ucMap.get(name)!
    const id = nanoid(6)
    ucMap.set(name, id)
    nodes.push({ id, type: 'useCaseNode', position: { x: 0, y: 0 }, data: { type: 'useCaseNode', label: name } })
    return id
  }

  for (const line of lines) {
    if (line.startsWith('actor ')) {
      const m = line.match(/^actor\s+(.+?)(?:\s+as\s+(\w+))?\s*$/)
      if (m) getOrCreateActor(m[2] || m[1])
      continue
    }

    if (line.startsWith('usecase ') || line.startsWith('useCase ')) {
      const m = line.match(/^(?:usecase|useCase)\s+(.+?)(?:\s+as\s+(\w+))?\s*$/)
      if (m) getOrCreateUseCase(m[2] || m[1])
      continue
    }

    const parenMatch = line.match(/^\((.+?)\)\s*$/)
    if (parenMatch) {
      getOrCreateUseCase(parenMatch[1])
      continue
    }

    const edgeMatch = line.match(/^(\S+)\s*(-->|\.\.>)\s*(\((.+?)\)|(\S+))\s*(?::\s*(.+))?$/)
    if (edgeMatch) {
      const src = edgeMatch[1]
      const dst = edgeMatch[4] || edgeMatch[5]
      const label = edgeMatch[6]
      const srcId = getOrCreateActor(src)
      const dstId = getOrCreateUseCase(dst)
      edges.push({
        id: nanoid(6),
        source: srcId,
        target: dstId,
        type: 'associationEdge',
        data: { label },
      })
    }

    const ucEdge = line.match(/^\((.+?)\)\s*(-->|\.\.>)\s*\((.+?)\)\s*(?::\s*(.+))?$/)
    if (ucEdge) {
      const [, src, , dst, label] = ucEdge
      const srcId = getOrCreateUseCase(src)
      const dstId = getOrCreateUseCase(dst)
      edges.push({
        id: nanoid(6),
        source: srcId,
        target: dstId,
        type: 'associationEdge',
        data: { label },
      })
    }
  }

  return { nodes, edges, name, type: 'useCaseDiagram' }
}

/* ── Generic diagram parser (fallback for sequence, flowchart, state, ER, C4) ── */
function parseGenericDiagram(code: string, name: string, diagramType: string): ParseResult {
  const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith(diagramType))
  const nodes: Node[] = []
  const edges: Edge[] = []
  const nodeMap = new Map<string, string>()

  function getOrCreateNode(key: string, label: string, shape?: string): string {
    if (nodeMap.has(key)) return nodeMap.get(key)!
    const id = nanoid(6)
    const sourceType = diagramType
    nodeMap.set(key, id)
    nodes.push({
      id,
      type: 'genericNode',
      position: { x: 0, y: 0 },
      data: { type: shape || 'process', label, sourceType },
    })
    return id
  }

  for (const line of lines) {
    if (line.startsWith('title ')) continue

    // Sequence: Actor->>Participant: message
    const seqMatch = line.match(/^(\S+)\s*(->>|=>>|->|-x|-->>)\s*(\S+)\s*(?::\s*(.+))?$/)
    if (seqMatch) {
      const [, src, , dst, label] = seqMatch
      const srcId = getOrCreateNode(src, src, 'lifeline')
      const dstId = getOrCreateNode(dst, dst, 'lifeline')
      edges.push({
        id: nanoid(6), source: srcId, target: dstId,
        type: 'associationEdge',
        data: { label: label || '' },
      })
      continue
    }

    // Flowchart: A[Label] --> B{Decision}
    const flowMatch = line.match(/^(\S+?)(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}|\[\(([^)]*)\)\]|>([^>]*)\]?)?\s*(-->|==>|-.->)\s*(.+)/)
    if (flowMatch) {
      const srcKey = flowMatch[1]
      const srcLabel = flowMatch[2] || flowMatch[3] || flowMatch[4] || flowMatch[5] || flowMatch[6] || srcKey
      const srcShape = flowMatch[2] ? 'process' : flowMatch[3] ? 'process' : flowMatch[4] ? 'decision' : 'process'
      const rest = flowMatch[8]
      const dstLabel = rest.replace(/\s*:\s*.+$/, '')
      const dstKey = dstLabel.replace(/[\[\]\(\)\{\}]/g, '')
      const srcId = getOrCreateNode(srcKey, srcLabel, srcShape)
      const dstId = getOrCreateNode(dstKey, dstLabel, 'process')
      edges.push({
        id: nanoid(6), source: srcId, target: dstId,
        type: 'associationEdge',
      })
      continue
    }

    // A --> B (simple)
    const simpleArrow = line.match(/^(\S+)\s*(-->|==>|\.\.>)\s*(\S+)\s*(?::\s*(.+))?$/)
    if (simpleArrow) {
      const [, src, , dst, label] = simpleArrow
      const srcId = getOrCreateNode(src, src, 'process')
      const dstId = getOrCreateNode(dst, dst, 'process')
      edges.push({
        id: nanoid(6), source: srcId, target: dstId,
        type: 'associationEdge',
        data: { label: label || '' },
      })
      continue
    }

    // C4: Person(alias, "Label", "Description")
    const c4Match = line.match(/^(Person|System|System_Ext|Container|Component|Code)\s*\(\s*(\w+)\s*,\s*"([^"]+)"\s*(?:,\s*"([^"]+)")?\s*(?:,\s*"([^"]+)")?\s*\)/)
    if (c4Match) {
      const [, type, alias, label, tech, desc] = c4Match
      getOrCreateNode(alias, label, 'c4')
      // Update the data with C4 info
      const id = nodeMap.get(alias)
      if (id) {
        const node = nodes.find(n => n.id === id)
        if (node) {
          (node.data as any).stereotype = type
          ;(node.data as any).sections = [
            ...(tech ? [{ content: `[${tech}]`, className: 'tech' }] : []),
            ...(desc ? [{ content: desc, className: 'desc' }] : []),
          ]
        }
      }
      continue
    }

    // C4 relationship: Rel(alias1, alias2, "Label")
    const c4Rel = line.match(/^Rel\s*\(\s*(\w+)\s*,\s*(\w+)\s*(?:,\s*"([^"]+)")?\s*\)/)
    if (c4Rel) {
      const [, src, dst, label] = c4Rel
      const srcId = nodeMap.get(src)
      const dstId = nodeMap.get(dst)
      if (srcId && dstId) {
        edges.push({
          id: nanoid(6), source: srcId, target: dstId,
          type: 'associationEdge',
          data: { label: label || '' },
        })
      }
      continue
    }
  }

  return { nodes, edges, name, type: diagramType }
}
