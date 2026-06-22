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
