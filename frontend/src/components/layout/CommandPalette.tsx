'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore, type AppPage } from '@/lib/store'
import { useTheme } from 'next-themes'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  Inbox,
  Users,
  Building2,
  UserCog,
  BookOpen,
  GitBranch,
  CalendarCheck,
  BarChart3,
  Bell,
  Smartphone,
  Settings,
  UsersRound,
  ArrowRightLeft,
  CreditCard,
  Code2,
  UserPlus,
  CalendarPlus,
  Sun,
  Moon,
  Clock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Page definitions                                                   */
/* ------------------------------------------------------------------ */

interface PageEntry {
  page: AppPage
  label: string
  keywords: string[]
  icon: LucideIcon
}

const pages: PageEntry[] = [
  { page: 'dashboard', label: 'Dashboard', keywords: ['home', 'overview', 'stats'], icon: LayoutDashboard },
  { page: 'inbox', label: 'Inbox', keywords: ['conversations', 'messages', 'chat', 'whatsapp'], icon: Inbox },
  { page: 'contacts', label: 'Contacts & Leads', keywords: ['leads', 'people', 'clients'], icon: Users },
  { page: 'properties', label: 'Properties', keywords: ['listings', 'real estate', 'buildings'], icon: Building2 },
  { page: 'agents', label: 'Team', keywords: ['members', 'staff', 'agents', 'colleagues'], icon: UserCog },
  { page: 'knowledge-base', label: 'Knowledge Base', keywords: ['kb', 'documents', 'rag', 'faq'], icon: BookOpen },
  { page: 'flows', label: 'Flows', keywords: ['automation', 'bot', 'conversation', 'workflow'], icon: GitBranch },
  { page: 'bookings', label: 'Bookings', keywords: ['calendar', 'viewing', 'appointments'], icon: CalendarCheck },
  { page: 'analytics', label: 'Analytics', keywords: ['reports', 'charts', 'insights', 'metrics'], icon: BarChart3 },
  { page: 'nudges', label: 'Nudges', keywords: ['follow-up', 'reminders', 'engagement'], icon: Bell },
  { page: 'devices', label: 'Devices', keywords: ['whatsapp', 'phone', 'baileys', 'qr'], icon: Smartphone },
  { page: 'settings', label: 'Settings', keywords: ['config', 'general', 'preferences'], icon: Settings },
  { page: 'settings-team', label: 'Settings / Team', keywords: ['team settings', 'assignments', 'routing'], icon: UsersRound },
  { page: 'settings-handoff', label: 'Settings / Handoff', keywords: ['handoff', 'ai to human', 'escalation'], icon: ArrowRightLeft },
  { page: 'settings-billing', label: 'Settings / Billing', keywords: ['billing', 'plan', 'subscription', 'payment'], icon: CreditCard },
  { page: 'settings-api', label: 'Settings / API', keywords: ['api', 'webhooks', 'keys', 'integration'], icon: Code2 },
]

const pageMap = new Map<AppPage, PageEntry>(pages.map((p) => [p.page, p]))

/* ------------------------------------------------------------------ */
/*  Quick action definitions                                           */
/* ------------------------------------------------------------------ */

interface ActionEntry {
  id: string
  label: string
  keywords: string[]
  icon: LucideIcon
  shortcut?: string
}

const actions: ActionEntry[] = [
  { id: 'add-property', label: 'Add Property', keywords: ['new', 'create', 'listing'], icon: Building2 },
  { id: 'add-contact', label: 'Add Contact', keywords: ['new', 'create', 'lead'], icon: UserPlus },
  { id: 'create-booking', label: 'Create Booking', keywords: ['new', 'schedule', 'viewing'], icon: CalendarPlus },
  { id: 'toggle-theme', label: 'Toggle Theme', keywords: ['dark', 'light', 'mode', 'appearance'], icon: Sun },
]

/* ------------------------------------------------------------------ */
/*  Command Palette Component                                          */
/* ------------------------------------------------------------------ */

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const recentPages = useAppStore((s) => s.recentPages)
  const currentPage = useAppStore((s) => s.currentPage)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const { theme, setTheme } = useTheme()

  /* Cmd+K / Ctrl+K keyboard shortcut */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  /* Expose open setter for external trigger (search bar click) */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail
      if (typeof detail === 'boolean') setOpen(detail)
    }
    window.addEventListener('command-palette-open', handler)
    return () => window.removeEventListener('command-palette-open', handler)
  }, [])

  const navigateTo = useCallback(
    (page: AppPage) => {
      setOpen(false)
      setCurrentPage(page)
    },
    [setCurrentPage],
  )

  const runAction = useCallback(
    (actionId: string) => {
      setOpen(false)
      switch (actionId) {
        case 'add-property':
          setCurrentPage('properties')
          break
        case 'add-contact':
          setCurrentPage('contacts')
          break
        case 'create-booking':
          setCurrentPage('bookings')
          break
        case 'toggle-theme':
          setTheme(theme === 'dark' ? 'light' : 'dark')
          break
      }
    },
    [setCurrentPage, setTheme, theme],
  )

  /* Build recent entries — exclude current page */
  const recentEntries = recentPages
    .filter((p) => p !== currentPage)
    .slice(0, 3)
    .map((p) => pageMap.get(p))
    .filter((p): p is PageEntry => p !== undefined)

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Palette"
      description="Search pages, actions, and navigate the dashboard"
      className="sm:max-w-[640px]"
    >
      <CommandInput placeholder="Search pages, contacts, properties, actions…" />

      <CommandList className="max-h-[380px]">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <SearchIcon className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No results found.</p>
          </div>
        </CommandEmpty>

        {/* Recent Pages */}
        {recentEntries.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentEntries.map((entry) => (
                <CommandItem
                  key={`recent-${entry.page}`}
                  value={`recent ${entry.label} ${entry.keywords.join(' ')}`}
                  onSelect={() => navigateTo(entry.page)}
                  className="gap-3"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                    <entry.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{entry.label}</span>
                    <span className="text-[11px] text-muted-foreground">Recently visited</span>
                  </div>
                  <Clock className="ml-auto h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* All Pages */}
        <CommandGroup heading="Pages">
          {pages.map((entry) => {
            const isCurrent = entry.page === currentPage
            return (
              <CommandItem
                key={entry.page}
                value={`${entry.label} ${entry.keywords.join(' ')}`}
                onSelect={() => navigateTo(entry.page)}
                className="gap-3"
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                  <entry.icon className={`h-4 w-4 ${isCurrent ? 'text-emerald-600' : 'text-emerald-500/70'}`} />
                </div>
                <span className="text-sm truncate">{entry.label}</span>
                {isCurrent && (
                  <span className="ml-auto text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950 rounded-full px-2 py-0.5 font-medium shrink-0">
                    Current
                  </span>
                )}
                {!isCurrent && (
                  <span className="ml-auto text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono shrink-0 hidden sm:inline-block">
                    {entry.page}
                  </span>
                )}
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          {actions.map((action) => (
            <CommandItem
              key={action.id}
              value={`action ${action.label} ${action.keywords.join(' ')}`}
              onSelect={() => runAction(action.id)}
              className="gap-3"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 shrink-0">
                {action.id === 'toggle-theme' ? (
                  theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Moon className="h-4 w-4 text-emerald-600" />
                  )
                ) : (
                  <action.icon className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <span className="text-sm">{action.label}</span>
              <kbd className="ml-auto text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono border shrink-0 hidden sm:inline-block">
                {action.id === 'add-property' && '⌘P'}
                {action.id === 'add-contact' && '⌘N'}
                {action.id === 'create-booking' && '⌘B'}
              </kbd>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      {/* Footer hints */}
      <div className="border-t px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground select-none bg-muted/30">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded px-1 py-0.5 bg-background border text-[10px] font-mono">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded px-1 py-0.5 bg-background border text-[10px] font-mono">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded px-1 py-0.5 bg-background border text-[10px] font-mono">esc</kbd>
            Close
          </span>
        </div>
        <span className="hidden sm:flex items-center gap-1">
          <kbd className="rounded px-1 py-0.5 bg-background border text-[10px] font-mono">⌘K</kbd>
          Toggle
        </span>
      </div>
    </CommandDialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Helper: trigger from outside the component                        */
/* ------------------------------------------------------------------ */

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent('command-palette-open', { detail: true }))
}

/* ------------------------------------------------------------------ */
/*  Small search icon for empty state (avoids circular import)         */
/* ------------------------------------------------------------------ */

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
