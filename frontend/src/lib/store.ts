import { create } from 'zustand'
import { pageToRoute } from '@/lib/page-routes'

export type AppPage = 
  | 'dashboard'
  | 'inbox'
  | 'contacts'
  | 'pipeline'
  | 'properties'
  | 'agents'
  | 'knowledge-base'
  | 'flows'
  | 'bookings'
  | 'analytics'
  | 'nudges'
  | 'activity-log'
  | 'settings'
  | 'settings-team'
  | 'settings-handoff'
  | 'settings-billing'
  | 'settings-api'
  | 'settings-notifications'
  | 'devices'
  | 'team-performance'

export interface ConversationLabel {
  id: string
  name: string
  color: string
  bgColor: string
  textColor: string
}

export const PRESET_LABELS: ConversationLabel[] = [
  { id: 'vip', name: 'VIP', color: 'red', bgColor: 'bg-red-500/15 dark:bg-red-500/20', textColor: 'text-red-600 dark:text-red-400' },
  { id: 'hot-lead', name: 'Hot Lead', color: 'orange', bgColor: 'bg-orange-500/15 dark:bg-orange-500/20', textColor: 'text-orange-600 dark:text-orange-400' },
  { id: 'price-negotiation', name: 'Price Negotiation', color: 'amber', bgColor: 'bg-amber-500/15 dark:bg-amber-500/20', textColor: 'text-amber-600 dark:text-amber-400' },
  { id: 'viewing-scheduled', name: 'Viewing Scheduled', color: 'blue', bgColor: 'bg-blue-500/15 dark:bg-blue-500/20', textColor: 'text-blue-600 dark:text-blue-400' },
  { id: 'follow-up', name: 'Follow-up', color: 'purple', bgColor: 'bg-purple-500/15 dark:bg-purple-500/20', textColor: 'text-purple-600 dark:text-purple-400' },
  { id: 'arabic-speaker', name: 'Arabic Speaker', color: 'cyan', bgColor: 'bg-cyan-500/15 dark:bg-cyan-500/20', textColor: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'off-plan-interest', name: 'Off-Plan Interest', color: 'emerald', bgColor: 'bg-emerald-500/15 dark:bg-emerald-500/20', textColor: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'new-client', name: 'New Client', color: 'gray', bgColor: 'bg-gray-500/15 dark:bg-gray-500/20', textColor: 'text-gray-600 dark:text-gray-400' },
]

interface AppState {
  currentPage: AppPage
  selectedConversationId: string | null
  selectedContactId: string | null
  sidebarOpen: boolean
  recentPages: AppPage[]
  conversationLabels: Record<string, string[]>
  setCurrentPage: (page: AppPage, options?: { navigate?: boolean }) => void
  setSelectedConversation: (id: string | null) => void
  setSelectedContact: (id: string | null) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setConversationLabel: (conversationId: string, labelId: string) => void
  removeConversationLabel: (conversationId: string, labelId: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  selectedConversationId: null,
  selectedContactId: null,
  sidebarOpen: true,
  recentPages: [],
  conversationLabels: {},
  setCurrentPage: (page, options) => {
    set((s) => ({
      currentPage: page,
      recentPages: [
        page,
        ...s.recentPages.filter((p) => p !== page),
      ].slice(0, 5),
    }))

    if (options?.navigate === false || typeof window === 'undefined') {
      return
    }

    const targetRoute = pageToRoute(page)
    if (window.location.pathname !== targetRoute) {
      window.location.assign(targetRoute)
    }
  },
  setSelectedConversation: (id) => set({ selectedConversationId: id }),
  setSelectedContact: (id) => set({ selectedContactId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setConversationLabel: (conversationId, labelId) =>
    set((s) => {
      const existing = s.conversationLabels[conversationId] || []
      if (existing.includes(labelId)) return s
      return {
        conversationLabels: {
          ...s.conversationLabels,
          [conversationId]: [...existing, labelId],
        },
      }
    }),
  removeConversationLabel: (conversationId, labelId) =>
    set((s) => {
      const existing = s.conversationLabels[conversationId] || []
      const filtered = existing.filter((l) => l !== labelId)
      if (filtered.length === 0) {
        const { [conversationId]: _, ...rest } = s.conversationLabels
        return { conversationLabels: rest }
      }
      return {
        conversationLabels: {
          ...s.conversationLabels,
          [conversationId]: filtered,
        },
      }
    }),
}))
