const fs = require('fs')
const path = require('path')

const TEMPLATES_DIR = path.join(__dirname, '..', 'public', 'templates')

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Generate parent cell + optional child cells (for component icons, etc.)
function emitCell(id, label, style, x, y, w, h, children) {
  const out = [
    `<mxCell id="${id}" value="${esc(label)}" style="${style}" vertex="1" parent="1">` +
      `<mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>` +
    `</mxCell>`
  ]
  if (children) {
    children.forEach((c, ci) => {
      const cid = `${id}_c${ci}`
      const geo = `<mxGeometry height="${c.h}" width="${c.w}" x="${c.x || 0}" as="geometry">` +
        (c.ox !== undefined || c.oy !== undefined ? `<mxPoint x="${c.ox ?? 0}" y="${c.oy ?? 0}" as="offset"/>` : '') +
        `</mxGeometry>`
      out.push(
        `<mxCell id="${cid}" style="${c.s}" vertex="1" parent="${id}">${geo}</mxCell>`
      )
    })
  }
  return out
}

// ─── Shape definitions per UML type ─────────────────────────────────

const COMPONENT_ICON = { s: 'shape=component;jettyWidth=8;jettyHeight=4;', w: 20, h: 20, x: 1, ox: -24, oy: 4 }

const CTX = {
  use_case: {
    byName: {
      'Actor':            { s: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;', w: 30, h: 60 },
      'Use Case':         { s: 'ellipse;whiteSpace=wrap;html=1;fillColor=#e3f2fd;strokeColor=#1976d2;fontColor=#1565c0;overflow=fill;', w: 160, h: 70 },
      'System Boundary':  { s: 'rectangle;rounded=0;whiteSpace=wrap;html=1;dashed=1;fillColor=none;strokeColor=#6b7280;fontColor=#374151;fontStyle=4;', w: 500, h: 300 },
    },
    byType: {
      'Actor':            { s: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;', w: 30, h: 60 },
      'Use Case':         { s: 'ellipse;whiteSpace=wrap;html=1;fillColor=#e3f2fd;strokeColor=#1976d2;fontColor=#1565c0;overflow=fill;', w: 160, h: 70 },
      'System Boundary':  { s: 'rectangle;rounded=0;whiteSpace=wrap;html=1;dashed=1;fillColor=none;strokeColor=#6b7280;fontColor=#374151;fontStyle=4;', w: 500, h: 300 },
    },
    defaultVertex: { s: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#f0f4ff;strokeColor=#4a7cff;fontColor=#333;overflow=hidden;', w: 160, h: 60 },
    edges: {
      'Include':         { s: 'edgeStyle=orthogonalEdgeStyle;html=1;dashed=1;strokeColor=#6b7280;endArrow=open;endSize=8;fontColor=#6b7280;labelBackgroundColor=#fff;exitX=1;exitY=0.5;entryX=0;entryY=0.5;', label: '«include»' },
      'Extend':          { s: 'edgeStyle=orthogonalEdgeStyle;html=1;dashed=1;strokeColor=#6b7280;endArrow=open;endSize=8;fontColor=#6b7280;labelBackgroundColor=#fff;exitX=1;exitY=0.5;entryX=0;entryY=0.5;', label: '«extend»' },
      'Generalization':  { s: 'edgeStyle=orthogonalEdgeStyle;html=1;strokeColor=#6b7280;endArrow=block;endSize=8;fontColor=#6b7280;labelBackgroundColor=#fff;', label: '' },
    },
  },

  class: {
    byName: {
      'Class':     { s: 'swimlane;childLayout=stackLayout;horizontal=1;startSize=30;whiteSpace=wrap;html=1;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;fillColor=#e3f2fd;fontColor=#1565c0;', w: 220, h: 80 },
      'Interface': { s: 'swimlane;childLayout=stackLayout;horizontal=1;startSize=30;whiteSpace=wrap;html=1;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;fillColor=#fff3e0;fontColor=#e65100;fontStyle=2;', w: 220, h: 80 },
      'Object':    { s: 'swimlane;childLayout=stackLayout;horizontal=1;startSize=30;whiteSpace=wrap;html=1;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;fillColor=#f3e5f5;fontColor=#7b1fa2;', w: 220, h: 80 },
    },
    byType: {
      'Class':     { s: 'swimlane;childLayout=stackLayout;horizontal=1;startSize=30;whiteSpace=wrap;html=1;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;fillColor=#e3f2fd;fontColor=#1565c0;', w: 220, h: 80 },
      'Interface': { s: 'swimlane;childLayout=stackLayout;horizontal=1;startSize=30;whiteSpace=wrap;html=1;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;fillColor=#fff3e0;fontColor=#e65100;fontStyle=2;', w: 220, h: 80 },
    },
    defaultVertex: { s: 'swimlane;childLayout=stackLayout;horizontal=1;startSize=30;whiteSpace=wrap;html=1;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;fillColor=#e8eaf6;fontColor=#283593;', w: 220, h: 80 },
    defaultEdge:   { s: 'edgeStyle=orthogonalEdgeStyle;html=1;strokeColor=#6b7280;endArrow=open;endSize=8;fontColor=#6b7280;labelBackgroundColor=#fff;', label: '' },
    edgeKeywords: ['association', 'generalization', 'realization', 'composition', 'aggregation', 'dependency'],
  },

  component: {
    byName: {
      'Component':  { s: 'html=1;dropTarget=0;whiteSpace=wrap;overflow=fill;fillColor=#e8f5e9;strokeColor=#388e3c;fontColor=#2e7d32;', w: 180, h: 80, children: [COMPONENT_ICON] },
      'Interface':  { s: 'ellipse;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#6b7280;fontColor=#374151;overflow=fill;', w: 30, h: 30 },
      'Port':       { s: 'rectangle;whiteSpace=wrap;html=1;fillColor=#6b7280;strokeColor=#374151;', w: 12, h: 12 },
    },
    byType: {
      'Component':  { s: 'html=1;dropTarget=0;whiteSpace=wrap;overflow=fill;fillColor=#e8f5e9;strokeColor=#388e3c;fontColor=#2e7d32;', w: 180, h: 80, children: [COMPONENT_ICON] },
      'Interface':  { s: 'ellipse;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#6b7280;fontColor=#374151;overflow=fill;', w: 30, h: 30 },
    },
    defaultVertex: { s: 'html=1;dropTarget=0;whiteSpace=wrap;overflow=fill;fillColor=#f1f8e9;strokeColor=#558b2f;fontColor=#33691e;', w: 180, h: 80, children: [COMPONENT_ICON] },
    defaultEdge:   { s: 'edgeStyle=orthogonalEdgeStyle;html=1;dashed=1;strokeColor=#6b7280;endArrow=open;endSize=8;fontColor=#6b7280;', label: '' },
    edgeKeywords: ['dependency', 'association'],
  },

  deployment: {
    byName: {
      'Node':       { s: 'shape=umlNode;whiteSpace=wrap;html=1;fillColor=#fce4ec;strokeColor=#c62828;fontColor=#b71c1c;overflow=fill;', w: 200, h: 100 },
      'Artifact':   { s: 'shape=note;whiteSpace=wrap;html=1;fillColor=#fff9c4;strokeColor=#f9a825;fontColor=#f57f17;overflow=fill;', w: 140, h: 60 },
      'Device':     { s: 'shape=cylinder;whiteSpace=wrap;html=1;fillColor=#f3e5f5;strokeColor=#7b1fa2;fontColor=#6a1b9a;overflow=fill;', w: 160, h: 80 },
    },
    byType: {
      'Node':       { s: 'shape=umlNode;whiteSpace=wrap;html=1;fillColor=#fce4ec;strokeColor=#c62828;fontColor=#b71c1c;overflow=fill;', w: 200, h: 100 },
      'Artifact':   { s: 'shape=note;whiteSpace=wrap;html=1;fillColor=#fff9c4;strokeColor=#f9a825;fontColor=#f57f17;overflow=fill;', w: 140, h: 60 },
    },
    defaultVertex: { s: 'shape=umlNode;whiteSpace=wrap;html=1;fillColor=#fff5f5;strokeColor=#ef5350;fontColor=#c62828;overflow=fill;', w: 180, h: 80 },
    defaultEdge:   { s: 'edgeStyle=orthogonalEdgeStyle;html=1;strokeColor=#6b7280;endArrow=open;endSize=8;fontColor=#6b7280;', label: '' },
    edgeKeywords: ['association', 'dependency', 'communication'],
  },

  activity: {
    byName: {
      'Initial Node':      { s: 'ellipse;whiteSpace=wrap;html=1;fillColor=#374151;strokeColor=#374151;', w: 20, h: 20 },
      'Final Node':        { s: 'ellipse;whiteSpace=wrap;html=1;fillColor=#374151;strokeColor=#374151;strokeWidth=4;', w: 24, h: 24 },
      'Action':            { s: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e3f2fd;strokeColor=#1976d2;fontColor=#1565c0;overflow=fill;arcSize=12;', w: 160, h: 50 },
      'Action/Activity':   { s: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e3f2fd;strokeColor=#1976d2;fontColor=#1565c0;overflow=fill;arcSize=12;', w: 160, h: 50 },
      'Decision Node':     { s: 'rhombus;whiteSpace=wrap;html=1;fillColor=#fff3e0;strokeColor=#e65100;fontColor=#e65100;overflow=fill;', w: 100, h: 80 },
      'Merge Node':        { s: 'rhombus;whiteSpace=wrap;html=1;fillColor=#f3e5f5;strokeColor=#7b1fa2;fontColor=#7b1fa2;overflow=fill;', w: 100, h: 80 },
      'Fork':              { s: 'rectangle;whiteSpace=wrap;html=1;fillColor=#374151;strokeColor=#374151;', w: 180, h: 8 },
      'Fork/Join':         { s: 'rectangle;whiteSpace=wrap;html=1;fillColor=#374151;strokeColor=#374151;', w: 180, h: 8 },
      'Join':              { s: 'rectangle;whiteSpace=wrap;html=1;fillColor=#374151;strokeColor=#374151;', w: 180, h: 8 },
      'Swimlane':          { s: 'swimlane;whiteSpace=wrap;html=1;startSize=30;fillColor=#f9fafb;swimlaneFillColor=none;strokeColor=#d1d5db;fontColor=#374151;fontStyle=1;verticalAlign=middle;align=center;', w: 180, h: 400 },
    },
    byType: {
      'Initial Node':      { s: 'ellipse;whiteSpace=wrap;html=1;fillColor=#374151;strokeColor=#374151;', w: 20, h: 20 },
      'Final Node':        { s: 'ellipse;whiteSpace=wrap;html=1;fillColor=#374151;strokeColor=#374151;strokeWidth=4;', w: 24, h: 24 },
      'Action':            { s: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e3f2fd;strokeColor=#1976d2;fontColor=#1565c0;overflow=fill;arcSize=12;', w: 160, h: 50 },
      'Decision Node':     { s: 'rhombus;whiteSpace=wrap;html=1;fillColor=#fff3e0;strokeColor=#e65100;fontColor=#e65100;overflow=fill;', w: 100, h: 80 },
      'Decision':          { s: 'rhombus;whiteSpace=wrap;html=1;fillColor=#fff3e0;strokeColor=#e65100;fontColor=#e65100;overflow=fill;', w: 100, h: 80 },
      'Merge Node':        { s: 'rhombus;whiteSpace=wrap;html=1;fillColor=#f3e5f5;strokeColor=#7b1fa2;fontColor=#7b1fa2;overflow=fill;', w: 100, h: 80 },
      'Fork Node':         { s: 'rectangle;whiteSpace=wrap;html=1;fillColor=#374151;strokeColor=#374151;', w: 220, h: 8 },
      'Join Node':         { s: 'rectangle;whiteSpace=wrap;html=1;fillColor=#374151;strokeColor=#374151;', w: 220, h: 8 },
      'Swimlane':          { s: 'swimlane;whiteSpace=wrap;html=1;startSize=30;fillColor=#f9fafb;swimlaneFillColor=none;strokeColor=#d1d5db;fontColor=#374151;fontStyle=1;verticalAlign=middle;align=center;', w: 180, h: 400 },
    },
    defaultVertex: { s: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e3f2fd;strokeColor=#1976d2;fontColor=#1565c0;overflow=fill;arcSize=12;', w: 160, h: 50 },
    defaultEdge:   { s: 'edgeStyle=orthogonalEdgeStyle;html=1;rounded=0;strokeColor=#6b7280;endArrow=block;endSize=8;fontColor=#6b7280;labelBackgroundColor=#fff;', label: '' },
    edgeKeywords: ['flow', 'transition'],
  },

  state_machine: {
    byName: {
      'Initial State':   { s: 'ellipse;whiteSpace=wrap;html=1;fillColor=#374151;strokeColor=#374151;', w: 20, h: 20 },
      'Final State':     { s: 'ellipse;whiteSpace=wrap;html=1;fillColor=#374151;strokeColor=#374151;strokeWidth=4;', w: 24, h: 24 },
      'State':           { s: 'rounded=1;whiteSpace=wrap;html=1;verticalAlign=top;overflow=fill;fillColor=#e8f5e9;strokeColor=#388e3c;fontColor=#2e7d32;', w: 200, h: 60 },
    },
    byType: {
      'State':           { s: 'rounded=1;whiteSpace=wrap;html=1;verticalAlign=top;overflow=fill;fillColor=#e8f5e9;strokeColor=#388e3c;fontColor=#2e7d32;', w: 200, h: 60 },
    },
    defaultVertex: { s: 'rounded=1;whiteSpace=wrap;html=1;verticalAlign=top;overflow=fill;fillColor=#e8f5e9;strokeColor=#388e3c;fontColor=#2e7d32;', w: 200, h: 60 },
    defaultEdge:   { s: 'edgeStyle=orthogonalEdgeStyle;html=1;rounded=0;strokeColor=#6b7280;endArrow=open;endSize=8;fontColor=#6b7280;labelBackgroundColor=#fff;', label: '' },
    edgeKeywords: ['transition', 'trigger'],
  },

  sequence: {
    byName: {
      'Actor':            { s: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;', w: 30, h: 60 },
      'Lifeline':         { s: 'html=1;points=[[0,0,0,0,5],[0,1,0,0,-5],[1,0,0,0,5],[1,1,0,0,-5]];perimeter=orthogonalPerimeter;outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;', w: 10, h: 60 },
      'Combined Fragment': { s: 'rectangle;rounded=0;whiteSpace=wrap;html=1;dashed=1;fillColor=none;strokeColor=#6b7280;fontColor=#374151;fontStyle=4;overflow=fill;', w: 220, h: 140 },
    },
    byType: {
      'Actor':            { s: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;', w: 30, h: 60 },
      'Lifeline':         { s: 'html=1;points=[[0,0,0,0,5],[0,1,0,0,-5],[1,0,0,0,5],[1,1,0,0,-5]];perimeter=orthogonalPerimeter;outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;', w: 10, h: 60 },
      'Combined Fragment': { s: 'rectangle;rounded=0;whiteSpace=wrap;html=1;dashed=1;fillColor=none;strokeColor=#6b7280;fontColor=#374151;fontStyle=4;overflow=fill;', w: 220, h: 140 },
    },
    defaultVertex: { s: 'html=1;points=[[0,0,0,0,5],[0,1,0,0,-5],[1,0,0,0,5],[1,1,0,0,-5]];perimeter=orthogonalPerimeter;outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;', w: 10, h: 60 },
    defaultEdge:   { s: 'edgeStyle=orthogonalEdgeStyle;html=1;rounded=0;strokeColor=#1976d2;endArrow=block;endSize=8;fontColor=#1565c0;labelBackgroundColor=#fff;', label: '' },
    edgeKeywords: ['message', 'return'],
    edges: {
      'Return Message': { s: 'edgeStyle=orthogonalEdgeStyle;html=1;rounded=0;dashed=1;strokeColor=#6b7280;endArrow=open;endSize=8;fontColor=#6b7280;labelBackgroundColor=#fff;', label: '' },
    },
  },

  communication: {
    byName: {
      'Object':     { s: 'swimlane;whiteSpace=wrap;html=1;startSize=28;fillColor=#f3e5f5;swimlaneFillColor=#fff;strokeColor=#7b1fa2;fontColor=#7b1fa2;', w: 160, h: 70 },
      'Link':       { s: 'edgeStyle=orthogonalEdgeStyle;html=1;strokeColor=#6b7280;endArrow=open;fontColor=#6b7280;labelBackgroundColor=#fff;', label: '' },
    },
    defaultVertex: { s: 'swimlane;whiteSpace=wrap;html=1;startSize=28;fillColor=#f3e5f5;swimlaneFillColor=#fff;strokeColor=#7b1fa2;fontColor=#7b1fa2;', w: 160, h: 70 },
  },

  interaction_overview: {
    byName: {
      'Interaction':        { s: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e3f2fd;strokeColor=#1976d2;fontColor=#1565c0;overflow=fill;', w: 200, h: 120 },
      'Decision':           { s: 'rhombus;whiteSpace=wrap;html=1;fillColor=#fff3e0;strokeColor=#e65100;fontColor=#e65100;overflow=fill;', w: 100, h: 80 },
    },
    defaultVertex: { s: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e3f2fd;strokeColor=#1976d2;fontColor=#1565c0;overflow=fill;', w: 200, h: 120 },
  },

  timing: {
    byName: {
      'Lifeline':      { s: 'rectangle;whiteSpace=wrap;html=1;fillColor=#e3f2fd;strokeColor=#1976d2;fontColor=#1565c0;overflow=fill;', w: 120, h: 36 },
      'Timing Ruler':  { s: 'line;html=1;strokeColor=#374151;', w: 400, h: 1 },
      'State':         { s: 'rounded=0;whiteSpace=wrap;html=1;fillColor=#f1f8e9;strokeColor=#558b2f;fontColor=#33691e;overflow=fill;', w: 80, h: 28 },
    },
    defaultVertex: { s: 'rectangle;whiteSpace=wrap;html=1;fillColor=#e3f2fd;strokeColor=#1976d2;fontColor=#1565c0;overflow=fill;', w: 120, h: 36 },
  },

  package: {
    defaultVertex: { s: 'shape=package;whiteSpace=wrap;html=1;fillColor=#fff3e0;strokeColor=#e65100;fontColor=#e65100;overflow=fill;', w: 200, h: 140 },
  },

  composite_structure: {
    defaultVertex: { s: 'rectangle;rounded=0;whiteSpace=wrap;html=1;fillColor=#e8eaf6;strokeColor=#3949ab;fontColor=#283593;overflow=fill;', w: 240, h: 160 },
  },

  profile: {
    defaultVertex: { s: 'shape=package;whiteSpace=wrap;html=1;fillColor=#e8f5e9;strokeColor=#388e3c;fontColor=#2e7d32;overflow=fill;', w: 200, h: 120 },
  },

  object: {
    defaultVertex: { s: 'swimlane;whiteSpace=wrap;html=1;startSize=28;fillColor=#f3e5f5;swimlaneFillColor=#fff;strokeColor=#7b1fa2;fontColor=#7b1fa2;overflow=fill;', w: 200, h: 70 },
  },

  c4_context: {
    defaultVertex: { s: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e3f2fd;strokeColor=#1976d2;fontColor=#1565c0;overflow=fill;', w: 200, h: 80 },
  },
  c4_container: {
    defaultVertex: { s: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e8f5e9;strokeColor=#388e3c;fontColor=#2e7d32;overflow=fill;', w: 200, h: 80 },
  },
  c4_component: {
    defaultVertex: { s: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#fff3e0;strokeColor=#e65100;fontColor=#e65100;overflow=fill;', w: 200, h: 80 },
  },
  c4_code: {
    defaultVertex: { s: 'swimlane;whiteSpace=wrap;html=1;startSize=28;fillColor=#f3e5f5;swimlaneFillColor=#fff;strokeColor=#7b1fa2;fontColor=#7b1fa2;overflow=fill;', w: 200, h: 80 },
  },
}

// ─── Helpers ────────────────────────────────────────────────────────

function isEdgeKeyword(name, keywords) {
  if (!keywords) return false
  const n = name.toLowerCase()
  return keywords.some(kw => n.includes(kw))
}

function matchShape(el, cfg) {
  const type = (el.type || '').trim()
  const name = (el.name || '').trim()

  // 1. Exact name match in cfg.edges → edge (with specific style)
  if (cfg.edges && cfg.edges[name]) {
    return { isEdge: true, ...cfg.edges[name] }
  }

  // 2. Exact type match in cfg.edges → edge (with specific style)
  if (cfg.edges && cfg.edges[type]) {
    return { isEdge: true, ...cfg.edges[type] }
  }

  // 3. Type contains edge keyword (substring) → edge (default style)
  if (cfg.edgeKeywords && type && isEdgeKeyword(type, cfg.edgeKeywords)) {
    return { isEdge: true, ...(cfg.defaultEdge || { s: '', label: '' }) }
  }

  // 4. Name exactly equals an edge keyword → edge (default style)
  if (cfg.edgeKeywords && cfg.edgeKeywords.some(kw => name.toLowerCase() === kw.toLowerCase())) {
    return { isEdge: true, ...(cfg.defaultEdge || { s: '', label: '' }) }
  }

  // 5. Check by exact type match → vertex (sample templates)
  if (cfg.byType && cfg.byType[type]) {
    return { isEdge: false, ...cfg.byType[type], label: name }
  }

  // 6. Check by exact name match → vertex (knowledge templates)
  if (cfg.byName && cfg.byName[name]) {
    return { isEdge: false, ...cfg.byName[name], label: name }
  }

  // 7. Fallback: vertex
  return { isEdge: false, ...(cfg.defaultVertex || { s: '', w: 140, h: 50 }), label: name }
}

// ─── Layout engines ─────────────────────────────────────────────────

function layoutGrid(elements, shapes, title, opts = {}) {
  const cols = opts.cols || Math.min(elements.length, 3)
  const gapX = opts.gapX || 50, gapY = opts.gapY || 60
  const startX = opts.startX || 50, startY2 = opts.startY || 70
  const boxW = opts.boxW || 180, boxH = opts.boxH || 60

  const cells = []
  const edges = []

  // Title
  const rows = Math.ceil(elements.length / cols)
  const totalW = cols * (boxW + gapX) - gapX
  cells.push(
    `<mxCell id="t" value="${esc(title)}" style="text;html=1;fontSize=16;fontWeight=bold;align=center;verticalAlign=middle;spacingTop=4;" vertex="1" parent="1">` +
      `<mxGeometry x="40" y="20" width="${Math.max(totalW, 300)}" height="36" as="geometry"/>` +
    `</mxCell>`
  )

  let vIdx = 0
  elements.forEach((el, i) => {
    const v = matchShape(el, shapes)
    if (v.isEdge) return

    const col = vIdx % cols
    const row = Math.floor(vIdx / cols)
    const x = startX + col * (boxW + gapX)
    const y = startY2 + row * (boxH + gapY)
    const id = `v${vIdx}`

    const w = v.w || boxW
    const h = v.h || boxH
    const label = el.name || v.label || ''

    cells.push(...emitCell(id, label, v.s, x, y, w, h, v.children))
    vIdx++
  })

  // Add sequential edges between non-edge vertices
  for (let i = 0; i < vIdx - 1; i++) {
    const edgeStyle = shapes.defaultEdge?.s || 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#999999;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;'
    edges.push(
      `<mxCell id="ce${i}" style="${edgeStyle}" edge="1" parent="1" source="v${i}" target="v${i+1}">` +
        `<mxGeometry relative="1" as="geometry"/>` +
      `</mxCell>`
    )
  }

  return { cells, edges }
}

function layoutUseCase(elements, cfg, title) {
  const cells = []
  const edges = []
  const actors = [], useCases = [], boundaries = [], others = []
  const edgeEls = []

  elements.forEach(el => {
    const m = matchShape(el, cfg)
    if (m.isEdge) { edgeEls.push({ el, m }); return }
    const name = el.name || ''
    const type = el.type || ''
    if (type.toLowerCase() === 'actor' || name === 'Actor') actors.push(el)
    else if (type.toLowerCase() === 'use case' || name === 'Use Case') useCases.push(el)
    else if (type.toLowerCase().includes('boundary') || name === 'System Boundary') boundaries.push(el)
    else others.push(el)
  })

  // Title
  cells.push(
    `<mxCell id="t" value="${esc(title)}" style="text;html=1;fontSize=16;fontWeight=bold;align=center;verticalAlign=middle;spacingTop=4;" vertex="1" parent="1">` +
      `<mxGeometry x="40" y="20" width="600" height="36" as="geometry"/>` +
    `</mxCell>`
  )

  const topY = 80
  const mActor = cfg.byName['Actor']
  const mUseCase = cfg.byName['Use Case']
  const actorW = mActor.w || 30, actorH = mActor.h || 60
  const ucW = mUseCase.w || 160, ucH = mUseCase.h || 70
  const gap = 40
  const actorX = 80
  const ucX = 300
  const maxCount = Math.max(actors.length, useCases.length, 1)
  const areaH = Math.max(300, topY + maxCount * (Math.max(actorH, ucH) + gap) + 60)
  const areaW = 560

  // Boundary (render first so it's behind)
  boundaries.forEach((el, i) => {
    const id = `b${i}`
    const m = matchShape(el, cfg)
    const bw = m.w || areaW
    const bh = m.h || areaH
    cells.push(...emitCell(id, el.name || '', m.s, 50 + i * 20, topY - 10, bw, bh, m.children))
  })

  let vIdx = 0

  // Actors
  actors.forEach((el, i) => {
    const id = `v${vIdx}`
    const y = topY + i * (actorH + gap)
    cells.push(...emitCell(id, el.name, mActor.s, actorX, y, actorW, actorH, mActor.children))
    vIdx++
  })

  // Use Cases
  useCases.forEach((el, i) => {
    const id = `v${vIdx}`
    const y = topY + i * (ucH + gap)
    cells.push(...emitCell(id, el.name, mUseCase.s, ucX, y, ucW, ucH, mUseCase.children))
    vIdx++
  })

  // Others (vertex elements that didn't match actor/use case/boundary)
  others.forEach((el, i) => {
    const id = `v${vIdx}`
    const m = matchShape(el, cfg)
    const y = topY + (maxCount + 1) * (ucH + gap) / 2 + i * 70
    cells.push(...emitCell(id, el.name || '', m.s, 80, y, m.w || 160, m.h || 60, m.children))
    vIdx++
  })

  // Edges: known relationship edges between actors ↔ use cases
  edgeEls.forEach(({ el, m }, i) => {
    const src = i % actors.length
    const tgt = actors.length + (i % Math.max(useCases.length, 1))
    if (vIdx > 1) {
      edges.push(
        `<mxCell id="e${i}" value="${esc(m.label || '')}" style="${m.s}" edge="1" parent="1" source="v${src}" target="v${tgt}">` +
          `<mxGeometry relative="1" as="geometry"/>` +
        `</mxCell>`
      )
    }
  })

  // Sequential connector between actors and first use case
  if (actors.length > 0 && useCases.length > 0) {
    edges.push(
      `<mxCell id="c0" style="edgeStyle=orthogonalEdgeStyle;html=1;rounded=0;strokeColor=#9ca3af;endArrow=open;dashed=1;" edge="1" parent="1" source="v0" target="v${actors.length}">` +
        `<mxGeometry relative="1" as="geometry"/>` +
      `</mxCell>`
    )
  }

  return { cells, edges }
}

function layoutActivity(elements, cfg, title) {
  const cells = []
  const edges = []

  cells.push(
    `<mxCell id="t" value="${esc(title)}" style="text;html=1;fontSize=16;fontWeight=bold;align=center;verticalAlign=middle;spacingTop=4;" vertex="1" parent="1">` +
      `<mxGeometry x="40" y="20" width="500" height="36" as="geometry"/>` +
    `</mxCell>`
  )

  // Separate swimlanes and nodes
  const swimlanes = []
  const nodes = []
  elements.forEach(el => {
    const type = el.type || ''
    const name = el.name || ''
    if (type === 'Swimlane' || name === 'Swimlane') swimlanes.push(el)
    else nodes.push(el)
  })

  const startX = swimlanes.length > 0 ? 220 : 50
  const startY = 80
  const gapY = 70
  const boxW = 160, boxH = 50
  let vIdx = 0

  // Draw swimlanes first (background)
  if (swimlanes.length > 0) {
    const laneW = 180
    const laneH = Math.max(nodes.length * (boxH + gapY) + 60, 300)
    swimlanes.forEach((el, i) => {
      const id = `sl${i}`
      const x = startX - 200 + i * (laneW + 10)
      const mS = cfg.byName['Swimlane']
      cells.push(...emitCell(id, el.name || '', mS.s, x, 80, laneW, laneH, mS.children))
    })
  }

  // Nodes
  nodes.forEach(el => {
    const m = matchShape(el, cfg)
    const id = `v${vIdx}`

    // Center if small (initial/final node)
    const isSmall = (m.w || 0) <= 30
    const x = isSmall ? startX + boxW/2 - (m.w || 20)/2 : startX
    const y = startY + vIdx * (boxH + gapY)
    const label = el.name || ''

    cells.push(...emitCell(id, label, m.s, x, y, m.w || boxW, m.h || boxH, m.children))

    // Edge from previous node
    if (vIdx > 0) {
      const edgeS = cfg.defaultEdge?.s || 'edgeStyle=orthogonalEdgeStyle;html=1;rounded=0;strokeColor=#6b7280;endArrow=block;'
      edges.push(
        `<mxCell id="ce${vIdx-1}" style="${edgeS}" edge="1" parent="1" source="v${vIdx-1}" target="v${vIdx}">` +
          `<mxGeometry relative="1" as="geometry"/>` +
        `</mxCell>`
      )
    }
    vIdx++
  })

  return { cells, edges }
}

function layoutClass(elements, cfg, title) {
  const cells = []
  const edges = []

  // Separate vertices from edges (edges skipped — no source/target data)
  const vElements = []
  elements.forEach(el => {
    const m = matchShape(el, cfg)
    if (m.isEdge) return
    vElements.push({ el, m })
  })

  const cols = Math.min(vElements.length, 3)
  const gapX = 60, gapY = 80
  const startX = 50, startY2 = 80
  const boxW = 220, boxH = 80
  const rows = Math.ceil(vElements.length / cols)
  const totalW = cols * (boxW + gapX) - gapX

  cells.push(
    `<mxCell id="t" value="${esc(title)}" style="text;html=1;fontSize=16;fontWeight=bold;align=center;verticalAlign=middle;spacingTop=4;" vertex="1" parent="1">` +
      `<mxGeometry x="40" y="20" width="${Math.max(totalW, 300)}" height="36" as="geometry"/>` +
    `</mxCell>`
  )

  vElements.forEach(({ el, m }, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = startX + col * (boxW + gapX)
    const y = startY2 + row * (boxH + gapY)
    const id = `v${i}`

    const label = el.name || ''
    const w = m.w || boxW
    const h = m.h || boxH

    cells.push(...emitCell(id, label, m.s, x, y, w, h, m.children))
  })

  return { cells, edges }
}

function layoutSequence(elements, cfg, title) {
  const cells = []
  const edges = []

  const lifelines = []
  const messages = []
  const fragments = []

  elements.forEach(el => {
    const m = matchShape(el, cfg)
    const name = el.name || ''
    if (m.isEdge) {
      messages.push(el)
    } else if (name === 'Combined Fragment') {
      fragments.push(el)
    } else {
      lifelines.push(el)
    }
  })

  // Title
  cells.push(
    `<mxCell id="t" value="${esc(title)}" style="text;html=1;fontSize=16;fontWeight=bold;align=center;verticalAlign=middle;spacingTop=4;" vertex="1" parent="1">` +
      `<mxGeometry x="40" y="20" width="${Math.max(lifelines.length * 160, 400)}" height="36" as="geometry"/>` +
    `</mxCell>`
  )

  const startY2 = 80
  const llW = 100, llH = 40
  const lifelineGap = 120

  // Draw lifelines
  lifelines.forEach((el, i) => {
    const id = `l${i}`
    const x = 60 + i * (llW + lifelineGap)
    const y = startY2
    const m = matchShape(el, cfg)
    const w = m.w || llW
    const h = m.h || llH

    cells.push(...emitCell(id, el.name || '', m.s, x, y, w, h, m.children))

    // Dashed lifeline below (only for non-actor lifelines)
    if (w > 20) {
      const lineId = `ll${i}`
      cells.push(
        `<mxCell id="${lineId}" value="" style="line;html=1;dashed=1;strokeColor=#9ca3af;verticalAlign=bottom;pointerEvents=0;" vertex="1" parent="1">` +
          `<mxGeometry x="${x + w / 2 - 1}" y="${y + h}" width="2" height="300" as="geometry"/>` +
        `</mxCell>`
      )
    }
  })

  // Messages as edges between lifelines (sequential messages)
  let msgIdx = 0
  messages.forEach((el, i) => {
    const m = matchShape(el, cfg)
    const prevLifeline = i % lifelines.length
    const nextLifeline = (i + 1) % lifelines.length
    const id = `m${i}`
    const y = startY2 + (m.h || llH) + 40 + msgIdx * 40
    const edgeS = m.isEdge ? m.s : (cfg.defaultEdge?.s || '')

    const label = el.name || ''
    edges.push(
      `<mxCell id="${id}" value="${esc(label)}" style="${edgeS}" edge="1" parent="1" source="l${prevLifeline}" target="l${nextLifeline}">` +
        `<mxGeometry relative="1" as="geometry"/>` +
      `</mxCell>`
    )
    msgIdx++
  })

  return { cells, edges }
}

function layoutStateMachine(elements, cfg, title) {
  const cells = []
  const edges = []

  cells.push(
    `<mxCell id="t" value="${esc(title)}" style="text;html=1;fontSize=16;fontWeight=bold;align=center;verticalAlign=middle;spacingTop=4;" vertex="1" parent="1">` +
      `<mxGeometry x="40" y="20" width="500" height="36" as="geometry"/>` +
    `</mxCell>`
  )

  const startX = 100
  const startY2 = 80
  const gapY = 80
  const boxW = 200, boxH = 60

  const vertices = elements.filter(el => !matchShape(el, cfg).isEdge)

  vertices.forEach((el, i) => {
    const m = matchShape(el, cfg)
    const id = `v${i}`
    const y = startY2 + i * (boxH + gapY)
    cells.push(...emitCell(id, el.name || '', m.s, startX, y, m.w || boxW, m.h || boxH, m.children))
    if (i > 0) {
      const edgeS = cfg.defaultEdge?.s || 'edgeStyle=orthogonalEdgeStyle;html=1;rounded=0;strokeColor=#6b7280;endArrow=open;'
      edges.push(
        `<mxCell id="ce${i-1}" style="${edgeS}" edge="1" parent="1" source="v${i-1}" target="v${i}">` +
          `<mxGeometry relative="1" as="geometry"/>` +
        `</mxCell>`
      )
    }
  })

  return { cells, edges }
}

function layoutC4(elements, cfg, title) {
  return layoutGrid(elements, cfg, title, { cols: 3, gapX: 50, gapY: 70, boxW: 200, boxH: 80 })
}

const LAYOUTS = {
  use_case:           layoutUseCase,
  class:              layoutClass,
  object:             layoutGrid,
  component:          layoutGrid,
  deployment:         layoutGrid,
  package:           (els, cfg, t) => layoutGrid(els, cfg, t, { cols: 2, gapX: 60, gapY: 80, boxW: 240, boxH: 100 }),
  composite_structure: (els, cfg, t) => layoutGrid(els, cfg, t, { cols: 2, gapX: 60, boxW: 260, boxH: 140 }),
  profile:           (els, cfg, t) => layoutGrid(els, cfg, t, { cols: 2, gapX: 60, boxW: 240, boxH: 100 }),
  activity:           layoutActivity,
  state_machine:      layoutStateMachine,
  sequence:           layoutSequence,
  communication:      layoutGrid,
  interaction_overview: (els, cfg, t) => layoutGrid(els, cfg, t, { cols: 2, gapX: 60, gapY: 80, boxW: 220, boxH: 100 }),
  timing:            (els, cfg, t) => layoutGrid(els, cfg, t, { cols: 1, gapX: 40, gapY: 50, boxW: 400, boxH: 36 }),
  c4_context:         layoutC4,
  c4_container:       layoutC4,
  c4_component:       layoutC4,
  c4_code:            layoutC4,
}

// ─── Main generator ─────────────────────────────────────────────────

function genXml(tpl) {
  const els = tpl.elements || []
  if (!els.length) return null

  const umlType = tpl.umlType || 'class'
  const cfg = CTX[umlType] || CTX.class
  const layoutFn = LAYOUTS[umlType] || layoutGrid

  const { cells, edges } = layoutFn(els, cfg, tpl.name || '')

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxGraphModel>
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
    ${cells.join('\n    ')}
    ${edges.join('\n    ')}
  </root>
</mxGraphModel>`
}

// ─── Entry point ────────────────────────────────────────────────────

function main() {
  const listPath = path.join(TEMPLATES_DIR, 'template-list.json')
  const list = JSON.parse(fs.readFileSync(listPath, 'utf8'))

  list.forEach(tpl => {
    const contentPath = path.join(TEMPLATES_DIR, tpl.id, 'content.json')
    if (!fs.existsSync(contentPath)) {
      console.warn(`SKIP: ${tpl.id} — no content.json`)
      return
    }

    const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'))
    const xml = genXml(content)
    if (!xml) {
      console.warn(`SKIP: ${tpl.id} — no elements`)
      return
    }

    const outPath = path.join(TEMPLATES_DIR, tpl.id, 'diagram.xml')
    fs.writeFileSync(outPath, xml, 'utf8')
    console.log(`OK: ${tpl.id} (umlType=${content.umlType}, ${content.elements.length} elements)`)
  })

  console.log('\nDone.')
}

main()
