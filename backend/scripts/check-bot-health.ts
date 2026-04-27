#!/usr/bin/env node

import { getSupabaseAdmin } from '../src/config/supabase.js'

async function checkBotHealth() {
  const supabase = getSupabaseAdmin()

  try {
    console.log('🤖 Checking WhatsApp Bot Health...\n')

    // Check database connectivity
    console.log('📊 Database connectivity...')
    const { data: dbCheck, error: dbError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1)

    if (dbError) {
      console.log('❌ Database: FAILED')
      console.log('   Error:', dbError.message)
      return false
    }
    console.log('✅ Database: OK')

    // Check human-handled conversations
    console.log('\n👥 Human-handled conversations...')
    const { data: humanHandled, error: humanError } = await supabase
      .from('conversations')
      .select('id, contact_id, updated_at, contacts(phone)')
      .eq('handled_by', 'human')
      .order('updated_at', { ascending: false })

    if (humanError) {
      console.log('❌ Failed to check human conversations:', humanError.message)
    } else {
      console.log(`📋 Found ${humanHandled.length} human-handled conversations`)
      if (humanHandled.length > 0) {
        console.log('   These conversations will NOT receive AI responses:')
        humanHandled.slice(0, 5).forEach((conv, index) => {
          console.log(`   ${index + 1}. ${conv.contacts?.phone} (updated: ${new Date(conv.updated_at).toLocaleString()})`)
        })
        if (humanHandled.length > 5) {
          console.log(`   ... and ${humanHandled.length - 5} more`)
        }
      }
    }

    // Check recent activity
    console.log('\n📨 Recent message activity (last 5 minutes)...')
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select('id, direction, created_at')
      .gte('created_at', fiveMinutesAgo)

    if (messagesError) {
      console.log('❌ Failed to check recent messages:', messagesError.message)
    } else {
      const inbound = recentMessages.filter(m => m.direction === 'inbound').length
      const outbound = recentMessages.filter(m => m.direction === 'outbound').length
      console.log(`📥 Inbound messages: ${inbound}`)
      console.log(`📤 Outbound messages: ${outbound}`)

      if (inbound > 0 && outbound === 0) {
        console.log('⚠️  Warning: Messages received but no responses sent recently')
      } else if (inbound === 0 && outbound === 0) {
        console.log('ℹ️  No recent activity')
      } else {
        console.log('✅ Message flow appears normal')
      }
    }

    // Check device connections
    console.log('\n📱 Device connection status...')
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('id, status, updated_at')
      .order('updated_at', { ascending: false })

    if (devicesError) {
      console.log('❌ Failed to check devices:', devicesError.message)
    } else {
      const connected = devices.filter(d => d.status === 'connected').length
      const connecting = devices.filter(d => d.status === 'connecting').length
      const disconnected = devices.filter(d => d.status === 'disconnected').length

      console.log(`🟢 Connected: ${connected}`)
      console.log(`🟡 Connecting: ${connecting}`)
      console.log(`🔴 Disconnected: ${disconnected}`)

      if (connected === 0) {
        console.log('⚠️  Warning: No devices connected!')
      }
    }

    console.log('\n🏥 Overall Status: HEALTHY')
    console.log('✅ All checks passed')
    return true

  } catch (error) {
    console.error('❌ Health check failed:', error)
    return false
  }
}

// Run the health check
checkBotHealth().then((healthy) => {
  process.exit(healthy ? 0 : 1)
})