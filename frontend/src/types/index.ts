export interface ApiErrorResponse {
  success?: false
  error: string
  code?: string
  details?: unknown
}

export interface CursorPage<T> {
  data: T[]
  nextCursor: string | null
  total: number
}

export interface PropertyRecord {
  id: string
  orgId: string
  refNumber: string
  transactionType: string
  category: string
  bedrooms: string | null
  bathrooms: string | null
  sizeSqft: number | null
  status: string | null
  district: string | null
  building: string | null
  fullArea: string | null
  priceAed: number
  agentName: string | null
  agentWhatsapp: string | null
  available: boolean
  permitNumber?: string | null
  portal?: string | null
  listedOn?: string | null
  lastUpdated?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface PropertyFilters {
  search: string
  type: string
  bedrooms: string
  status: string
  category: string
  area: string
  minPrice: string
  maxPrice: string
  available?: boolean
}

export interface ContactRecord {
  id: string
  name: string | null
  phone: string
  pushName?: string | null
  leadScore?: number
  leadStatus?: string
  language?: string
  intent?: string | null
  areaInterest?: string | null
  budget?: string | null
  bedrooms?: string | null
}

export interface ConversationRecord {
  id: string
  contactId: string
  status: string
  handledBy: string
  assignedTo?: string | null
  leadScore: number
  detectedIntent?: string | null
  detectedLang: string
  lastMessageAt?: string | null
  unreadCount: number
  contact: ContactRecord
  lastMessagePreview?: string
  lastMessageSenderType?: string | null
  lastMessageStatus?: string | null
}

export interface MessageRecord {
  id: string
  conversationId: string
  direction: string
  senderType: string
  senderName?: string | null
  content: string
  messageType: string
  status?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export interface NudgeRecord {
  id: string
  orgId: string
  contactId: string
  conversationId?: string | null
  nudgeType: string
  scheduledAt: string
  sentAt: string | null
  cancelledAt: string | null
  status: string
  messageSent: string | null
  createdAt: string
  contact: {
    name: string | null
    phone: string
  }
}

export interface AreaDemandDatum {
  area: string
  count: number
}

export interface LeadFunnelSnapshot {
  contactTotal: number
  qualifiedLeadCount: number
  matchedLeadCount: number
  bookingCount: number
  convertedCount: number
}
