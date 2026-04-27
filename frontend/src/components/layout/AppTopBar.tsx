'use client'

import { useTheme } from 'next-themes'
import { CircleHelp, ChevronRight, LogOut, Moon, Search, Settings, Sun, User } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useAuthProfile } from '@/lib/use-auth-profile'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { openCommandPalette } from './CommandPalette'
import { KeyboardShortcuts } from './KeyboardShortcuts'
import { NotificationBell } from '@/components/notifications/NotificationCenter'

function restartTour() {
  window.dispatchEvent(new Event('restart-tour'))
}

const pageNames: Record<string, string> = {
  dashboard: 'Dashboard',
  inbox: 'Inbox',
  contacts: 'Contacts',
  pipeline: 'Pipeline',
  properties: 'Properties',
  agents: 'Team',
  'knowledge-base': 'Knowledge Base',
  flows: 'Flows',
  bookings: 'Bookings',
  analytics: 'Analytics',
  nudges: 'Nudges',
  devices: 'Devices',
  settings: 'Settings',
  'settings-team': 'Settings / Team',
  'settings-handoff': 'Settings / Handoff',
  'settings-billing': 'Settings / Billing',
  'settings-api': 'Settings / API',
}

export function AppTopBar() {
  const currentPage = useAppStore((state) => state.currentPage)
  const setCurrentPage = useAppStore((state) => state.setCurrentPage)
  const { theme, setTheme } = useTheme()
  const authProfile = useAuthProfile()

  const pageName = pageNames[currentPage] || 'Dashboard'

  return (
    <header className="header-glass sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white px-4 transition-colors dark:bg-gray-950 md:px-6">
      <SidebarTrigger className="-ml-1" />

      <nav className="hidden items-center gap-1.5 text-sm md:flex">
        <span
          className="breadcrumb-link cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setCurrentPage('dashboard')}
        >
          Home
        </span>
        {currentPage !== 'dashboard' ? (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
            {pageName.includes(' / ')
              ? pageName.split(' / ').map((segment, index, segments) => (
                  <span key={segment} className="flex items-center gap-1.5">
                    {index > 0 ? (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                    ) : null}
                    <span
                      className={
                        index === segments.length - 1
                          ? 'breadcrumb-link-active font-medium text-foreground'
                          : 'breadcrumb-link cursor-pointer text-muted-foreground transition-colors hover:text-foreground'
                      }
                      onClick={() => {
                        if (index === 0) {
                          setCurrentPage('settings')
                        }
                      }}
                    >
                      {segment}
                    </span>
                  </span>
                ))
              : <span className="font-medium text-foreground">{pageName}</span>}
          </>
        ) : null}
      </nav>

      <div className="text-sm font-medium md:hidden">{pageName}</div>
      <div className="flex-1" />

      <button
        type="button"
        onClick={openCommandPalette}
        className="search-glow glass-input relative hidden h-9 w-full max-w-sm items-center rounded-md border-0 bg-muted/50 pl-9 pr-3 text-left text-sm text-muted-foreground transition-all duration-200 hover:bg-muted lg:flex"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <span className="truncate">Search pages, contacts, properties...</span>
        <kbd className="pointer-events-none ml-auto rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          Ctrl+K
        </kbd>
      </button>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          onClick={restartTour}
          title="Restart tour"
        >
          <CircleHelp className="h-4 w-4" />
          <span className="sr-only">Help</span>
        </Button>
        <kbd className="hidden items-center rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          Ctrl+/
        </kbd>
      </div>

      <KeyboardShortcuts />

      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-emerald-600 text-xs font-semibold text-white">
                {authProfile.initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="user-menu-glass w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{authProfile.displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {authProfile.profile?.email ?? 'Loading...'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCurrentPage('settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
