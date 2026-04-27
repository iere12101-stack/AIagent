import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'

export async function POST(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = (await request.json()) as {
    contactId?: string
    conversationId?: string | null
  }

  if (!payload.contactId) {
    return NextResponse.json({ error: 'contactId required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, language')
    .eq('id', payload.contactId)
    .eq('org_id', auth.orgId)
    .single()

  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const sentAt = new Date().toISOString()
  const messageEn = 'Just checking in. Would you like me to send a few matching options?'
  const messageAr = 'أردت فقط المتابعة معك. هل ترغب أن أرسل لك بعض الخيارات المناسبة؟'
  const messageSent = contact.language === 'ar' ? messageAr : messageEn

  const { data, error } = await supabase
    .from('nudge_jobs')
    .insert({
      org_id: auth.orgId,
      contact_id: payload.contactId,
      conversation_id: payload.conversationId ?? null,
      nudge_type: '24h',
      status: 'sent',
      scheduled_at: sentAt,
      sent_at: sentAt,
      language: contact.language ?? 'en',
      message_en: messageEn,
      message_ar: messageAr,
      message_sent: messageSent,
      result: { manual: true },
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
