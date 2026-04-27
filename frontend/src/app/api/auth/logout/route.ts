import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete({ name: 'sb-access-token', path: '/' })
  response.cookies.delete({ name: 'sb-refresh-token', path: '/' })
  return response
}
