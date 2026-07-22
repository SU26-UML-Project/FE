import { useEffect, useRef } from 'react'

export function useScrollToBottom(...deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}
