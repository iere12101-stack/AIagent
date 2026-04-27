'use client'

import type { ReactNode } from 'react'
import { AppLayout } from './AppLayout'

export function AppShell({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}

export default AppShell
