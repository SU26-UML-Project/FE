import { useMemo } from 'react'

export interface PasswordCriterion {
  label: string
  met: boolean
}

function evaluatePassword(pw: string): { score: number; criteria: PasswordCriterion[] } {
  const criteria: PasswordCriterion[] = [
    { label: 'At least 8 characters', met: pw.length >= 8 },
    { label: 'An uppercase letter (A–Z)', met: /[A-Z]/.test(pw) },
    { label: 'A lowercase letter (a–z)', met: /[a-z]/.test(pw) },
    { label: 'A number (0–9)', met: /\d/.test(pw) },
    { label: 'A special character', met: /[^A-Za-z0-9]/.test(pw) },
  ]
  return { score: criteria.filter((c) => c.met).length, criteria }
}

function strengthMeta(score: number) {
  if (score >= 5) return { label: 'Strong' as const, color: '#16a34a', bars: 3 }
  if (score >= 3) return { label: 'Medium' as const, color: '#d97706', bars: 2 }
  return { label: 'Weak' as const, color: '#dc2626', bars: 1 }
}

export function usePasswordStrength(password: string) {
  return useMemo(() => {
    const { score, criteria } = evaluatePassword(password)
    const meta = strengthMeta(score)
    return { score, criteria, meta }
  }, [password])
}
