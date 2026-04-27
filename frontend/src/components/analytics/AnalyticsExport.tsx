'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

// ── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  conversations: {
    total: number
    active: number
    resolved: number
    today: number
    thisWeek: number
    thisMonth: number
  }
  contacts: {
    total: number
    new: number
    warm: number
    hot: number
    converted: number
  }
  properties: {
    total: number
    sale: number
    rent: number
    ready: number
    offPlan: number
  }
  bookings: {
    total: number
    scheduled: number
    completed: number
    thisWeek: number
  }
  nudges: {
    total: number
    pending: number
    sent: number
    conversionRate: number
  }
  leadScoreDistribution: { score: string; count: number }[]
  conversationVolume: { date: string; count: number }[]
  handoffRate: number
  avgResponseTime: number
  languageSplit: { en: number; ar: number }
  propertyMatchRate: number
}

// ── CSV Helpers ──────────────────────────────────────────────────────────────

function generateCSV(headers: string[], rows: string[][]): string {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        // Escape cells that contain commas or quotes
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`
        }
        return cell
      }).join(',')
    ),
  ].join('\n')
  return csvContent
}

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getDateString() {
  return new Date().toISOString().split('T')[0]
}

// ── Component ────────────────────────────────────────────────────────────────

export function AnalyticsExport() {
  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ['analytics-export'],
    queryFn: () => fetch('/api/analytics').then((r) => r.json()),
    staleTime: 30000,
  })

  const handleExportSummary = () => {
    if (!analytics) return
    const headers = ['Metric', 'Value']
    const rows = [
      ['Total Conversations', String(analytics.conversations.total)],
      ['Active Conversations', String(analytics.conversations.active)],
      ['Resolved Conversations', String(analytics.conversations.resolved)],
      ['Conversations Today', String(analytics.conversations.today)],
      ['Conversations This Week', String(analytics.conversations.thisWeek)],
      ['Conversations This Month', String(analytics.conversations.thisMonth)],
      ['Total Contacts', String(analytics.contacts.total)],
      ['New Leads', String(analytics.contacts.new)],
      ['Warm Leads', String(analytics.contacts.warm)],
      ['Hot Leads', String(analytics.contacts.hot)],
      ['Converted', String(analytics.contacts.converted)],
      ['Total Properties', String(analytics.properties.total)],
      ['Properties For Sale', String(analytics.properties.sale)],
      ['Properties For Rent', String(analytics.properties.rent)],
      ['Ready Properties', String(analytics.properties.ready)],
      ['Off Plan Properties', String(analytics.properties.offPlan)],
      ['Total Bookings', String(analytics.bookings.total)],
      ['Scheduled Bookings', String(analytics.bookings.scheduled)],
      ['Completed Bookings', String(analytics.bookings.completed)],
      ['Handoff Rate', `${(analytics.handoffRate * 100).toFixed(1)}%`],
      ['Avg Response Time', `${analytics.avgResponseTime}s`],
      ['Property Match Rate', `${(analytics.propertyMatchRate * 100).toFixed(1)}%`],
      ['Nudge Conversion Rate', `${(analytics.nudges.conversionRate * 100).toFixed(1)}%`],
    ]
    const csv = generateCSV(headers, rows)
    downloadCSV(csv, `iere-analytics-summary-${getDateString()}.csv`)
  }

  const handleExportConversations = () => {
    if (!analytics) return
    const headers = ['Date', 'Conversation Count']
    const rows = analytics.conversationVolume.map((d) => [d.date, String(d.count)])
    const csv = generateCSV(headers, rows)
    downloadCSV(csv, `iere-conversation-data-${getDateString()}.csv`)
  }

  const handleExportLeadScores = () => {
    if (!analytics) return
    const headers = ['Score Range', 'Contact Count']
    const rows = analytics.leadScoreDistribution.map((d) => [d.score, String(d.count)])
    const csv = generateCSV(headers, rows)
    downloadCSV(csv, `iere-lead-scores-${getDateString()}.csv`)
  }

  const handlePrintReport = () => {
    window.print()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-800 dark:hover:text-emerald-300"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={handleExportSummary}
          className="gap-2.5 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Export Summary (CSV)</span>
            <span className="text-[11px] text-muted-foreground">All 6 card metrics</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportConversations}
          className="gap-2.5 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Export Conversations (CSV)</span>
            <span className="text-[11px] text-muted-foreground">Volume data from chart</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportLeadScores}
          className="gap-2.5 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Export Lead Scores (CSV)</span>
            <span className="text-[11px] text-muted-foreground">Lead score distribution</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handlePrintReport}
          className="gap-2.5 cursor-pointer"
        >
          <Printer className="h-4 w-4 text-blue-600" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Print Report</span>
            <span className="text-[11px] text-muted-foreground">Styled print layout</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
