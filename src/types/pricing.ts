export type BillingCycle = 'monthly' | 'yearly'

export interface Plan {
  name: string
  monthlyPrice: number | null
  yearlyPrice: number | null
  description: string
  features: string[]
  cta: string
  highlight?: boolean
}

export interface ComparisonRow {
  feature: string
  free: string | boolean
  education: string | boolean
  pro: string | boolean
  enterprise: string | boolean
}
