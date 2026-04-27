import { createClient } from '@supabase/supabase-js'
import type { TeamMember } from '../config/companyData.js'

export interface LeadAlert {
  clientPhone: string
  clientMessage: string
  area?: string
  bedrooms?: string
  transactionType?: 'SALE' | 'RENT'
  budget?: number
  propertyCards?: string
  lang: 'en' | 'ar'
  orgId: string
  timestamp?: Date
}

const alertCooldown = new Map<string, number>()
const COOLDOWN_MS = 30 * 60 * 1000

function formatAlertMessage(alert: LeadAlert, agent: TeamMember): string {
  const timestamp = (alert.timestamp ?? new Date()).toLocaleString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dubai',
  })

  const lines: string[] = [
    '🔔 *New Lead Alert — IERE AI*',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👤 *Client:* ${alert.clientPhone}`,
  ]

  const lookingFor = [
    alert.bedrooms ? `${alert.bedrooms}BR` : '',
    alert.area ?? '',
    alert.transactionType ? `(${alert.transactionType === 'RENT' ? 'Rent' : 'Buy'})` : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (lookingFor) lines.push(`🏠 *Looking for:* ${lookingFor}`)
  if (alert.budget) lines.push(`💰 *Budget:* AED ${alert.budget.toLocaleString('en-AE')}`)

  lines.push(`📅 *Time:* ${timestamp} (Dubai)`)
  lines.push(`💬 *Message:* "${alert.clientMessage.slice(0, 120)}"`)
  lines.push('━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`👋 *Assigned to:* ${agent.name}`)
  lines.push('👉 Reply directly or check inbox')

  if (alert.propertyCards) {
    const firstCard = alert.propertyCards.split('━━━━━━━━━━━━━━━━━━━━━━')[1]
    if (firstCard) {
      lines.push('')
      lines.push('📋 *Top match for this client:*')
      lines.push('━━━━━━━━━━━━━━━━━━━━━━')
      lines.push(firstCard.trim())
      lines.push('━━━━━━━━━━━━━━━━━━━━━━')
    }
  }

  return lines.join('\n')
}

export async function sendAgentAlert(
  alert: LeadAlert,
  agent: TeamMember,
  sock?: { sendMessage: (jid: string, payload: { text: string }) => Promise<unknown> } | null,
): Promise<void> {
  if (!(agent as TeamMember).isClientFacing || !agent.wa) {
    console.warn('[ALERT] Agent not client-facing or no WA number:', agent.name)
    return
  }

  const cooldownKey = `${alert.clientPhone}:${alert.orgId}:${agent.wa}`
  const lastAlert = alertCooldown.get(cooldownKey)
  if (lastAlert && Date.now() - lastAlert < COOLDOWN_MS) {
    console.log('[ALERT] Cooldown active for:', alert.clientPhone, '- skipping')
    return
  }
  alertCooldown.set(cooldownKey, Date.now())

  const agentWa = agent.wa as string
  const message = formatAlertMessage(alert, agent)
  const jid = `${agentWa}@s.whatsapp.net`

  try {
    if (sock?.sendMessage) {
      await sock.sendMessage(jid, { text: message })
    } else {
      const { whatsAppGateway } = await import('../whatsapp/WhatsAppGateway.js')
      await whatsAppGateway.sendText({
        orgId: alert.orgId,
        phone: agent.phone ?? `+${agentWa}`,
        jid,
        text: message,
      })
    }

    console.log(`[ALERT] Notification sent to ${agent.name} (${agentWa})`)

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    try {
      await supabase.from('agent_alerts').insert({
        org_id: alert.orgId,
        agent_name: agent.name,
        agent_wa: agentWa,
        client_phone: alert.clientPhone,
        client_message: alert.clientMessage,
        area: alert.area,
        bedrooms: alert.bedrooms,
        budget: alert.budget,
        sent_at: new Date().toISOString(),
        status: 'sent',
      })
    } catch (error) {
      console.warn('[ALERT] DB log failed (non-critical):', (error as Error).message)
    }
  } catch (error) {
    console.error('[ALERT] Failed to send to', agent.name, ':', (error as Error).message)
  }
}
