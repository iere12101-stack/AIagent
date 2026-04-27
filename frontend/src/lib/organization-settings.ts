function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asNumber(value: unknown, fallback: number, min?: number, max?: number): number {
  const nextValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  const minValue = typeof min === 'number' ? Math.max(min, nextValue) : nextValue
  return typeof max === 'number' ? Math.min(max, minValue) : minValue
}

export type SupportedLanguage = 'en' | 'ar'
export type AssignmentPriority = 'area-expert' | 'round-robin' | 'least-busy' | 'lead-score'
export type AfterHoursMode = 'auto-reply' | 'queue' | 'off'
export type HandoffTriggerSentiment = 'negative' | 'neutral' | 'positive'
export type HandoffTriggerAction = 'immediate_handoff' | 'escalate' | 'priority'
export type HandoffRuleLevel = 'low' | 'medium' | 'high'

export interface GeneralSettingsRecord {
  organizationName: string
  organizationSlug: string
  plan: string
  timezone: string
  language: SupportedLanguage
  whatsapp: {
    maxRetries: number
    propertySyncMinutes: number
    nudge24h: boolean
    nudge72h: boolean
  }
}

export interface TeamSettingsRecord {
  defaultHandoffAgentId: string | null
  autoAssignEnabled: boolean
  roundRobinEnabled: boolean
  assignmentPriority: AssignmentPriority
}

export interface BillingHistoryItem {
  id: string
  date: string
  amountAed: number
  status: 'paid' | 'pending' | 'failed'
  description: string
  invoiceUrl: string | null
}

export interface BillingSettingsRecord {
  stripePortalUrl: string | null
  paymentMethod: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  } | null
  history: BillingHistoryItem[]
}

export interface HandoffTrigger {
  id: string
  keyword: string
  sentiment: HandoffTriggerSentiment
  action: HandoffTriggerAction
  description: string
}

export interface EscalationRule {
  id: string
  condition: string
  level: HandoffRuleLevel
  action: string
}

export interface HandoffSettingsRecord {
  autoHandoffEnabled: boolean
  sentimentAnalysisEnabled: boolean
  maxAiMessagesBeforePrompt: number
  handoffDelaySeconds: number
  conditions: {
    negativeSentiment: boolean
    explicitRequest: boolean
    priceNegotiation: boolean
    complexComparison: boolean
    maxMessageCount: boolean
  }
  triggers: HandoffTrigger[]
  escalationRules: EscalationRule[]
  sla: {
    aiFirstResponseSeconds: number
    agentAcceptSeconds: number
    agentFirstReplySeconds: number
    escalationTimeoutSeconds: number
    resolutionTargetHours: number
    afterHoursMode: AfterHoursMode
  }
}

export interface WebhookSettingsItem {
  id: string
  url: string
  events: string[]
  status: 'active' | 'inactive'
  lastDeliveredAt: string | null
}

export interface ApiSettingsRecord {
  webhookRetry: boolean
  webhooks: WebhookSettingsItem[]
  rateLimitEnabled: boolean
  requestsPerMinute: number
  requestsPerHour: number
  burstLimit: number
  docsUrl: string
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettingsRecord = {
  organizationName: 'Investment Experts Real Estate',
  organizationSlug: 'iere',
  plan: 'pro',
  timezone: 'Asia/Dubai',
  language: 'en',
  whatsapp: {
    maxRetries: 3,
    propertySyncMinutes: 15,
    nudge24h: true,
    nudge72h: true,
  },
}

export const DEFAULT_TEAM_SETTINGS: TeamSettingsRecord = {
  defaultHandoffAgentId: null,
  autoAssignEnabled: true,
  roundRobinEnabled: false,
  assignmentPriority: 'area-expert',
}

export const DEFAULT_BILLING_SETTINGS: BillingSettingsRecord = {
  stripePortalUrl: null,
  paymentMethod: null,
  history: [],
}

export const DEFAULT_HANDOFF_SETTINGS: HandoffSettingsRecord = {
  autoHandoffEnabled: true,
  sentimentAnalysisEnabled: true,
  maxAiMessagesBeforePrompt: 10,
  handoffDelaySeconds: 30,
  conditions: {
    negativeSentiment: true,
    explicitRequest: true,
    priceNegotiation: true,
    complexComparison: true,
    maxMessageCount: true,
  },
  triggers: [
    {
      id: 'handoff-angry',
      keyword: 'angry',
      sentiment: 'negative',
      action: 'immediate_handoff',
      description: 'Escalate when the contact expresses frustration or anger.',
    },
    {
      id: 'handoff-human',
      keyword: 'human',
      sentiment: 'neutral',
      action: 'immediate_handoff',
      description: 'Hand off when the contact explicitly asks for a human agent.',
    },
    {
      id: 'handoff-manager',
      keyword: 'manager',
      sentiment: 'neutral',
      action: 'escalate',
      description: 'Escalate requests that ask for a manager or supervisor.',
    },
    {
      id: 'handoff-complaint',
      keyword: 'complaint',
      sentiment: 'negative',
      action: 'immediate_handoff',
      description: 'Escalate complaint-related conversations immediately.',
    },
    {
      id: 'handoff-ar-human',
      keyword: 'انسان',
      sentiment: 'neutral',
      action: 'immediate_handoff',
      description: 'Arabic request for a human agent.',
    },
  ],
  escalationRules: [
    {
      id: 'handoff-rule-unresolved',
      condition: '5 or more AI messages without resolution',
      level: 'medium',
      action: 'Notify an available agent',
    },
    {
      id: 'handoff-rule-sentiment',
      condition: 'Negative sentiment detected three times',
      level: 'high',
      action: 'Immediate human handoff',
    },
    {
      id: 'handoff-rule-vip',
      condition: 'Viewing request above AED 5M budget',
      level: 'high',
      action: 'Notify the sales manager',
    },
  ],
  sla: {
    aiFirstResponseSeconds: 5,
    agentAcceptSeconds: 120,
    agentFirstReplySeconds: 300,
    escalationTimeoutSeconds: 600,
    resolutionTargetHours: 24,
    afterHoursMode: 'auto-reply',
  },
}

export const DEFAULT_API_SETTINGS: ApiSettingsRecord = {
  webhookRetry: true,
  webhooks: [],
  rateLimitEnabled: true,
  requestsPerMinute: 100,
  requestsPerHour: 1000,
  burstLimit: 50,
  docsUrl: '/api',
}

export function normalizeGeneralSettings(org: {
  name?: unknown
  slug?: unknown
  plan?: unknown
  settings?: unknown
}): GeneralSettingsRecord {
  const settings = isRecord(org.settings) ? org.settings : {}
  const whatsapp = isRecord(settings.whatsapp) ? settings.whatsapp : {}

  return {
    organizationName: asString(org.name, DEFAULT_GENERAL_SETTINGS.organizationName),
    organizationSlug: asString(org.slug, DEFAULT_GENERAL_SETTINGS.organizationSlug),
    plan: asString(org.plan, DEFAULT_GENERAL_SETTINGS.plan),
    timezone: asString(settings.timezone, DEFAULT_GENERAL_SETTINGS.timezone),
    language: settings.language === 'ar' ? 'ar' : DEFAULT_GENERAL_SETTINGS.language,
    whatsapp: {
      maxRetries: asNumber(
        whatsapp.maxRetries,
        DEFAULT_GENERAL_SETTINGS.whatsapp.maxRetries,
        1,
        10,
      ),
      propertySyncMinutes: asNumber(
        whatsapp.propertySyncMinutes,
        DEFAULT_GENERAL_SETTINGS.whatsapp.propertySyncMinutes,
        5,
        120,
      ),
      nudge24h: asBoolean(whatsapp.nudge24h, DEFAULT_GENERAL_SETTINGS.whatsapp.nudge24h),
      nudge72h: asBoolean(whatsapp.nudge72h, DEFAULT_GENERAL_SETTINGS.whatsapp.nudge72h),
    },
  }
}

export function normalizeTeamSettings(settingsValue: unknown): TeamSettingsRecord {
  const settings = isRecord(settingsValue) ? settingsValue : {}
  const priority = asString(settings.assignmentPriority, DEFAULT_TEAM_SETTINGS.assignmentPriority)
  const assignmentPriority: AssignmentPriority = [
    'area-expert',
    'round-robin',
    'least-busy',
    'lead-score',
  ].includes(priority)
    ? (priority as AssignmentPriority)
    : DEFAULT_TEAM_SETTINGS.assignmentPriority

  return {
    defaultHandoffAgentId:
      typeof settings.defaultHandoffAgentId === 'string' && settings.defaultHandoffAgentId.length > 0
        ? settings.defaultHandoffAgentId
        : null,
    autoAssignEnabled: asBoolean(settings.autoAssignEnabled, DEFAULT_TEAM_SETTINGS.autoAssignEnabled),
    roundRobinEnabled: asBoolean(settings.roundRobinEnabled, DEFAULT_TEAM_SETTINGS.roundRobinEnabled),
    assignmentPriority,
  }
}

export function normalizeBillingSettings(settingsValue: unknown): BillingSettingsRecord {
  const settings = isRecord(settingsValue) ? settingsValue : {}
  const paymentMethodSource = isRecord(settings.paymentMethod) ? settings.paymentMethod : null
  const paymentMethod =
    paymentMethodSource
      ? {
          brand: asString(paymentMethodSource.brand, 'Card'),
          last4: asString(paymentMethodSource.last4, ''),
          expMonth: asNumber(paymentMethodSource.expMonth, 1, 1, 12),
          expYear: asNumber(paymentMethodSource.expYear, new Date().getFullYear(), 2000, 3000),
        }
      : null

  const historySource = Array.isArray(settings.history) ? settings.history : []
  const history = historySource
    .filter((item) => isRecord(item))
    .map((item) => ({
      id: asString(item.id, crypto.randomUUID()),
      date: asString(item.date, new Date().toISOString()),
      amountAed: asNumber(item.amountAed, 0, 0),
      status: (
        item.status === 'pending' || item.status === 'failed'
          ? item.status
          : 'paid'
      ) as BillingHistoryItem['status'],
      description: asString(item.description, 'Subscription charge'),
      invoiceUrl:
        typeof item.invoiceUrl === 'string' && item.invoiceUrl.length > 0 ? item.invoiceUrl : null,
    }))

  return {
    stripePortalUrl:
      typeof settings.stripePortalUrl === 'string' && settings.stripePortalUrl.length > 0
        ? settings.stripePortalUrl
        : null,
    paymentMethod: paymentMethod?.last4 ? paymentMethod : null,
    history,
  }
}

export function normalizeHandoffSettings(settingsValue: unknown): HandoffSettingsRecord {
  const settings = isRecord(settingsValue) ? settingsValue : {}
  const conditionsSource = isRecord(settings.conditions) ? settings.conditions : {}
  const slaSource = isRecord(settings.sla) ? settings.sla : {}
  const triggersSource = Array.isArray(settings.triggers) ? settings.triggers : []
  const escalationRulesSource = Array.isArray(settings.escalationRules) ? settings.escalationRules : []

  const triggers = triggersSource
    .filter((item) => isRecord(item))
    .map((item) => ({
      id: asString(item.id, crypto.randomUUID()),
      keyword: asString(item.keyword, ''),
      sentiment: (
        item.sentiment === 'positive' || item.sentiment === 'neutral'
          ? item.sentiment
          : 'negative'
      ) as HandoffTriggerSentiment,
      action: (
        item.action === 'escalate' || item.action === 'priority'
          ? item.action
          : 'immediate_handoff'
      ) as HandoffTriggerAction,
      description: asString(item.description, 'Custom handoff trigger'),
    }))
    .filter((item) => item.keyword.length > 0)

  const escalationRules = escalationRulesSource
    .filter((item) => isRecord(item))
    .map((item) => ({
      id: asString(item.id, crypto.randomUUID()),
      condition: asString(item.condition, ''),
      level: (
        item.level === 'low' || item.level === 'medium'
          ? item.level
          : 'high'
      ) as HandoffRuleLevel,
      action: asString(item.action, ''),
    }))
    .filter((item) => item.condition.length > 0 && item.action.length > 0)

  return {
    autoHandoffEnabled: asBoolean(
      settings.autoHandoffEnabled,
      DEFAULT_HANDOFF_SETTINGS.autoHandoffEnabled,
    ),
    sentimentAnalysisEnabled: asBoolean(
      settings.sentimentAnalysisEnabled,
      DEFAULT_HANDOFF_SETTINGS.sentimentAnalysisEnabled,
    ),
    maxAiMessagesBeforePrompt: asNumber(
      settings.maxAiMessagesBeforePrompt,
      DEFAULT_HANDOFF_SETTINGS.maxAiMessagesBeforePrompt,
      1,
      100,
    ),
    handoffDelaySeconds: asNumber(
      settings.handoffDelaySeconds,
      DEFAULT_HANDOFF_SETTINGS.handoffDelaySeconds,
      0,
      3600,
    ),
    conditions: {
      negativeSentiment: asBoolean(
        conditionsSource.negativeSentiment,
        DEFAULT_HANDOFF_SETTINGS.conditions.negativeSentiment,
      ),
      explicitRequest: asBoolean(
        conditionsSource.explicitRequest,
        DEFAULT_HANDOFF_SETTINGS.conditions.explicitRequest,
      ),
      priceNegotiation: asBoolean(
        conditionsSource.priceNegotiation,
        DEFAULT_HANDOFF_SETTINGS.conditions.priceNegotiation,
      ),
      complexComparison: asBoolean(
        conditionsSource.complexComparison,
        DEFAULT_HANDOFF_SETTINGS.conditions.complexComparison,
      ),
      maxMessageCount: asBoolean(
        conditionsSource.maxMessageCount,
        DEFAULT_HANDOFF_SETTINGS.conditions.maxMessageCount,
      ),
    },
    triggers: triggers.length > 0 ? triggers : DEFAULT_HANDOFF_SETTINGS.triggers.map((item) => ({ ...item })),
    escalationRules:
      escalationRules.length > 0
        ? escalationRules
        : DEFAULT_HANDOFF_SETTINGS.escalationRules.map((item) => ({ ...item })),
    sla: {
      aiFirstResponseSeconds: asNumber(
        slaSource.aiFirstResponseSeconds,
        DEFAULT_HANDOFF_SETTINGS.sla.aiFirstResponseSeconds,
        1,
        3600,
      ),
      agentAcceptSeconds: asNumber(
        slaSource.agentAcceptSeconds,
        DEFAULT_HANDOFF_SETTINGS.sla.agentAcceptSeconds,
        1,
        7200,
      ),
      agentFirstReplySeconds: asNumber(
        slaSource.agentFirstReplySeconds,
        DEFAULT_HANDOFF_SETTINGS.sla.agentFirstReplySeconds,
        1,
        7200,
      ),
      escalationTimeoutSeconds: asNumber(
        slaSource.escalationTimeoutSeconds,
        DEFAULT_HANDOFF_SETTINGS.sla.escalationTimeoutSeconds,
        1,
        86400,
      ),
      resolutionTargetHours: asNumber(
        slaSource.resolutionTargetHours,
        DEFAULT_HANDOFF_SETTINGS.sla.resolutionTargetHours,
        1,
        168,
      ),
      afterHoursMode:
        slaSource.afterHoursMode === 'queue' || slaSource.afterHoursMode === 'off'
          ? slaSource.afterHoursMode
          : DEFAULT_HANDOFF_SETTINGS.sla.afterHoursMode,
    },
  }
}

export function normalizeApiSettings(settingsValue: unknown): ApiSettingsRecord {
  const settings = isRecord(settingsValue) ? settingsValue : {}
  const webhooksSource = Array.isArray(settings.webhooks) ? settings.webhooks : []
  const webhooks = webhooksSource
    .filter((item) => isRecord(item))
    .map((item) => ({
      id: asString(item.id, crypto.randomUUID()),
      url: asString(item.url, ''),
      events: Array.isArray(item.events)
        ? item.events.filter((event): event is string => typeof event === 'string' && event.length > 0)
        : [],
      status: (item.status === 'inactive' ? 'inactive' : 'active') as WebhookSettingsItem['status'],
      lastDeliveredAt:
        typeof item.lastDeliveredAt === 'string' && item.lastDeliveredAt.length > 0
          ? item.lastDeliveredAt
          : null,
    }))
    .filter((item) => item.url.length > 0)

  return {
    webhookRetry: asBoolean(settings.webhookRetry, DEFAULT_API_SETTINGS.webhookRetry),
    webhooks,
    rateLimitEnabled: asBoolean(settings.rateLimitEnabled, DEFAULT_API_SETTINGS.rateLimitEnabled),
    requestsPerMinute: asNumber(
      settings.requestsPerMinute,
      DEFAULT_API_SETTINGS.requestsPerMinute,
      1,
      100000,
    ),
    requestsPerHour: asNumber(
      settings.requestsPerHour,
      DEFAULT_API_SETTINGS.requestsPerHour,
      1,
      1000000,
    ),
    burstLimit: asNumber(settings.burstLimit, DEFAULT_API_SETTINGS.burstLimit, 1, 100000),
    docsUrl: asString(settings.docsUrl, DEFAULT_API_SETTINGS.docsUrl),
  }
}

export function getPlanLimits(plan: string): {
  messages: number
  contacts: number
  aiCalls: number
  devices: number
} {
  switch (plan.toLowerCase()) {
    case 'enterprise':
      return { messages: 50000, contacts: 10000, aiCalls: 40000, devices: 20 }
    case 'starter':
      return { messages: 5000, contacts: 1000, aiCalls: 4000, devices: 1 }
    default:
      return { messages: 20000, contacts: 3000, aiCalls: 15000, devices: 5 }
  }
}

export function getPlanPriceAed(plan: string): number | null {
  switch (plan.toLowerCase()) {
    case 'enterprise':
      return 2999
    case 'starter':
      return 799
    case 'pro':
      return 1499
    default:
      return null
  }
}
