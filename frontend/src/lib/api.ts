import type { ApiErrorResponse } from '@/types'

export { proxyBackendRequest } from './backend-api'

export class ApiError extends Error {
  readonly status: number
  readonly payload?: unknown

  constructor(message: string, status: number, payload?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

function tryParseJson(text: string): unknown {
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init)
  const rawBody = await response.text()
  const payload = tryParseJson(rawBody)

  if (!response.ok) {
    const apiError = (payload && typeof payload === 'object'
      ? payload
      : undefined) as ApiErrorResponse | undefined

    throw new ApiError(
      apiError?.error ?? `Request failed with status ${response.status}`,
      response.status,
      payload,
    )
  }

  return payload as T
}
