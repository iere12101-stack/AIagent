'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp, MessageSquareText } from 'lucide-react'

interface QuickRepliesProps {
  onInsert: (text: string) => void
}

interface QuickReplyItem {
  text: string
  preview: string
}

interface QuickReplyCategory {
  label: string
  dotColor: string
  items: QuickReplyItem[]
}

interface ScrollState {
  canLeft: boolean
  canRight: boolean
}

const CATEGORIES: QuickReplyCategory[] = [
  {
    label: 'Greeting',
    dotColor: 'bg-emerald-500',
    items: [
      {
        preview: 'Welcome! How can I help...',
        text: 'Welcome! How can I help you today?',
      },
      {
        preview: 'Let me check that...',
        text: 'Let me check that for you. One moment please.',
      },
      {
        preview: "I'd be happy to schedule...",
        text: "I'd be happy to schedule a viewing for you.",
      },
      {
        preview: 'Our office is open...',
        text: 'Our office is open Saturday to Thursday, 9AM to 6PM.',
      },
      {
        preview: 'Thank you for your interest...',
        text: 'Thank you for your interest in IERE properties!',
      },
    ],
  },
  {
    label: 'Property',
    dotColor: 'bg-amber-500',
    items: [
      {
        preview: 'I have several options...',
        text: 'I have several options that match your budget. Let me share the details.',
      },
      {
        preview: 'The listed price is...',
        text: 'The listed price is negotiable. Shall I arrange a meeting with the seller?',
      },
      {
        preview: 'This property is ready...',
        text: 'This property is ready to move in. Would you like to schedule a visit?',
      },
      {
        preview: 'The ROI for this area...',
        text: 'The ROI for this area is approximately 7-9% annually.',
      },
      {
        preview: 'I can send you the...',
        text: 'I can send you the complete property brochure with floor plans.',
      },
    ],
  },
]

const TOTAL_REPLIES = CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0)

export function QuickReplies({ onInsert }: QuickRepliesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [scrollStates, setScrollStates] = useState<Record<string, ScrollState>>({})
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const checkScroll = useCallback((key: string) => {
    const el = scrollRefs.current[key]
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el
      const newState = {
        canLeft: scrollLeft > 4,
        canRight: scrollLeft + clientWidth < scrollWidth - 4,
      }
      setScrollStates((prev) => {
        const prevVal = prev[key]
        if (prevVal && prevVal.canLeft === newState.canLeft && prevVal.canRight === newState.canRight) {
          return prev
        }
        return { ...prev, [key]: newState }
      })
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        CATEGORIES.forEach((cat) => checkScroll(cat.label))
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, checkScroll])

  const handleScroll = useCallback((key: string) => {
    checkScroll(key)
  }, [checkScroll])

  const scrollRow = (key: string, direction: 'left' | 'right') => {
    const el = scrollRefs.current[key]
    if (el) {
      el.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth',
      })
    }
  }

  const handleInsert = (text: string) => {
    onInsert(text)
  }

  return (
    <div className="border-t bg-background">
      {/* Toggle Button — default collapsed */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquareText className="h-3.5 w-3.5" />
        <span>Quick Replies ({TOTAL_REPLIES})</span>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Expandable content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3 pb-2.5 space-y-2.5">
          {CATEGORIES.map((category) => {
            const scrollKey = category.label
            const state = scrollStates[scrollKey]
            const canLeft = state?.canLeft ?? false
            const canRight = state?.canRight ?? false

            return (
              <div key={category.label} className="relative">
                {/* Category label */}
                <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
                  <span className={`h-2 w-2 rounded-full ${category.dotColor} shrink-0`} />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {category.label} & Info
                  </span>
                </div>

                {/* Scroll fade indicators */}
                {canLeft && (
                  <div className="absolute left-0 top-6 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                )}
                {canRight && (
                  <div className="absolute right-0 top-6 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
                )}

                {/* Scroll arrows */}
                {canLeft && (
                  <button
                    onClick={() => scrollRow(scrollKey, 'left')}
                    className="absolute left-0 top-1/2 z-20 h-5 w-5 rounded-full bg-background border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ChevronUp className="h-3 w-3 -rotate-90" />
                  </button>
                )}
                {canRight && (
                  <button
                    onClick={() => scrollRow(scrollKey, 'right')}
                    className="absolute right-0 top-1/2 z-20 h-5 w-5 rounded-full bg-background border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ChevronUp className="h-3 w-3 rotate-90" />
                  </button>
                )}

                {/* Pills row */}
                <div
                  ref={(el) => { scrollRefs.current[scrollKey] = el }}
                  onScroll={() => handleScroll(scrollKey)}
                  className="flex gap-2 overflow-x-auto scrollbar-none py-0.5"
                >
                  {category.items.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleInsert(item.text)}
                      title={item.text}
                      className="inline-flex shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 transition-all duration-150 whitespace-nowrap active:scale-95 max-w-[200px]"
                    >
                      <span className="truncate">{item.preview}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
