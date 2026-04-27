'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Brain, Mail, Phone, UserRound } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface ContactMemoryEntry {
  key: string
  value: string
}

interface ContactDetail {
  id: string
  name: string | null
  phone: string
  email: string | null
  pushName: string | null
  leadScore: number
  leadStatus: string
  language: string
  intent: string | null
  areaInterest: string | null
  bedrooms: string | null
  budget: string | null
  timeline: string | null
  handledBy: string
  notes: string | null
  conversationCount: number
  memory: ContactMemoryEntry[]
}

export function ContactDetailRoute({ contactId }: { contactId: string }) {
  const contactQuery = useQuery<{ data: ContactDetail }>({
    queryKey: ['contact-detail-page', contactId],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}`)
      if (!response.ok) {
        throw new Error('Failed to load contact')
      }
      return response.json()
    },
  })

  const contact = contactQuery.data?.data

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 -ml-3 w-fit gap-2">
            <Link href="/contacts">
              <ArrowLeft className="h-4 w-4" />
              Back to contacts
            </Link>
          </Button>
          <h1 className="text-display">Contact Detail</h1>
          <p className="text-subtitle">Full lead profile, memory, and qualification context.</p>
        </div>
        {contact ? (
          <Badge variant="outline" className="w-fit text-sm">
            {contact.leadStatus} • {contact.leadScore}/100
          </Badge>
        ) : null}
      </div>

      {contactQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : contact ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>{contact.name || contact.pushName || 'Unnamed contact'}</CardTitle>
              <CardDescription>Lead profile and qualification summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Phone
                  </div>
                  <p className="font-medium">{contact.phone}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p className="font-medium">{contact.email || 'Not provided'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserRound className="h-4 w-4" />
                    Intent
                  </div>
                  <p className="font-medium">{contact.intent || 'Not captured'}</p>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Language</div>
                  <p className="font-medium">{contact.language.toUpperCase()}</p>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Area Interest</div>
                  <p className="font-medium">{contact.areaInterest || 'Not captured'}</p>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Budget</div>
                  <p className="font-medium">{contact.budget || 'Not captured'}</p>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Bedrooms</div>
                  <p className="font-medium">{contact.bedrooms || 'Not captured'}</p>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Timeline</div>
                  <p className="font-medium">{contact.timeline || 'Not captured'}</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">Handled By</div>
                  <div className="mt-1 text-lg font-semibold capitalize">{contact.handledBy}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">Conversations</div>
                  <div className="mt-1 text-lg font-semibold">{contact.conversationCount}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">Lead Score</div>
                  <div className="mt-1 text-lg font-semibold">{contact.leadScore}</div>
                </div>
              </div>

              {contact.notes ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Notes</div>
                    <p className="text-sm leading-6">{contact.notes}</p>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-emerald-600" />
                Contact Memory
              </CardTitle>
              <CardDescription>Persistent memory passed into AI and routing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {contact.memory.length > 0 ? (
                contact.memory.map((entry) => (
                  <div key={entry.key} className="rounded-xl border p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{entry.key}</div>
                    <div className="mt-2 text-sm leading-6">{entry.value}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No structured memory has been saved for this contact yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Contact not found or unavailable for this organization.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
