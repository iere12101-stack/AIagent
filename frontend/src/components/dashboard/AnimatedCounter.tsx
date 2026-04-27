'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface AnimatedCounterProps {
  value: number
  format?: 'number' | 'aed' | 'percent'
  duration?: number
  prefix?: string
  className?: string
  decimals?: number
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function AnimatedCounter({
  value,
  format = 'number',
  duration = 1000,
  prefix = '',
  className = '',
  decimals = 0,
}: AnimatedCounterProps) {
  const [animatedValue, setAnimatedValue] = useState<number | null>(null)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const hasAnimated = useRef(false)

  const formatDisplay = useCallback(
    (num: number): string => {
      const rounded = Number(num.toFixed(decimals))
      let formatted: string

      switch (format) {
        case 'aed':
          formatted = `AED ${rounded.toLocaleString()}`
          break
        case 'percent':
          formatted = `${rounded.toFixed(decimals > 0 ? decimals : 1)}%`
          break
        default:
          formatted = rounded.toLocaleString()
          break
      }

      return prefix ? `${prefix}${formatted}` : formatted
    },
    [format, decimals, prefix]
  )

  // Animate from 0 to value on first mount
  useEffect(() => {
    if (hasAnimated.current) return

    const endValue = value
    hasAnimated.current = true

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)

      const currentValue = (endValue) * easedProgress
      setAnimatedValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setAnimatedValue(endValue)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration])

  // Use animatedValue if available (during/after animation), otherwise show value directly
  const displayNum = animatedValue !== null ? animatedValue : value

  return <span className={className}>{formatDisplay(displayNum)}</span>
}
