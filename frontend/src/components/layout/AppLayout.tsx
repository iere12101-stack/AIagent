'use client'

import { useSyncExternalStore } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppTopBar } from './AppTopBar'
import { CommandPalette } from './CommandPalette'
import { MobileBottomNav } from './MobileBottomNav'

function subscribeToHydration() {
  return () => {}
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="p-4 md:p-6">
          <div className="h-6 w-40 rounded-md bg-muted animate-pulse" />
          <div className="mt-4 h-28 rounded-xl bg-muted animate-pulse" />
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-1 flex-col min-h-screen">
        <AppTopBar />
        <main className="flex-1 p-4 md:p-6 pb-16 md:pb-6 bg-gray-50/50 dark:bg-gray-950 overflow-auto transition-colors">
          {children}
        </main>
        <MobileBottomNav />
        {/* Footer */}
        <footer className="app-footer hidden md:block">
          <hr className="app-footer-gradient" />
          <div className="px-6 py-3 flex items-center justify-center">
            <p className="text-xs font-semibold text-black dark:text-white [text-shadow:0_0_8px_rgba(16,185,129,0.35)]">
              &copy; 2026 IERE Dubai. Developed by Ayaz Khan. Powered by Artificial Intelligence.
            </p>
          </div>
        </footer>
      </div>
      <CommandPalette />
    </SidebarProvider>
  )
}
