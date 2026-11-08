import { useEffect, useState } from 'react'
/** Presentation only; callers never derive eligibility from this clock. */
export function useServerClock(serverNow?: string) {
  const [time, setTime] = useState(serverNow)
  useEffect(() => {
    if (!serverNow) return
    const baseline = performance.now(),
      server = Date.parse(serverNow)
    const tick = () =>
      setTime(new Date(server + performance.now() - baseline).toISOString())
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [serverNow])
  return time ?? serverNow
}
