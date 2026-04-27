'use client'

import { useMemo, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Languages,
  Clock,
  Tag,
  FileText,
  Sparkles,
  CalendarDays,
  Send,
  Bell,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  direction: string
  senderType: string
  senderName: string | null
  content: string
  createdAt: string
}

interface ContactInfo {
  name: string | null
  pushName: string | null
  phone: string
  leadScore: number
  leadStatus: string
}

interface ConversationInsightsProps {
  messages: Message[]
  contact: ContactInfo
  detectedLang?: string
  detectedIntent?: string | null
  leadScore?: number
}

// ── Sentiment Analysis Helpers ───────────────────────────────────────────────

const POSITIVE_WORDS = [
  'thanks', 'thank', 'great', 'good', 'excellent', 'perfect', 'love', 'amazing',
  'wonderful', 'fantastic', 'interested', 'yes', 'sure', 'please', 'looking forward',
  ' excited', 'happy', 'beautiful', 'nice', 'awesome', 'best', 'appreciate',
  'شكرا', 'ممتاز', 'رائع', 'جميل', 'سعيد', 'مهتم',
]

const NEGATIVE_WORDS = [
  'no', 'not', 'expensive', 'too high', 'unaffordable', 'disappointed', 'cancel',
  'unhappy', 'frustrated', 'angry', 'bad', 'worst', 'terrible', 'never',
  'لا', 'غالي', 'مكلف', 'سيء', 'غير',
]

function analyzeSentiment(messages: Message[]): {
  label: string
  emoji: string
  score: number
  color: string
  bgColor: string
} {
  let positive = 0
  let negative = 0
  let total = 0

  for (const msg of messages) {
    if (msg.direction !== 'inbound') continue
    const text = msg.content.toLowerCase()
    let found = false
    for (const w of POSITIVE_WORDS) {
      if (text.includes(w)) { positive++; found = true; break }
    }
    if (!found) {
      for (const w of NEGATIVE_WORDS) {
        if (text.includes(w)) { negative++; break }
      }
    }
    total++
  }

  if (total === 0) {
    return { label: 'Neutral', emoji: '😐', score: 50, color: 'text-gray-600 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-800' }
  }

  const score = Math.round(((positive - negative) / total) * 50 + 50)
  if (score >= 65) {
    return { label: 'Positive', emoji: '😊', score, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-950' }
  }
  if (score <= 40) {
    return { label: 'Negative', emoji: '😟', score, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-950' }
  }
  return { label: 'Neutral', emoji: '😐', score, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-950' }
}

// ── Topic Extraction ─────────────────────────────────────────────────────────

const TOPIC_PATTERNS: { pattern: RegExp; label: string; icon: string }[] = [
  { pattern: /\b(dubai marina|marina)\b/i, label: 'Dubai Marina', icon: '🌊' },
  { pattern: /\b(downtown|burj khalifa|opera)\b/i, label: 'Downtown', icon: '🏙️' },
  { pattern: /\b(palm jumeirah|palm)\b/i, label: 'Palm Jumeirah', icon: '🏖️' },
  { pattern: /\b(jvc|jumeirah village|jvt)\b/i, label: 'JVC/JVT', icon: '🏡' },
  { pattern: /\b(business bay|difc)\b/i, label: 'Business Bay', icon: '💼' },
  { pattern: /\b(1br|1 br|1 bedroom|one bedroom|studio)\b/i, label: '1BR', icon: '🛏️' },
  { pattern: /\b(2br|2 br|2 bedroom|two bedroom)\b/i, label: '2BR', icon: '🛏️' },
  { pattern: /\b(3br|3 br|3 bedroom|three bedroom)\b/i, label: '3BR', icon: '🛏️' },
  { pattern: /\b(villa|townhouse)\b/i, label: 'Villa', icon: '🏰' },
  { pattern: /\b(apartment|flat)\b/i, label: 'Apartment', icon: '🏢' },
  { pattern: /\b(budget|price|cost|how much|afford|aed)\b/i, label: 'Budget', icon: '💰' },
  { pattern: /\b(viewing|visit|tour|show|appointment|see)\b/i, label: 'Viewing', icon: '👁️' },
  { pattern: /\b(invest|roi|rental|yield|return)\b/i, label: 'Investment', icon: '📈' },
  { pattern: /\b(off.?plan|ready|handover)\b/i, label: 'Off Plan', icon: '🏗️' },
  { pattern: /\b(rent|leasing|tenant)\b/i, label: 'Rent', icon: '🔑' },
  { pattern: /\b(buy|purchase|sale)\b/i, label: 'Buy', icon: '🤝' },
  { pattern: /\b(arabic|عربي|العقار|شقة)\b/i, label: 'Arabic', icon: '🇦🇪' },
]

function extractTopics(messages: Message[]): string[] {
  const topics = new Set<string>()
  for (const msg of messages) {
    for (const tp of TOPIC_PATTERNS) {
      if (tp.pattern.test(msg.content)) {
        topics.add(tp.label)
      }
    }
  }
  return Array.from(topics)
}

function getTopicIcon(label: string): string {
  const found = TOPIC_PATTERNS.find(t => t.label === label)
  return found?.icon ?? '📌'
}

// ── Language Detection ───────────────────────────────────────────────────────

const ARABIC_CHARS = /[\u0600-\u06FF]/

function detectLanguageMix(messages: Message[]): { en: number; ar: number } {
  let en = 0
  let ar = 0
  for (const msg of messages) {
    if (ARABIC_CHARS.test(msg.content)) {
      ar++
    } else {
      en++
    }
  }
  const total = en + ar
  if (total === 0) return { en: 100, ar: 0 }
  return {
    en: Math.round((en / total) * 100),
    ar: Math.round((ar / total) * 100),
  }
}

// ── Response Time ────────────────────────────────────────────────────────────

function computeAvgResponseTime(messages: Message[]): string {
  // Sort messages by time
  const sorted = [...messages].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const pairs: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    // Only measure contact→agent response time
    if (prev.direction === 'inbound' && curr.direction === 'outbound') {
      const diff = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime()
      if (diff > 0 && diff < 300000) { // Only count if < 5 minutes
        pairs.push(diff)
      }
    }
  }

  if (pairs.length === 0) {
    return 'Awaiting reply'
  }

  const avg = pairs.reduce((sum, v) => sum + v, 0) / pairs.length
  const seconds = avg / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s avg`
  }
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}m ${secs}s avg`
}

// ── Summary Generator ───────────────────────────────────────────────────────

function generateSummary(messages: Message[], contact: ContactInfo): string {
  if (messages.length === 0) return 'No messages yet in this conversation.'

  const contactName = contact.name || contact.pushName || 'Contact'
  const inboundCount = messages.filter(m => m.direction === 'inbound').length
  const outboundCount = messages.filter(m => m.direction === 'outbound').length

  const topics = extractTopics(messages)
  const topicStr = topics.length > 0 ? topics.slice(0, 3).join(', ') : 'general property inquiry'

  const intent = topics.includes('Rent') ? 'renting' :
    topics.includes('Investment') ? 'investing in' :
    topics.includes('Buy') ? 'buying' : 'exploring'

  return `${contactName} has exchanged ${inboundCount + outboundCount} messages, primarily about ${topicStr}. The contact appears ${intent === 'exploring' ? 'to be exploring' : `interested in ${intent}`} properties and has been engaging ${inboundCount > 3 ? 'actively' : 'moderately'} with the chatbot.`
}

// ── Suggested Actions ───────────────────────────────────────────────────────

function getSuggestedActions(messages: Message[], topics: string[]): { icon: React.ReactNode; label: string; variant: 'default' | 'outline' }[] {
  const actions: { icon: React.ReactNode; label: string; variant: 'default' | 'outline' }[] = []

  if (topics.includes('Viewing') || messages.length > 5) {
    actions.push({ icon: <CalendarDays className="h-3.5 w-3.5" />, label: 'Schedule Viewing', variant: 'default' })
  }

  if (topics.some(t => ['Villa', 'Apartment', '1BR', '2BR', '3BR', 'Dubai Marina', 'Downtown', 'Palm Jumeirah'].includes(t))) {
    actions.push({ icon: <Send className="h-3.5 w-3.5" />, label: 'Send Property Details', variant: 'default' })
  }

  if (messages.length > 8) {
    actions.push({ icon: <Bell className="h-3.5 w-3.5" />, label: 'Nudge in 24h', variant: 'outline' })
  }

  if (actions.length === 0) {
    actions.push({ icon: <Send className="h-3.5 w-3.5" />, label: 'Send Property Details', variant: 'default' })
    actions.push({ icon: <Bell className="h-3.5 w-3.5" />, label: 'Nudge in 24h', variant: 'outline' })
  }

  return actions
}

// ── Lead Score Trend ─────────────────────────────────────────────────────────

function getLeadScoreTrend(leadScore: number): {
  direction: 'up' | 'down' | 'stable'
  icon: React.ReactNode
  label: string
  color: string
} {
  if (leadScore >= 70) {
    return {
      direction: 'up',
      icon: <TrendingUp className="h-4 w-4" />,
      label: 'Improving',
      color: 'text-emerald-600 dark:text-emerald-400',
    }
  }
  if (leadScore >= 40) {
    return {
      direction: 'stable',
      icon: <Minus className="h-4 w-4" />,
      label: 'Stable',
      color: 'text-amber-600 dark:text-amber-400',
    }
  }
  return {
    direction: 'down',
    icon: <TrendingDown className="h-4 w-4" />,
    label: 'Declining',
    color: 'text-red-600 dark:text-red-400',
  }
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ConversationInsights({
  messages,
  contact,
  detectedLang,
  detectedIntent,
  leadScore = 50,
}: ConversationInsightsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sentiment = useMemo(() => analyzeSentiment(messages), [messages])
  const topics = useMemo(() => extractTopics(messages), [messages])
  const langMix = useMemo(() => detectLanguageMix(messages), [messages])
  const avgResponseTime = useMemo(() => computeAvgResponseTime(messages), [messages])
  const summary = useMemo(() => generateSummary(messages, contact), [messages, contact])
  const suggestedActions = useMemo(() => getSuggestedActions(messages, topics), [messages, topics])
  const leadTrend = useMemo(() => getLeadScoreTrend(leadScore), [leadScore])

  return (
    <div className="border-t bg-background">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <BarChart3 className="h-3.5 w-3.5" />
        <span>Conversation Insights</span>
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
          {messages.length} msgs
        </Badge>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Insights Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-3 pt-1">
          <ScrollArea className="max-h-96">
            <div className="rounded-lg border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50/80 to-transparent dark:from-emerald-950/40 dark:to-transparent p-4 space-y-4">

              {/* Row 1: Sentiment + Response Time + Lead Trend */}
              <div className="grid grid-cols-3 gap-3">
                {/* Sentiment */}
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-background/80 dark:bg-background/40 border">
                  <span className="text-2xl">{sentiment.emoji}</span>
                  <span className={`text-xs font-bold ${sentiment.color}`}>{sentiment.label}</span>
                  <span className="text-[10px] text-muted-foreground">Sentiment</span>
                </div>

                {/* Response Time */}
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-background/80 dark:bg-background/40 border">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span className="text-xs font-bold text-foreground">{avgResponseTime}</span>
                  <span className="text-[10px] text-muted-foreground">Response Time</span>
                </div>

                {/* Lead Score Trend */}
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-background/80 dark:bg-background/40 border">
                  <span className={leadTrend.color}>{leadTrend.icon}</span>
                  <span className={`text-xs font-bold ${leadTrend.color}`}>{leadTrend.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    Score: {leadScore}
                  </span>
                </div>
              </div>

              {/* Message Summary */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-background/80 dark:bg-background/40 border">
                <FileText className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Summary</p>
                  <p className="text-xs text-foreground leading-relaxed">{summary}</p>
                </div>
              </div>

              {/* Key Topics */}
              {topics.length > 0 && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-background/80 dark:bg-background/40 border">
                  <Tag className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Key Topics</p>
                    <div className="flex flex-wrap gap-1.5">
                      {topics.map((topic) => (
                        <span
                          key={topic}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground"
                        >
                          <span>{getTopicIcon(topic)}</span>
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Language Mix */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-background/80 dark:bg-background/40 border">
                <Languages className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Language Mix</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium">🇬🇧 EN</span>
                        <span className="text-[11px] text-muted-foreground">{langMix.en}%</span>
                      </div>
                      <Progress value={langMix.en} className="h-1.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium">🇦🇪 AR</span>
                        <span className="text-[11px] text-muted-foreground">{langMix.ar}%</span>
                      </div>
                      <Progress value={langMix.ar} className="h-1.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Intent Badge */}
              {detectedIntent && (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] text-muted-foreground">Detected Intent:</span>
                  <Badge variant="secondary" className="text-[11px] h-5">
                    {detectedIntent}
                  </Badge>
                </div>
              )}

              <Separator />

              {/* Suggested Actions */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Suggested Actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedActions.map((action, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant={action.variant}
                      className={`gap-1.5 text-xs h-8 ${
                        action.variant === 'default'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : ''
                      }`}
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>

            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

