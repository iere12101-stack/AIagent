'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface SystemStatusResponse {
  data: {
    ai: {
      providers: {
        claude: boolean
        groq: boolean
        openai: boolean
      }
    }
  }
}

export function DegradedModeBanner() {
  const { data } = useQuery<SystemStatusResponse>({
    queryKey: ['system-status-banner'],
    queryFn: async () => {
      const response = await fetch('/api/system/status')
      if (!response.ok) {
        throw new Error('Failed to load system status')
      }

      return (await response.json()) as SystemStatusResponse
    },
    refetchInterval: 60_000,
    retry: 1,
  })

  const providers = data?.data.ai.providers
  if (!providers) {
    return null
  }

  const missingCriticalProviders = [
    providers.claude ? null : 'Claude',
    providers.groq ? null : 'Groq',
  ].filter((value): value is string => Boolean(value))

  // OpenAI is an optional fallback (Fallback 2); do not show degraded banner
  // when Claude and Groq are both available.
  if (missingCriticalProviders.length === 0) {
    return null
  }

  const optionalNote = providers.openai ? '' : ' Optional fallback missing: OpenAI.'

  return (
    <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Degraded AI Mode</AlertTitle>
      <AlertDescription>
        Missing critical AI keys for: {missingCriticalProviders.join(', ')}. The system stays online and uses available providers.{optionalNote}
      </AlertDescription>
    </Alert>
  )
}
