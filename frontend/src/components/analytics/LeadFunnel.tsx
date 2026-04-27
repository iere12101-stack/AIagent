'use client'

import { ArrowRight, CalendarDays, CheckCircle2, Sparkles, Target, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import type { LeadFunnelSnapshot } from '@/types'

interface LeadFunnelProps extends LeadFunnelSnapshot {
  loading?: boolean
}

export function LeadFunnel({
  contactTotal,
  qualifiedLeadCount,
  matchedLeadCount,
  bookingCount,
  convertedCount,
  loading = false,
}: LeadFunnelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-52" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const stages = [
    {
      label: 'Captured',
      value: contactTotal,
      icon: <Users className="h-4 w-4 text-emerald-600" />,
    },
    {
      label: 'Qualified',
      value: qualifiedLeadCount,
      icon: <Target className="h-4 w-4 text-blue-600" />,
    },
    {
      label: 'Matched',
      value: matchedLeadCount,
      icon: <Sparkles className="h-4 w-4 text-violet-600" />,
    },
    {
      label: 'Booked',
      value: bookingCount,
      icon: <CalendarDays className="h-4 w-4 text-amber-600" />,
    },
    {
      label: 'Converted',
      value: convertedCount,
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    },
  ]

  const base = Math.max(contactTotal, 1)

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Lead Funnel</CardTitle>
        <CardDescription>
          Live conversion stages from captured leads through bookings and conversions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, index) => {
          const rate = Math.round((stage.value / base) * 100)

          return (
            <div key={stage.label} className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {stage.icon}
                  <div>
                    <p className="text-sm font-semibold">{stage.label}</p>
                    <p className="text-xs text-muted-foreground">{rate}% of captured leads</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{stage.value.toLocaleString()}</p>
                  {index < stages.length - 1 ? (
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  ) : null}
                </div>
              </div>
              <Progress value={rate} className="mt-3 h-2.5" />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default LeadFunnel
