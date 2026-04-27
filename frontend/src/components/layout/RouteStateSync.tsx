'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { routeToPage } from '@/lib/page-routes'
import { useAppStore } from '@/lib/store'

export function RouteStateSync() {
  const pathname = usePathname()
  const setCurrentPage = useAppStore((state) => state.setCurrentPage)

  useEffect(() => {
    setCurrentPage(routeToPage(pathname), { navigate: false })
  }, [pathname, setCurrentPage])

  return null
}
