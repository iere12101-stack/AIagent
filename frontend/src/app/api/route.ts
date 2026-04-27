import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()
  const { error } = await supabase.from('organizations').select('count').limit(1)
  return NextResponse.json({
    status: error ? 'degraded' : 'ok',
    version: '4.1.0',
    timestamp: new Date().toISOString(),
    timezone: 'Asia/Dubai',
    services: {
      database: error ? 'error' : 'ok',
      ai:
        process.env.ANTHROPIC_API_KEY ||
        process.env.CLAUDE_API_KEY ||
        process.env.ANTHROPIC_KEY ||
        process.env.CLAUDE_KEY
          ? 'configured'
          : 'missing',
      whatsapp: 'see backend service on :3001',
    }
  })
}
