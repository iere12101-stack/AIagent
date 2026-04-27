import type { Response } from 'express'

export function sendApiError(
  response: Response,
  status: number,
  code: string,
  error: string,
): Response {
  return response.status(status).json({
    success: false,
    error,
    code,
  })
}

export function parseCursor(cursor?: string | null): { createdAt: string; id: string } | null {
  if (!cursor) {
    return null
  }

  const [createdAt, id] = cursor.split('::')
  if (!createdAt || !id) {
    return null
  }

  return { createdAt, id }
}

export function buildCursor(createdAt: string, id: string): string {
  return `${createdAt}::${id}`
}
