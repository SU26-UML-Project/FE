# Phase 2 — Dia-Canvas (React Flow Canvas)

## Mục tiêu

Xây dựng canvas UML thay thế draw.io embed bằng **React Flow**, với trọng tâm:
- Canvas kéo-thả trực quan (4 loại UML shape phổ biến)
- **Import Mermaid code do AI sinh** (dùng `mermaid.parse()` AST → React Flow nodes/edges)
- **Export ngược lại Mermaid** → copy ra ngoài
- 6 loại custom UML edges
- Undo/Redo qua zundo
- Save/Load localStorage

---

## Routes

| Route | Component | Notes |
|---|---|---|
| `/canvas` | CanvasEditor (mới) | Thay thế draw.io canvas cũ, làm trên feature branch |
| `/canvas?import=<mermaid>` | CanvasEditor | Import Mermaid từ query param (AI gọi thẳng) |
| `/canvas?id=xxx` | CanvasEditor | Load diagram từ localStorage |

---

## File structure

```
src/
├── stores/
│   └── canvasStore.ts               ← Zustand + zundo + immer
│
├── components/Canvas/
│   ├── CanvasEditor.tsx              ← Layout chính
│   ├── GraphCanvas.tsx               ← ReactFlow wrapper + events
│   ├── CanvasToolbar.tsx             ← Undo/Redo/Zoom/Save/Export + Import
│   ├── ShapePanel.tsx                ← Config-driven, SVG preview 80×50
│   ├── PropsPanel.tsx                ← Strategy pattern qua registry
│   ├── EdgeTypeToolbar.tsx           ← 6 nút chọn edge type
│   ├── MarkerDefs.tsx                ← SVG <defs> cho ◆/◇/▼/▷
│   ├── MermaidImportDialog.tsx       ← Modal paste Mermaid → Import
│   ├── SaveIndicator.tsx             ← "Saving..." / "Saved"
│   ├── CodePanel.tsx                 ← Export Mermaid (rewire), giữ tab PlantUML/XML
│   ├── nodes/
│   │   ├── registry.ts              ← nodeTypes lookup
│   │   ├── BaseNode.tsx             ← Shared: hover state + Handle wrapper
│   │   ├── ClassNode.tsx            ← 3 compartments
│   │   ├── InterfaceNode.tsx        ← «interface» + methods
│   │   ├── UseCaseNode.tsx          ← Ellipse
│   │   ├── ActorNode.tsx            ← Stick figure SVG
│   │   └── generic/
│   │       ├── GenericNode.tsx      ← 10 dòng, gọi factory
│   │       ├── factory.tsx          ← Map type → shape component
│   │       └── shapes/
│   │           ├── ProcessShape.tsx  ← flowchart process
│   │           ├── DiamondShape.tsx  ← decision
│   │           ├── LifelineShape.tsx ← sequence lifeline
│   │           ├── C4Shape.tsx       ← C4 context/container/code
│   │           └── ...
│   └── edges/
│       ├── AssociationEdge.tsx       ──▶
│       ├── InheritanceEdge.tsx       ──▶ closed triangle
│       ├── RealizationEdge.tsx       ╌╌▷ open triangle dashed
│       ├── CompositionEdge.tsx       ◆──▶ filled diamond + arrow
│       ├── AggregationEdge.tsx       ◇──▶ empty diamond + arrow
│       ├── DependencyEdge.tsx        ╌╌▶ dashed arrow
│       └── index.ts
│
├── utils/
│   ├── projectStore.ts               ← localStorage CRUD
│   ├── templateLoader.ts
│   ├── exportUtils.ts                ← PNG export
│   └── mermaid/
│       ├── parser.ts                 ← Mermaid AST → React Flow nodes/edges
│       ├── serializer.ts             ← React Flow nodes/edges → Mermaid string
│       ├── types.ts                  ← AST type definitions
│       └── layout.ts                 ← dagre auto-layout (size động)
│
└── types/
    ├── canvas.ts                     ← NodeData unions, UMLNodeType
    └── project.ts                    ← Project
```

---

## Store — Zustand + zundo + immer

```ts
import { create } from 'zustand'
import { temporal } from 'zundo'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { Node, Edge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'

type EdgeType = 'association' | 'inheritance' | 'realization' | 'composition' | 'aggregation' | 'dependency'

interface CanvasState {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  selectedEdgeType: EdgeType
  diagramName: string
  diagramType: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'

  onNodesChange: (changes: any) => void
  onEdgesChange: (changes: any) => void
  onConnect: (connection: any) => void
  addNode: (type: string, position: { x: number; y: number }) => void
  selectNode: (id: string | null) => void
  setNodeData: (id: string, patch: Partial<any>) => void
  setDiagramName: (name: string) => void
  setDiagramType: (type: string) => void
  setSelectedEdgeType: (type: EdgeType) => void
  loadDiagram: (nodes: Node[], edges: Edge[], name: string, type?: string) => void
  clearCanvas: () => void
}

export const useCanvasStore = create<CanvasState>()(
  temporal(
    immer((set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeType: 'association',
      diagramName: 'Untitled Diagram',
      diagramType: 'custom',
      saveStatus: 'idle',

      onNodesChange: (changes) => {
        changes.forEach(c => { if (c.type === 'position' && c.dragging) get().temporal.pause() })
        set(state => { state.nodes = applyNodeChanges(changes, state.nodes) })
        changes.forEach(c => { if (c.type === 'position' && c.dragging === false) get().temporal.resume() })
      },

      onEdgesChange: (changes) =>
        set(state => { state.edges = applyEdgeChanges(changes, state.edges) }),

      onConnect: (connection) =>
        set(state => { state.edges.push({ ...connection, type: `${state.selectedEdgeType}Edge` }) }),

      addNode: (type, position) => {
        set(state => { state.nodes.push({ id: nanoid(6), type, position, data: defaultNodeData(type) }) })
      },

      selectNode: (id) => set(state => { state.selectedNodeId = id }),

      setNodeData: (id, patch) =>
        set(state => { const n = state.nodes.find(n => n.id === id); if (n) Object.assign(n.data, patch) }),

      setDiagramName: (name) => set(state => { state.diagramName = name }),
      setDiagramType: (type) => set(state => { state.diagramType = type }),
      setSelectedEdgeType: (type) => set(state => { state.selectedEdgeType = type }),

      loadDiagram: (nodes, edges, name, type = 'custom') =>
        set(state => { state.nodes = nodes; state.edges = edges; state.diagramName = name; state.diagramType = type }),

      clearCanvas: () =>
        set(state => { state.nodes = []; state.edges = []; state.selectedNodeId = null; state.diagramType = 'custom' }),
    })),
    {
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges, diagramType: state.diagramType }),
      limit: 50,
    }
  )
)
```

---

## Custom edges — 6 loại

| Edge | markerEnd | markerStart | Style |
|---|---|---|---|
| **AssociationEdge** | `url(#arrow)` | none | Solid |
| **InheritanceEdge** | `url(#inheritance)` | none | Solid |
| **RealizationEdge** | `url(#realization)` | none | Dashed |
| **CompositionEdge** | `url(#arrow)` | `url(#composition)` | Solid |
| **AggregationEdge** | `url(#arrow)` | `url(#aggregation)` | Solid |
| **DependencyEdge** | `url(#arrow)` | none | Dashed |

Tất cả dùng `getSmoothStepPath({ borderRadius: 0 })`. MarkerStart dùng `orient="auto-start-reverse"` để không bị ngược diamond.

### MarkerDefs

```tsx
export function MarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <marker id="inheritance" markerWidth="16" markerHeight="12"
                viewBox="0 0 16 12" refX="16" refY="6" orient="auto">
          <polygon points="0,0 16,6 0,12" fill="#000" />
        </marker>
        <marker id="realization" markerWidth="16" markerHeight="12"
                viewBox="0 0 16 12" refX="16" refY="6" orient="auto">
          <polygon points="0,0 16,6 0,12" fill="none" stroke="#000" strokeWidth="1.5" />
        </marker>
        <marker id="composition" markerWidth="20" markerHeight="20"
                viewBox="-10 -10 20 20" refX="0" refY="0" orient="auto-start-reverse">
          <polygon points="0,-8 8,0 0,8 -8,0" fill="#000" />
        </marker>
        <marker id="aggregation" markerWidth="20" markerHeight="20"
                viewBox="-10 -10 20 20" refX="0" refY="0" orient="auto-start-reverse">
          <polygon points="0,-8 8,0 0,8 -8,0" fill="#fff" stroke="#000" strokeWidth="1.5" />
        </marker>
        <marker id="arrow" markerWidth="14" markerHeight="10"
                viewBox="0 0 14 10" refX="14" refY="5" orient="auto">
          <polygon points="0,0 14,5 0,10" fill="#000" />
        </marker>
      </defs>
    </svg>
  )
}
```

---

## Nodes — 4 native + GenericNode factory

### BaseNode — shared

```tsx
export function BaseNode({ children, className, showHandles = true }: Props) {
  const [isHover, setIsHover] = useState(false)
  return (
    <div className={className} onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
      {children}
      {showHandles && (
        <>
          {[Position.Right, Position.Left, Position.Top, Position.Bottom].map(pos => (
            <Handle key={pos} type={pos === Position.Left || pos === Position.Bottom ? 'target' : 'source'}
                    position={pos} isConnectable={isHover} style={{ opacity: isHover ? 1 : 0 }} />
          ))}
        </>
      )}
    </div>
  )
}
```

### GenericNode — Factory pattern

```tsx
// nodes/generic/factory.tsx
import { ProcessShape } from './shapes/ProcessShape'
import { DiamondShape } from './shapes/DiamondShape'
import { LifelineShape } from './shapes/LifelineShape'
import { C4Shape } from './shapes/C4Shape'

export const shapeRenderers: Record<string, React.ComponentType<GenericNodeData>> = {
  'process': ProcessShape,
  'decision': DiamondShape,
  'lifeline': LifelineShape,
  'c4': C4Shape,
  // Thêm sau: 'state': StateShape, ...
}

// nodes/generic/GenericNode.tsx
function GenericNode({ data }: NodeProps<GenericNodeData>) {
  const Shape = shapeRenderers[data.type] || shapeRenderers['process']
  return <BaseNode className="generic-node"><Shape data={data} /></BaseNode>
}
```

### NodeData union

```ts
type UMLNodeData = ClassNodeData | InterfaceNodeData | UseCaseNodeData | ActorNodeData | GenericNodeData

interface GenericNodeData {
  type: string           // 'process' | 'decision' | 'lifeline' | 'c4' | 'state' | ...
  label: string
  stereotype?: string
  sections?: { content: string; className?: string }[]
  color?: string
  sourceType?: string    // Mermaid type gốc để export
}
```

### Registry

```ts
export const nodeTypes = {
  classNode: ClassNode,
  interfaceNode: InterfaceNode,
  useCaseNode: UseCaseNode,
  actorNode: ActorNode,
  genericNode: GenericNode,
}
```

---

## ShapePanel — 4 shape, SVG preview draw.io style

```ts
const SHAPE_CONFIG = [
  {
    type: 'classNode', label: 'Class', group: 'UML',
    preview: <svg viewBox="0 0 80 50" width="80" height="50">
      <rect x="1" y="1" width="78" height="14" fill="#fff" stroke="#000" strokeWidth="1.5" rx="1" />
      <rect x="1" y="16" width="78" height="14" fill="#fff" stroke="#000" strokeWidth="1.5" />
      <rect x="1" y="31" width="78" height="18" fill="#fff" stroke="#000" strokeWidth="1.5" />
      <text x="40" y="11" textAnchor="middle" fontSize="7" fill="#666">«entity»</text>
      <text x="40" y="25" textAnchor="middle" fontSize="8" fontWeight="bold">ClassName</text>
    </svg>,
    shortcut: 'C',
  },
  { type: 'interfaceNode', label: 'Interface', group: 'UML',
    preview: <svg viewBox="0 0 80 50" width="80" height="50">...«interface»...</svg> },
  { type: 'useCaseNode', label: 'Use Case', group: 'UML',
    preview: <svg viewBox="0 0 80 50" width="80" height="50">...ellipse...</svg> },
  { type: 'actorNode', label: 'Actor', group: 'UML',
    preview: <svg viewBox="0 0 80 50" width="80" height="50">...stickman...</svg> },
]
```

Drag & drop: `onDragStart` → `setData('shapeType', type)` + `setDragImage(svg, 40, 25)`.
CSS: width 220px, `#f8f9fa`, `cursor: grab`, hover `#e9ecef`.

---

## PropsPanel — Strategy pattern

```ts
const NODE_FORM_REGISTRY = {
  classNode: ClassNodeForm,
  interfaceNode: InterfaceNodeForm,
  useCaseNode: UseCaseNodeForm,
  actorNode: ActorNodeForm,
  genericNode: GenericNodeForm,
}
```

Chỉ selector node đang edit: `useCanvasStore(s => s.nodes.find(n => n.id === s.selectedNodeId))`.

---

## MermaidParser — Dùng `mermaid.parse()` AST

```ts
// utils/mermaid/parser.ts
import mermaid from 'mermaid'

export interface ParseResult {
  nodes: Node[]
  edges: Edge[]
  name: string
  type: string
}

export async function parseMermaid(code: string): Promise<ParseResult> {
  // Bước 1: Dùng AST của thư viện mermaid (không tự viết lexer/parser)
  const { ast } = await mermaid.parse(code)

  // Bước 2: Map AST → React Flow nodes/edges
  // AST structure khác nhau theo diagram type, xác định type trước
  const diagramType = detectType(ast)

  switch (diagramType) {
    case 'classDiagram':
      return mapClassDiagram(ast)
    case 'useCaseDiagram':
      return mapUseCaseDiagram(ast)
    case 'sequenceDiagram':
      return mapSequenceDiagram(ast)
    case 'stateDiagram':
      return mapStateDiagram(ast)
    case 'flowchart':
      return mapFlowchart(ast)
    case 'erDiagram':
      return mapERDiagram(ast)
    case 'C4Context': case 'C4Container': case 'C4Component': case 'C4Code':
      return mapC4(ast, diagramType)
    default:
      return mapGeneric(ast, diagramType)
  }
}
```

### dagre layout — kích thước động

```ts
// utils/mermaid/layout.ts
export function estimateNodeSize(node: Node): { width: number; height: number } {
  const d = node.data
  const lines = [d.label, ...(d.attributes || []), ...(d.methods || []), ...((d.sections || []).map(s => s.content))]
  const maxChars = Math.max(...lines.map(l => (l || '').length), 20)
  return {
    width: Math.min(maxChars * 8 + 48, 500),
    height: Math.max(lines.length * 22 + 40, 60),
  }
}

export function applyLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 })

  nodes.forEach(n => {
    const { width, height } = estimateNodeSize(n)
    g.setNode(n.id, { width, height })
  })
  edges.forEach(e => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return nodes.map(n => {
    const pos = g.node(n.id)
    const { width, height } = estimateNodeSize(n)
    return { ...n, position: { x: pos.x - width / 2, y: pos.y - height / 2 }, style: { width, height } }
  })
}
```

---

## MermaidSerializer — Export

```ts
// utils/mermaid/serializer.ts
export function serializeToMermaid(nodes: Node[], edges: Edge[], type: string): string {
  switch (type) {
    case 'classDiagram': return serializeClassDiagram(nodes, edges)
    case 'useCaseDiagram': return serializeUseCaseDiagram(nodes, edges)
    case 'sequenceDiagram': return serializeSequenceDiagram(nodes, edges)
    // ... fallback cho các type còn lại
    default: return serializeClassDiagram(nodes, edges)
  }
}
```

Rewire CodePanel: `getCode('mermaid')` gọi `serializeToMermaid(nodes, edges, diagramType)`.

---

## Vertical Slice — Implementation Order (tổng ~15 ngày)

### Slice 1 — Core: Class Diagram (5 ngày)

| Ngày | Nội dung | Files |
|---|---|---|
| 1 | Cài `@xyflow/react`, `zundo`, `immer`, `nanoid`, `dagre`, `mermaid`. CanvasEditor + GraphCanvas skeleton. Store. MarkerDefs. | `package.json`, `canvasStore.ts`, `CanvasEditor.tsx`, `GraphCanvas.tsx`, `MarkerDefs.tsx` |
| 2 | ClassNode + BaseNode + registry. InheritanceEdge + AssociationEdge. | `nodes/BaseNode.tsx`, `nodes/ClassNode.tsx`, `nodes/registry.ts`, `edges/InheritanceEdge.tsx`, `edges/AssociationEdge.tsx`, `edges/index.ts` |
| 3 | MermaidParser + classDiagram mapper (dùng `mermaid.parse()` AST). | `utils/mermaid/parser.ts`, `utils/mermaid/types.ts` |
| 4 | dagre layout động + MermaidImportDialog. | `utils/mermaid/layout.ts`, `MermaidImportDialog.tsx` |
| 5 | Kiểm thử: kéo Class node + import classDiagram code AI → canvas. Fix bug. | — |

**Kết quả slice 1:** Canvas hoạt động + import được classDiagram từ AI.

### Slice 2 — UseCase + UI (4 ngày)

| Ngày | Nội dung | Files |
|---|---|---|
| 6 | UseCaseNode + ActorNode. RealizationEdge + DependencyEdge. | `nodes/UseCaseNode.tsx`, `nodes/ActorNode.tsx`, `edges/RealizationEdge.tsx`, `edges/DependencyEdge.tsx` |
| 7 | MermaidParser mở rộng: useCaseDiagram mapper. | `utils/mermaid/parser.ts` |
| 8 | ShapePanel: 4 shape SVG preview + kéo-thả draw.io style. | `ShapePanel.tsx` |
| 9 | PropsPanel: 4 form. | `PropsPanel.tsx`, `forms/ClassNodeForm.tsx`, `forms/UseCaseNodeForm.tsx`, `forms/ActorNodeForm.tsx` |

**Kết quả slice 2:** Canvas 4 shape + import classDiagram + useCaseDiagram.

### Slice 3 — Generic: Bắt tất cả diagram (4 ngày)

| Ngày | Nội dung | Files |
|---|---|---|
| 10 | GenericNode + Factory + shapes (ProcessShape, DiamondShape, LifelineShape, C4Shape). CompositionEdge + AggregationEdge. | `nodes/generic/*`, `edges/CompositionEdge.tsx`, `edges/AggregationEdge.tsx` |
| 11 | MermaidParser mở rộng: sequence, state, flowchart, ER, C4 mappers. | `utils/mermaid/parser.ts` |
| 12 | MermaidSerializer: nodes/edges → Mermaid string cho classDiagram + useCaseDiagram + sequence + flowchart. | `utils/mermaid/serializer.ts` |
| 13 | GenericNodeForm trong PropsPanel. Kiểm thử import 7+ loại diagram. | `PropsPanel.tsx`, `forms/GenericNodeForm.tsx` |

**Kết quả slice 3:** Import được toàn bộ 14 UML + C4. Export được Mermaid.

### Slice 4 — Hoàn thiện (2 ngày)

| Ngày | Nội dung | Files |
|---|---|---|
| 14 | EdgeTypeToolbar + CanvasToolbar + SaveIndicator. projectStore localStorage CRUD. Rewire CodePanel. | `EdgeTypeToolbar.tsx`, `CanvasToolbar.tsx`, `SaveIndicator.tsx`, `projectStore.ts`, `CodePanel.tsx` |
| 15 | Route `/canvas` mới. Dashboard load projects. Kiểm thử toàn bộ flow. | `App.tsx`, `UserDashboard.tsx` |

### Slice 5 — Workspace Integration: Multi-sheet Canvas (3 ngày)

Thay thế draw.io iframe trong workspace bằng React Flow canvas, hỗ trợ multiple sheet.

| Ngày | Nội dung | Files |
|---|---|---|
| 16 | **Data model.** Thêm `canvasData: { nodes: Node[]; edges: Edge[]; viewport?: any }` vào `WorkspaceSheet`. Xoá `diagramXml`. | `types/workspace.ts` |
| 17 | **CanvasPanel → React Flow.** Bỏ `CanvasFrame` (draw.io), render `GraphCanvas`. Giữ sheet tabs bar phía trên. Khi chọn sheet: snapshot canvasStore → sheet cũ, load sheet mới vào canvasStore. | `components/Workspace/CavasPanel.tsx`, `components/Canvas/GraphCanvas.tsx` |
| 18 | **Workspace save sync.** Khi save workspace: serialize `canvasStore.nodes/edges` vào `activeSheet.canvasData`. Khi load workspace: render sheet đầu tiên với dữ liệu từ `canvasData`. Xoá `CanvasFrame.tsx`. | `pages/WorkspacePage.tsx`, xoá `components/Canvas/CanvasFrame.tsx` |

**Luồng dữ liệu:**

```
=== CHỌN SHEET ===
User click Sheet 2
  → CanvasPanel: snapshot canvasStore → Sheet 1.canvasData = { nodes, edges }
  → canvasStore.loadDiagram(Sheet 2.canvasData)
  → ReactFlow render Sheet 2

=== SAVE WORKSPACE ===
User nhấn Save (hoặc auto-save)
  → Snapshot canvasStore → activeSheet.canvasData
  → Gửi toàn bộ workspace (kèm tất cả sheets.canvasData) lên API

=== LOAD WORKSPACE ===
WorkspacePage mount
  → Tìm sheet đầu tiên có canvasData
  → canvasStore.loadDiagram(sheet.canvasData)
  → ReactFlow render
```

**Rủi ro & Giải pháp (bổ sung):**

| Rủi ro | Mức | Giải pháp |
|---|---|---|
| Sheet switching bị mất undo history | Medium | Dùng zundo `temporal.getState().clear()` khi switch sheet. Hoặc lưu undo stack riêng mỗi sheet. |
| canvasData JSON kích thước lớn khi nhiều nodes | Low | Giới hạn 200 nodes/sheet. Nén JSON trước khi lưu API nếu cần. |
| Xung đột giữa canvasStore (singleton) và multi-sheet | Medium | Mỗi sheet là 1 lần `loadDiagram()` hoàn toàn mới. Không dùng chung state giữa các sheet.

---

## Data flow tổng thể

```
=== IMPORT (AI → Canvas) ===
AI → Mermaid code
  → ?import= (URL) hoặc User paste dialog
  → mermaid.parse(code) → AST
  → Mapper: AST → nodes[] (type = classNode | genericNode | ...) + edges[]
  → dagre.layout(nodes, edges) với size động
  → store.loadDiagram(nodes, edges, name, type)
  → GraphCanvas re-render

=== MANUAL DRAW (User → Canvas) ===
ShapePanel → drag → store.addNode(nanoid(6), type, position)
EdgeTypeToolbar → chọn → onConnect → store.edges.push({ type: `${selectedEdgeType}Edge` })
PropsPanel → edit → store.setNodeData(id, patch) ← immer mutate

=== EXPORT (Canvas → Mermaid) ===
store.nodes + store.edges + store.diagramType
  → serializeToMermaid(nodes, edges, type)
  → CodePanel tab Mermaid hiển thị
  → User Copy
```

---

## Risks & Mitigation

| Rủi ro | Mức | Giải pháp |
|---|---|---|
| `mermaid.parse()` AST không clean | Medium | Test với code AI thật ngày 1. Nếu không ổn → tự viết parser cho classDiagram + useCaseDiagram (80% nhu cầu) |
| Edge diamond bị ngược (composition/aggregation) | Low | `orient="auto-start-reverse"` trong marker + test với nhiều hướng edge |
| zundo 50 bước đầy RAM | Low | Limit 50 OK cho < 50 nodes. Tối ưu sau nếu cần |
| CodePanel cũ phụ thuộc draw.io data flow | Medium | Giữ UI, chỉ sửa `getCode()` gọi serializer thay vì `return ''` |

---

## Dependencies cần cài

```
npm install @xyflow/react zundo immer nanoid dagre mermaid
npm install -D @types/dagre
```

Zustand đã có sẵn (v5.0.14). html-to-image cài sau nếu cần Export PNG.
