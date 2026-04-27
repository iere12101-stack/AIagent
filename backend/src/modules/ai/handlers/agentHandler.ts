/**
 * AGENT INTENT HANDLER
 *
 * Returns agent or team contact information.
 * NEVER calls AI. NEVER generates data.
 */

import {
  TEAM,
  findBestAgent,
  findAgentByName,
  agentCard,
  hasUsableContact,
  isInternalStaff,
  type TeamMember,
} from '../../../config/companyData.js'

export interface AgentResponse {
  content: string
  agent: Pick<TeamMember, 'id' | 'name' | 'phone'>
}

export type AgentDirectoryKind =
  | 'ceo'
  | 'sales_manager'
  | 'sales_team'
  | 'all_agents'
  | 'marketing'
  | 'hr'
  | 'support'

function normalizeMessage(message: string): string {
  return message.toLowerCase().trim()
}

export function detectAgentDirectoryRequest(message: string): AgentDirectoryKind | null {
  const lower = normalizeMessage(message)
  if (/\bceo\b|\bchief executive\b/.test(lower)) return 'ceo'
  if (/\bsales?\s*manager\b/.test(lower)) return 'sales_manager'
  if (/\bmarketing\b|\bmarking\b/.test(lower)) return 'marketing'
  if (/\bhr\b|\bhuman resources\b/.test(lower)) return 'hr'
  if (/\bsupport\b|\btechnical\b/.test(lower)) return 'support'
  if (/\ball\b.*\b(agent|consultant|team)\b/.test(lower)) return 'all_agents'
  if (/\b(agent|consultant)s?\b.*\b(all|list)\b/.test(lower)) return 'all_agents'
  if (/\bs(?:ale|ales)\s*team\b/.test(lower)) return 'sales_team'
  return null
}

function toDirectoryAgent(member: TeamMember): Pick<TeamMember, 'id' | 'name' | 'phone'> {
  return { id: member.id, name: member.name, phone: member.phone }
}

function buildDirectoryList(members: TeamMember[], lang: 'en' | 'ar'): string {
  const valid = members.filter(hasUsableContact)
  return valid.map((member) => agentCard(member, lang)).filter(Boolean).join('\n\n')
}

function buildRelevantTeamFallback(kind: AgentDirectoryKind, lang: 'en' | 'ar'): string {
  const label = kind === 'marketing'
    ? (lang === 'ar' ? 'فريق التسويق' : 'the marketing team')
    : kind === 'hr'
      ? (lang === 'ar' ? 'فريق الموارد البشرية' : 'the HR team')
      : kind === 'support'
        ? (lang === 'ar' ? 'فريق الدعم' : 'the support team')
        : (lang === 'ar' ? 'الفريق المناسب' : 'the relevant team')

  return lang === 'ar'
    ? `سأقوم بتوصيلك مع ${label}.`
    : `I will connect you with ${label}.`
}

export function getDirectoryResponse(
  kind: AgentDirectoryKind,
  lang: 'en' | 'ar',
): AgentResponse | null {
  const team = TEAM as unknown as TeamMember[]
  const byId = (id: string) => team.find((member) => member.id === id)
  const byDept = (dept: string) => team.filter((member) => member.dept === dept)

  if (kind === 'ceo') {
    const ceo = byId('imran')
    if (!ceo) return null
    return {
      content: lang === 'ar'
        ? `تفاصيل المدير التنفيذي:\n\n${agentCard(ceo, lang)}`
        : `Here are the CEO details:\n\n${agentCard(ceo, lang)}`,
      agent: toDirectoryAgent(ceo),
    }
  }

  if (kind === 'sales_manager') {
    const manager = byId('hammad') ?? findBestAgent()
    return {
      content: lang === 'ar'
        ? `تفاصيل مدير المبيعات:\n\n${agentCard(manager, lang)}`
        : `Here are the Sales Manager details:\n\n${agentCard(manager, lang)}`,
      agent: toDirectoryAgent(manager),
    }
  }

  const members =
    kind === 'sales_team'
      ? byDept('sales')
      : kind === 'all_agents'
        ? team.filter((member) => member.isClientFacing)
        : kind === 'marketing'
          ? byDept('marketing')
          : kind === 'hr'
            ? byDept('hr')
            : byDept('technical')

  const list = buildDirectoryList(members, lang)
  if (!list) {
    if (kind === 'marketing' || kind === 'hr' || kind === 'support') {
      const fallback = findBestAgent()
      return {
        content: buildRelevantTeamFallback(kind, lang),
        agent: toDirectoryAgent(fallback),
      }
    }
    return null
  }

  const lead = members.find(hasUsableContact) ?? findBestAgent()
  const title = lang === 'ar'
    ? 'هذه جهات الاتصال المطلوبة:'
    : 'Here are the requested contacts:'

  return {
    content: `${title}\n\n${list}`,
    agent: toDirectoryAgent(lead),
  }
}

export function getAgentResponse(
  lang: 'en' | 'ar',
  area?: string,
  budget?: number,
): AgentResponse {
  const agent = findBestAgent(area, budget)
  const card = agentCard(agent, lang)
  return {
    content: lang === 'ar'
      ? `يسعدني أن أوصلك بأحد مستشارينا المتخصصين:\n\n${card}`
      : `Happy to connect you with one of our specialists:\n\n${card}`,
    agent: { id: agent.id, name: agent.name, phone: agent.phone },
  }
}

export function getAgentByName(
  nameHint: string,
  lang: 'en' | 'ar',
): AgentResponse | null {
  if (isInternalStaff(nameHint)) {
    const fallback = findBestAgent()
    const lower = nameHint.toLowerCase()
    const teamLabel = lower.includes('sarah')
      ? (lang === 'ar' ? 'فريق التسويق' : 'the marketing team')
      : lower.includes('aya')
        ? (lang === 'ar' ? 'فريق الموارد البشرية' : 'the HR team')
        : (lang === 'ar' ? 'الفريق المناسب' : 'the relevant team')

    return {
      content: lang === 'ar'
        ? `${nameHint} ليس ضمن الفريق البيعي المباشر للعملاء.\n\nسأقوم بتوصيلك مع ${teamLabel}.`
        : `${nameHint} is not part of the client-facing sales team.\n\nI will connect you with ${teamLabel}.`,
      agent: { id: fallback.id, name: fallback.name, phone: fallback.phone },
    }
  }

  const agent = findAgentByName(nameHint)
  if (!agent) return null
  const card = agentCard(agent, lang)
  return {
    content: lang === 'ar'
      ? `إليك تفاصيل ${agent.name}:\n\n${card}`
      : `Here are ${agent.name}'s details:\n\n${card}`,
    agent: { id: agent.id, name: agent.name, phone: agent.phone },
  }
}

export function buildCompanyWithAgentResponse(
  lang: 'en' | 'ar',
  area?: string,
  budget?: number,
): AgentResponse {
  return getAgentResponse(lang, area, budget)
}
