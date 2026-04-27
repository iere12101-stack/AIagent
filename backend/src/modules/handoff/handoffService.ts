import { getSupabaseAdmin } from '../../config/supabase.js'
import { findBestResolvedAgent, findResolvedAgentByName, resolvedAgentCard } from '../ai/agentResolver.js'
import type { ContactMemory } from '../contacts/contactMemory.js'

export interface HandoffParams {
  phoneNumber: string
  orgId: string
  reason: 'sentiment' | 'high_budget' | 'agent_request' | 'complex_query' | 'manual'
  message?: string
}

async function getContactContext(phoneNumber: string, orgId: string): Promise<{
  contactId: string
  memory: Partial<ContactMemory>
} | null> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone', phoneNumber)
    .eq('org_id', orgId)
    .maybeSingle()

  if (!contact?.id) return null

  const { data: memoryRows } = await supabase
    .from('contact_memory')
    .select('key, value')
    .eq('contact_id', contact.id)

  const memory = Object.fromEntries((memoryRows ?? []).map((row) => [row.key, row.value])) as Partial<ContactMemory>
  return { contactId: contact.id, memory }
}

export const handoffService = {
  async execute(params: HandoffParams): Promise<void> {
    const supabase = getSupabaseAdmin()
    if (!supabase) return

    try {
      const context = await getContactContext(params.phoneNumber, params.orgId)
      if (!context) return

      const agent = await findBestResolvedAgent(
        params.orgId,
        typeof context.memory.area === 'string' ? context.memory.area : undefined,
        typeof context.memory.maxBudget === 'number'
          ? context.memory.maxBudget
          : typeof context.memory.maxBudget === 'string'
            ? Number(context.memory.maxBudget)
            : undefined,
      )

      const now = new Date().toISOString()
      await supabase.from('contact_memory').upsert([
        { contact_id: context.contactId, key: 'assignedAgentId', value: agent.id, updated_at: now },
        { contact_id: context.contactId, key: 'assignedAgentName', value: agent.name, updated_at: now },
        { contact_id: context.contactId, key: 'assignedAgentPhone', value: agent.phone ?? '', updated_at: now },
        { contact_id: context.contactId, key: 'handoffTriggered', value: 'true', updated_at: now },
      ], { onConflict: 'contact_id,key' })

      await supabase
        .from('conversations')
        .update({ handled_by: 'human', updated_at: now })
        .eq('org_id', params.orgId)
        .eq('contact_id', context.contactId)
        .eq('status', 'active')

      await handoffService.notifyAgent({
        agentPhone: agent.phone ?? '',
        clientPhone: params.phoneNumber,
        orgId: params.orgId,
        memory: context.memory as ContactMemory,
        reason: params.reason,
      })

      console.log(`[HANDOFF] Executed: ${params.phoneNumber} -> ${agent.name} (${params.reason})`)
    } catch (error) {
      console.error('[HANDOFF] Execute failed:', error)
    }
  },

  async getAgentContactForClient(
    agentNameHint: string,
    orgId: string,
    lang: 'en' | 'ar' = 'en',
  ): Promise<string | null> {
    try {
      const agent = await findResolvedAgentByName(orgId, agentNameHint)
      if (!agent) return null

      return lang === 'ar'
        ? `إليك تفاصيل ${agent.name}\n\n${resolvedAgentCard(agent, 'ar')}`
        : `Here are ${agent.name}'s contact details\n\n${resolvedAgentCard(agent, 'en')}`
    } catch (error) {
      console.warn('[HANDOFF] Get agent contact failed:', error)
      return null
    }
  },

  async notifyAgent(params: {
    agentPhone: string
    clientPhone: string
    orgId: string
    memory: ContactMemory
    reason: string
  }): Promise<void> {
    console.log(`[NOTIFY] Agent ${params.agentPhone} - new lead from ${params.clientPhone}`)
    console.log('[NOTIFY] Memory:', params.memory)
    console.log(`[NOTIFY] Reason: ${params.reason} | Org: ${params.orgId}`)
  },
}
