export interface TemplateMeta {
  id: string
  name: string
  type: string
  umlType: string
  category: string
  group: string
  kind: 'knowledge' | 'sample'
  description: string
  shortDescription: string
  nodeCount: number
  edgeCount: number
  createdFor: string
}

export interface TemplateContent extends TemplateMeta {
  purpose: string
  bestFor: string[]
  notSuitableFor?: string[]
  useCases: string[]
  requirements: string[]
  elements: { name: string; type: string; description: string }[]
  confusableWith?: { diagram: string; difference: string }[]
  keywords?: string[]
  previewImage: string | null
}

export async function getTemplateList(kind?: 'knowledge' | 'sample'): Promise<TemplateMeta[]> {
  const res = await fetch('/templates/template-list.json')
  if (!res.ok) throw new Error('Failed to load template list')
  const all: TemplateMeta[] = await res.json()
  return kind ? all.filter(t => t.kind === kind) : all
}

export async function getTemplateContent(id: string): Promise<TemplateContent> {
  const res = await fetch(`/templates/${id}/content.json`)
  if (!res.ok) throw new Error(`Template "${id}" not found`)
  return res.json()
}
