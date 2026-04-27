'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

interface AuthProfile {
  userId: string
  orgId: string
  role: string
  email: string
  name: string
}

async function fetchAuthProfile(): Promise<AuthProfile> {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error('Failed to load authenticated user')
  }

  const payload = (await response.json()) as { data: AuthProfile }
  return payload.data
}

export function useAuthProfile() {
  const query = useQuery({
    queryKey: ['auth-profile'],
    queryFn: fetchAuthProfile,
    staleTime: 60_000,
    retry: 1,
  })

  const displayName = useMemo(() => {
    const name = query.data?.name?.trim()
    if (name) {
      return name
    }

    const email = query.data?.email?.trim()
    if (!email) {
      return 'Team Member'
    }

    return email.split('@')[0] || 'Team Member'
  }, [query.data?.email, query.data?.name])

  const initials = useMemo(() => {
    const parts = displayName.split(/\s+/).filter(Boolean)
    if (parts.length === 0) {
      return 'TM'
    }

    return parts
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [displayName])

  return {
    ...query,
    profile: query.data ?? null,
    displayName,
    initials,
  }
}
