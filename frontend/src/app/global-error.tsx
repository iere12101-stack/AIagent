'use client'

import { Button } from '@/components/ui/button'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            !
          </div>
          <h2 className="text-xl font-semibold">Unexpected application error</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            A critical rendering error occurred. Try reloading this view.
          </p>
          <Button onClick={reset}>Reload</Button>
        </div>
      </body>
    </html>
  )
}
