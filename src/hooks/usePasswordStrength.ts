import { useMemo } from 'react'

export interface PasswordCriterion {
  label: string
  met: boolean
}

function evaluatePassword(pw: string): { score: number; criteria: PasswordCriterion[] } {
  const criteria: PasswordCriterion[] = [
    { label: 'Tối thiểu 8 ký tự', met: pw.length >= 8 },
    { label: 'Có chữ hoa (A–Z)', met: /[A-Z]/.test(pw) },
    { label: 'Có chữ thường (a–z)', met: /[a-z]/.test(pw) },
    { label: 'Có chữ số (0–9)', met: /\d/.test(pw) },
    { label: 'Có ký tự đặc biệt', met: /[^A-Za-z0-9]/.test(pw) },
  ]
  return { score: criteria.filter((c) => c.met).length, criteria }
}

function strengthMeta(score: number) {
  if (score >= 5) return { label: 'Mạnh' as const, color: '#16a34a', bars: 3 }
  if (score >= 3) return { label: 'Trung bình' as const, color: '#d97706', bars: 2 }
  return { label: 'Yếu' as const, color: '#dc2626', bars: 1 }
}

export function usePasswordStrength(password: string) {
  return useMemo(() => {
    const { score, criteria } = evaluatePassword(password)
    const meta = strengthMeta(score)
    return { score, criteria, meta }
  }, [password])
}
