import type { AppPage } from '@/lib/store'

export const PAGE_ROUTE_MAP: Record<AppPage, string> = {
  dashboard: '/dashboard',
  inbox: '/inbox',
  contacts: '/contacts',
  pipeline: '/pipeline',
  properties: '/properties',
  agents: '/agents',
  'knowledge-base': '/knowledge-base',
  flows: '/flows',
  bookings: '/bookings',
  analytics: '/analytics',
  nudges: '/nudges',
  'activity-log': '/activity-log',
  settings: '/settings',
  'settings-team': '/settings/team',
  'settings-handoff': '/settings/handoff',
  'settings-billing': '/settings/billing',
  'settings-api': '/settings/api',
  'settings-notifications': '/settings/notifications',
  devices: '/devices',
  'team-performance': '/team-performance',
}

export function pageToRoute(page: AppPage): string {
  return PAGE_ROUTE_MAP[page] ?? '/dashboard'
}

export function routeToPage(pathname: string): AppPage {
  const normalized = pathname.replace(/\/+$/, '') || '/'

  if (normalized === '/settings/team') return 'settings-team'
  if (normalized === '/settings/handoff') return 'settings-handoff'
  if (normalized === '/settings/billing') return 'settings-billing'
  if (normalized === '/settings/api') return 'settings-api'
  if (normalized === '/settings/notifications') return 'settings-notifications'

  if (normalized === '/pipeline') return 'pipeline'
  if (normalized === '/inbox') return 'inbox'
  if (normalized === '/contacts' || normalized.startsWith('/contacts/')) return 'contacts'
  if (normalized === '/properties' || normalized.startsWith('/properties/')) return 'properties'
  if (normalized === '/agents' || normalized.startsWith('/agents/')) return 'agents'
  if (normalized === '/knowledge-base' || normalized.startsWith('/knowledge-base/')) return 'knowledge-base'
  if (normalized === '/flows' || normalized.startsWith('/flows/')) return 'flows'
  if (normalized === '/bookings') return 'bookings'
  if (normalized === '/analytics') return 'analytics'
  if (normalized === '/nudges') return 'nudges'
  if (normalized === '/devices' || normalized.startsWith('/devices/')) return 'devices'
  if (normalized === '/team-performance') return 'team-performance'
  if (normalized === '/activity-log') return 'activity-log'
  if (normalized === '/settings' || normalized.startsWith('/settings/')) return 'settings'

  return 'dashboard'
}
