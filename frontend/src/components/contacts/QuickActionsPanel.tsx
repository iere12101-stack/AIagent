'use client'

import { useState } from 'react'
import {
  Send,
  Phone,
  Tag,
  Download,
  Trash2,
  X,
  Users,
  Star,
  Clock,
  DollarSign,
  Eye,
  MessageSquare,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ── Quick Filter Data ────────────────────────────────────────────────────────

interface QuickFilter {
  id: string
  label: string
  icon: React.ReactNode
  count: number
}

const QUICK_FILTERS: QuickFilter[] = [
  { id: 'all', label: 'All Contacts', icon: <Users className="h-3.5 w-3.5" />, count: 47 },
  { id: 'vip', label: 'VIP Only', icon: <Star className="h-3.5 w-3.5" />, count: 8 },
  { id: 'new-week', label: 'New This Week', icon: <Clock className="h-3.5 w-3.5" />, count: 12 },
  { id: 'price', label: 'Price Negotiation', icon: <DollarSign className="h-3.5 w-3.5" />, count: 6 },
  { id: 'viewing', label: 'Viewing Due', icon: <Eye className="h-3.5 w-3.5" />, count: 9 },
  { id: 'followup', label: 'Follow-up Required', icon: <MessageSquare className="h-3.5 w-3.5" />, count: 15 },
  { id: 'arabic', label: 'Arabic Speakers', icon: <Globe className="h-3.5 w-3.5" />, count: 11 },
]

// ── Batch Action Data ────────────────────────────────────────────────────────

interface BatchAction {
  id: string
  label: string
  icon: React.ReactNode
  colorClass: string
}

const BATCH_ACTIONS: BatchAction[] = [
  { id: 'send-message', label: 'Send Message', icon: <Send className="h-3.5 w-3.5" />, colorClass: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { id: 'schedule-call', label: 'Schedule Call', icon: <Phone className="h-3.5 w-3.5" />, colorClass: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { id: 'add-label', label: 'Add Label', icon: <Tag className="h-3.5 w-3.5" />, colorClass: 'bg-purple-600 hover:bg-purple-700 text-white' },
  { id: 'export', label: 'Export Selected', icon: <Download className="h-3.5 w-3.5" />, colorClass: 'bg-amber-600 hover:bg-amber-700 text-white' },
  { id: 'delete', label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, colorClass: 'bg-red-600 hover:bg-red-700 text-white' },
]

// ── Quick Actions Panel ──────────────────────────────────────────────────────

interface QuickActionsPanelProps {
  selectedCount?: number
  onFilterChange?: (filterId: string) => void
  onBatchAction?: (actionId: string) => void
}

export function QuickActionsPanel({
  selectedCount = 0,
  onFilterChange,
  onBatchAction,
}: QuickActionsPanelProps) {
  const [activeFilter, setActiveFilter] = useState('all')

  const handleFilterClick = (filterId: string) => {
    setActiveFilter(filterId)
    onFilterChange?.(filterId)
  }

  return (
    <div className="space-y-3">
      {/* ── Quick Filters Row ──────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {QUICK_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.id
          return (
            <button
              key={filter.id}
              onClick={() => handleFilterClick(filter.id)}
              className={cn(
                'tag-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 press-scale',
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30'
                  : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {filter.icon}
              {filter.label}
              <Badge
                variant="secondary"
                className={cn(
                  'ml-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full',
                  isActive
                    ? 'bg-white/20 text-white border-0'
                    : 'bg-muted-foreground/10 text-muted-foreground border-0'
                )}
              >
                {filter.count}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* ── Batch Actions Bar (animated slide-up) ──────────────────────── */}
      <div
        className={cn(
          'transition-all duration-300 ease-out overflow-hidden',
          selectedCount > 0
            ? 'max-h-20 opacity-100 translate-y-0'
            : 'max-h-0 opacity-0 translate-y-4'
        )}
      >
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 backdrop-blur-sm px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="bg-emerald-600 text-white text-xs px-2">
              {selectedCount} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onBatchAction?.('clear')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {BATCH_ACTIONS.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant="outline"
                className={cn(
                  'gap-1.5 h-8 text-xs shrink-0 transition-all duration-150 press-scale',
                  action.id === 'delete'
                    ? 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-300'
                    : action.id === 'send-message'
                      ? 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-700 dark:hover:text-emerald-300'
                      : 'hover:bg-accent'
                )}
                onClick={() => onBatchAction?.(action.id)}
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
