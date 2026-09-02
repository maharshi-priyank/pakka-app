import { useEffect, useRef, useState } from 'react'

// Spring-ish ease-out, matching DESIGN.md's cubic-bezier(0.16, 1, 0.3, 1) entrance curve.
function easeOutSpring(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export function useCountUp(target: number, durationMs = 700) {
  const [value, setValue] = useState(target)
  const prevTarget = useRef(target)
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const from = prevTarget.current
    const to   = target
    prevTarget.current = target

    if (from === to) { setValue(to); return }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) { setValue(to); return }

    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const t = Math.min(1, elapsed / durationMs)
      setValue(Math.round(from + (to - from) * easeOutSpring(t)))
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)

    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return value
}
