import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'

type RouteContext = { params: Promise<{ id: string }> }

function buildSuggestions(input: {
  language: 'en' | 'ar'
  lastMessage: string
  intent?: string | null
  budget?: string | null
  area?: string | null
}): string[] {
  if (input.language === 'ar') {
    return [
      'بالتأكيد، يمكنني مساعدتك في الخيارات المتاحة الآن.',
      input.area ? `هل ترغب في رؤية أفضل الخيارات الحالية في ${input.area}؟` : 'ما المنطقة التي تفضلها في دبي؟',
      input.budget ? `سأطابق لك الخيارات ضمن ميزانية ${input.budget}.` : 'ما الميزانية المناسبة لك؟',
    ]
  }

  const intentLine =
    input.intent === 'rent'
      ? 'I can help you with a few rental options right away.'
      : input.intent === 'buy'
        ? 'I can help shortlist a few purchase options for you.'
        : 'I can help you narrow down the best options.'

  return [
    intentLine,
    input.area ? `Would you like me to show the best available options in ${input.area}?` : 'Which area would you like me to focus on?',
    input.budget ? `I can match options around ${input.budget}.` : 'What budget range should I match for you?',
  ]
}

export async function POST(request: NextRequest, context: RouteContext) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const supabase = createServerClient()
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, detected_lang, contacts!inner(intent, budget, area_interest)')
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .single()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('content, direction')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false })
    .limit(5)

  const lastInbound = (messages ?? []).find((message) => message.direction === 'inbound')?.content ?? ''
  const contact = Array.isArray(conversation.contacts) ? conversation.contacts[0] : conversation.contacts
  const suggestions = buildSuggestions({
    language: conversation.detected_lang === 'ar' ? 'ar' : 'en',
    lastMessage: lastInbound,
    intent: contact?.intent ?? null,
    budget: contact?.budget ?? null,
    area: contact?.area_interest ?? null,
  })

  return NextResponse.json({ data: suggestions })
}
