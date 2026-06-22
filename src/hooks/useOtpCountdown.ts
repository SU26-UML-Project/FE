import { useState, useEffect, useCallback } from 'react'

export function useOtpCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  const start = useCallback((seconds: number) => {
    setSecondsLeft(seconds)
  }, [])

  const reset = useCallback(() => {
    setSecondsLeft(0)
  }, [])

  return { secondsLeft, start, reset }
}
