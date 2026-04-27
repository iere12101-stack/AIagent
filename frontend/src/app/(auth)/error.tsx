'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Auth layout error boundary caught an error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertTriangle className="h-8 w-8 text-amber-500" />
      <h2 className="text-xl font-semibold">This page failed to load</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        We hit an unexpected issue while rendering this authenticated page.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}

