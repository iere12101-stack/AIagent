'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error boundary caught an error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        !
      </div>
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        The page hit an unexpected error. You can retry without losing your current session.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
