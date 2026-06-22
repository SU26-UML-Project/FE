import type { TemplateMeta, TemplateContent } from '../types/template'

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
