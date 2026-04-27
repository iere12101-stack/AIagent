import { NextResponse } from 'next/server'
import { QUICK_REPLY_CATALOG } from '@/lib/inbox-quick-replies'

export async function GET() {
  return NextResponse.json({ count: QUICK_REPLY_CATALOG.length })
}
