import { getSupabaseAdmin } from '../../config/supabase.js'

// Hardcoded routing matrix from v4 spec
const AREA_ROUTING: Record<string, string[]> = {
  'Laiba Shahzad': ['JVC', 'JLT', 'Majan', 'DLRC', 'Al Zorah', 'Jumeirah Village Circle', 'Jumeirah Lake Towers'],
  'Waheed Uz Zaman': ['Dubai Marina', 'Arjan', 'Dubai Sports City', 'Motor City', 'DSC'],
  'SAROSH IQBAL': ['Business Bay', 'Downtown Dubai', 'DIFC'],
}

export const teamRouter = {
  async findAgent(params: {
    orgId: string
    area?: string
    budget?: number
    intent?: string
  }) {
    // Budget-first routing
    if (params.budget && params.budget >= 5_000_000) {
      return this._getAgentByRole(params.orgId, 'ceo')
    }
    if (params.budget && params.budget >= 2_000_000) {
      return this._getAgentByRole(params.orgId, 'sales_manager')
    }

    // Area-based routing
    if (params.area) {
      for (const [agentName, areas] of Object.entries(AREA_ROUTING)) {
        const match = areas.some(a =>
          params.area!.toLowerCase().includes(a.toLowerCase()) ||
          a.toLowerCase().includes(params.area!.toLowerCase())
        )
        if (match) {
          return this._getAgentByName(params.orgId, agentName)
        }
      }
    }

    // Default: Sarah Shaheen (Sales Manager)
    return this._getAgentByRole(params.orgId, 'sales_manager')
  },

  async _getAgentByRole(orgId: string, role: string) {
    const supabase = getSupabaseAdmin()
    if (!supabase) return null

    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('org_id', orgId)
      .ilike('role', `%${role}%`)
      .eq('is_active', true)
      .single()
    return data
  },

  async _getAgentByName(orgId: string, name: string) {
    const supabase = getSupabaseAdmin()
    if (!supabase) return null

    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('org_id', orgId)
      .ilike('name', `%${name}%`)
      .eq('is_active', true)
      .single()
    return data
  }
}
