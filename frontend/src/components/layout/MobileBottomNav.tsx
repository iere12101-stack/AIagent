'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  MessageSquare,
  Columns3,
  Building2,
  MoreHorizontal,
  Users,
  GitBranch,
  BookOpen,
  CalendarDays,
  BarChart3,
  Bell,
  Smartphone,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { useAppStore, type AppPage } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

// ── Tab Config ──────────────────────────────────────────────────────────────

interface TabConfig {
  key: AppPage
  label: string
  icon: LucideIcon
  mainTab?: boolean
  unread?: number
}

const MAIN_TABS: TabConfig[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, mainTab: true },
  { key: 'inbox', label: 'Inbox', icon: MessageSquare, mainTab: true, unread: 5 },
  { key: 'pipeline', label: 'Pipeline', icon: Columns3, mainTab: true },
  { key: 'properties', label: 'Properties', icon: Building2, mainTab: true },
]

const MORE_TABS: TabConfig[] = [
  { key: 'contacts', label: 'Contacts', icon: Users },
  { key: 'agents', label: 'Team', icon: Users },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'bookings', label: 'Bookings', icon: CalendarDays },
  { key: 'nudges', label: 'Nudges', icon: Bell },
  { key: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { key: 'flows', label: 'Flows', icon: GitBranch },
  { key: 'devices', label: 'Devices', icon: Smartphone },
  { key: 'settings', label: 'Settings', icon: Settings },
]

// ── Component ───────────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const { currentPage, setCurrentPage, sidebarOpen } = useAppStore()
  const [moreOpen, setMoreOpen] = useState(false)

  // Hide when sidebar is open on mobile
  if (sidebarOpen) return null

  const handleNavigate = (page: AppPage) => {
    setCurrentPage(page)
    setMoreOpen(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <nav className="relative bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-t border-border/60 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-2">
          {MAIN_TABS.map((tab) => {
            const isActive = currentPage === tab.key || (tab.key === 'inbox' && currentPage === 'inbox')
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => handleNavigate(tab.key)}
                className={cn(
                  'mobile-nav-item flex flex-col items-center justify-center gap-0.5 w-full h-full relative transition-colors duration-200 active:scale-95',
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <span className="mobile-nav-indicator absolute -top-px left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full bg-emerald-500 transition-all duration-300" />
                )}
                <div className="relative">
                  <Icon className={cn(
                    'h-5 w-5 transition-all duration-200',
                    isActive && 'scale-110'
                  )} />
                  {/* Unread badge for inbox */}
                  {tab.key === 'inbox' && typeof tab.unread === 'number' && tab.unread > 0 && (
                    <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white leading-none">
                      {tab.unread}
                    </span>
                  )}
                </div>
                <span className={cn(
                  'text-[10px] leading-none transition-all duration-200',
                  isActive ? 'font-semibold' : 'font-medium'
                )}>
                  {tab.label}
                </span>
              </button>
            )
          })}

          {/* More tab with Sheet */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  'mobile-nav-item flex flex-col items-center justify-center gap-0.5 w-full h-full relative transition-colors duration-200 active:scale-95',
                  moreOpen
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {moreOpen && (
                  <span className="mobile-nav-indicator absolute -top-px left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full bg-emerald-500 transition-all duration-300" />
                )}
                <MoreHorizontal className={cn(
                  'h-5 w-5 transition-all duration-200',
                  moreOpen && 'scale-110'
                )} />
                <span className={cn(
                  'text-[10px] leading-none transition-all duration-200',
                  moreOpen ? 'font-semibold' : 'font-medium'
                )}>
                  More
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
              <SheetHeader className="sr-only">
                <SheetTitle>More Pages</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col">
                {/* Handle bar */}
                <div className="flex justify-center pt-2 pb-4">
                  <div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
                </div>

                {/* Menu items */}
                <div className="grid grid-cols-3 gap-1 px-2 pb-6">
                  {MORE_TABS.map((tab) => {
                    const isActive = currentPage === tab.key
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.key}
                        onClick={() => handleNavigate(tab.key)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-200',
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : 'hover:bg-muted text-foreground'
                        )}
                      >
                        <div className={cn(
                          'rounded-lg p-2.5 transition-colors',
                          isActive
                            ? 'bg-emerald-100 dark:bg-emerald-900/50'
                            : 'bg-muted/50'
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={cn(
                          'text-xs leading-none',
                          isActive ? 'font-semibold' : 'font-medium text-muted-foreground'
                        )}>
                          {tab.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  )
}
