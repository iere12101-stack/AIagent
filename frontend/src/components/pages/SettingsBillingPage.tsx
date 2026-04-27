'use client'

import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle,
  CreditCard,
  ExternalLink,
  FileText,
  MessageSquare,
  Smartphone,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAppStore } from '@/lib/store'

interface BillingRouteResponse {
  data: {
    plan: string
    priceAed: number | null
    renewalDate: string | null
    usage: {
      messages: { used: number; limit: number }
      contacts: { used: number; limit: number }
      aiCalls: { used: number; limit: number }
      devices: { used: number; limit: number }
    }
    stripePortalUrl: string | null
    paymentMethod: {
      brand: string
      last4: string
      expMonth: number
      expYear: number
    } | null
    history: Array<{
      id: string
      date: string
      amountAed: number
      status: 'paid' | 'pending' | 'failed'
      description: string
      invoiceUrl: string | null
    }>
    stripeConfigured: boolean
  }
}

async function fetchBillingSettings(): Promise<BillingRouteResponse> {
  const response = await fetch('/api/settings/billing')
  if (!response.ok) {
    throw new Error('Failed to load billing settings')
  }

  return response.json()
}

function UsageCard({
  title,
  used,
  limit,
  icon,
}: {
  title: string
  used: number
  limit: number
  icon: React.ReactNode
}) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{used.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Limit {limit.toLocaleString()}</p>
        </div>
        <Progress value={percent} className="h-2" />
        <p className="text-xs text-muted-foreground">{percent}% of monthly allowance used</p>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function SettingsBillingPage() {
  const { setCurrentPage } = useAppStore()
  const billingQuery = useQuery({
    queryKey: ['settings-billing'],
    queryFn: fetchBillingSettings,
    staleTime: 30_000,
  })

  const billing = billingQuery.data?.data

  if (billingQuery.isLoading) {
    return <LoadingSkeleton />
  }

  if (billingQuery.isError || !billing) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <p className="font-medium">Billing data could not be loaded</p>
          <p className="text-sm text-muted-foreground">
            Stripe and usage details are live only when the billing API responds.
          </p>
          <Button variant="outline" onClick={() => void billingQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const renewalLabel = billing.renewalDate
    ? new Date(billing.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not set'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage('settings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-amber-500" />
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground">Review live usage, payment details, and invoice history</p>
        </div>
      </div>

      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{billing.plan.toUpperCase()} Plan</h2>
              <Badge className="bg-amber-500 text-white">Current</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {billing.priceAed ? `AED ${billing.priceAed.toLocaleString()}/month` : 'Custom pricing'}
              {' '}· Next renewal: {renewalLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {billing.stripeConfigured
                ? 'Stripe is configured for subscription management.'
                : 'Stripe keys are missing, so billing stays in degraded mode.'}
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!billing.stripePortalUrl}
            onClick={() => {
              if (billing.stripePortalUrl) {
                window.open(billing.stripePortalUrl, '_blank', 'noopener,noreferrer')
              }
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Manage Subscription
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <UsageCard
          title="Messages"
          used={billing.usage.messages.used}
          limit={billing.usage.messages.limit}
          icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
        />
        <UsageCard
          title="Contacts"
          used={billing.usage.contacts.used}
          limit={billing.usage.contacts.limit}
          icon={<Users className="h-4 w-4 text-emerald-500" />}
        />
        <UsageCard
          title="AI Calls"
          used={billing.usage.aiCalls.used}
          limit={billing.usage.aiCalls.limit}
          icon={<Sparkles className="h-4 w-4 text-purple-500" />}
        />
        <UsageCard
          title="Devices"
          used={billing.usage.devices.used}
          limit={billing.usage.devices.limit}
          icon={<Smartphone className="h-4 w-4 text-amber-500" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Payment Method
          </CardTitle>
          <CardDescription>Stored billing method from organization settings</CardDescription>
        </CardHeader>
        <CardContent>
          {billing.paymentMethod ? (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">
                  {billing.paymentMethod.brand} ending in {billing.paymentMethod.last4}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires {String(billing.paymentMethod.expMonth).padStart(2, '0')}/{billing.paymentMethod.expYear}
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Active
              </Badge>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No payment method metadata is stored yet for this organization.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Billing History
          </CardTitle>
          <CardDescription>Invoices stored under organization billing settings</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {billing.history.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No invoice history has been recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billing.history.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">{invoice.id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-sm">{invoice.description}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      AED {invoice.amountAed.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          invoice.status === 'paid'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : invoice.status === 'pending'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                        }
                      >
                        {invoice.status === 'paid' ? <CheckCircle className="mr-1 h-3 w-3" /> : null}
                        {invoice.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
