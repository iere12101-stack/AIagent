import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'

async function countTable(
  supabase: ReturnType<typeof createServerClient>,
  table: string,
  orgId: string,
  filters: Record<string, string> = {},
): Promise<number> {
  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value)
  }

  const { count } = await query
  return count ?? 0
}

async function resolveSetupStatus(): Promise<{
  claude: boolean
  groq: boolean
  openai: boolean
  whatsappRuntime: {
    trackedDevices: number
    healthyDevices: number
    connectingDevices: number
    unhealthyDevices: number
    replacedConflicts: number
    sendFailures: number
    alerts: string[]
  } | null
}> {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '') ??
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '')

  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl}/api/v1/setup/status`, {
        cache: 'no-store',
      })

      if (response.ok) {
        const payload = (await response.json()) as {
          data?: {
            degradedServices?: {
              anthropic?: boolean
              groq?: boolean
              openai?: boolean
            }
            whatsappRuntime?: {
              trackedDevices: number
              healthyDevices: number
              connectingDevices: number
              unhealthyDevices: number
              replacedConflicts: number
              sendFailures: number
              alerts: string[]
            }
          }
        }

        const degraded = payload.data?.degradedServices
        if (degraded) {
          return {
            claude: !Boolean(degraded.anthropic),
            groq: !Boolean(degraded.groq),
            openai: !Boolean(degraded.openai),
            whatsappRuntime: payload.data?.whatsappRuntime ?? null,
          }
        }
      }
    } catch {
      // Fall through to local env fallback.
    }
  }

  return {
    claude: Boolean(
      process.env.ANTHROPIC_API_KEY ||
        process.env.CLAUDE_API_KEY ||
        process.env.ANTHROPIC_KEY ||
        process.env.CLAUDE_KEY,
    ),
    groq: Boolean(process.env.GROQ_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    whatsappRuntime: null,
  }
}

export async function GET(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerClient()
    const setupStatus = await resolveSetupStatus()
    const aiProviders = {
      claude: setupStatus.claude,
      groq: setupStatus.groq,
      openai: setupStatus.openai,
    }

    const [
      devicesTotal,
      devicesConnected,
      agentsTotal,
      agentsActive,
      contactsTotal,
      conversationsTotal,
      messagesTotal,
      propertiesTotal,
      bookingsTotal,
      teamActive,
      { data: teamMembers },
    ] = await Promise.all([
      countTable(supabase, 'devices', auth.orgId),
      countTable(supabase, 'devices', auth.orgId, { status: 'connected' }),
      countTable(supabase, 'agents', auth.orgId),
      countTable(supabase, 'agents', auth.orgId, { active: 'true' }),
      countTable(supabase, 'contacts', auth.orgId),
      countTable(supabase, 'conversations', auth.orgId),
      countTable(supabase, 'messages', auth.orgId),
      countTable(supabase, 'properties', auth.orgId),
      countTable(supabase, 'bookings', auth.orgId),
      countTable(supabase, 'team_members', auth.orgId, { active: 'true' }),
      supabase
        .from('team_members')
        .select('name')
        .eq('org_id', auth.orgId)
        .eq('active', true)
        .order('created_at', { ascending: true })
        .limit(4),
    ])

    const memberInitials = (teamMembers ?? []).map((member) =>
      member.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    )

    const totalRecords = contactsTotal + conversationsTotal + messagesTotal + propertiesTotal + bookingsTotal

    return NextResponse.json({
      data: {
        whatsapp: {
          connected: devicesConnected,
          total: devicesTotal,
          runtime: setupStatus.whatsappRuntime,
        },
        ai: {
          active: agentsActive,
          total: agentsTotal,
          providers: aiProviders,
        },
        database: {
          tables: 18,
          records: totalRecords,
        },
        team: {
          active: teamActive,
          initials: memberInitials,
        },
      },
    })
  } catch (error) {
    console.error('GET /api/system/status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system status', details: String(error) },
      { status: 500 },
    )
  }
}
