#!/usr/bin/env node

import { getSupabaseAdmin } from '../src/config/supabase.js'

async function checkHumanHandledConversations() {
  const supabase = getSupabaseAdmin()

  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, contact_id, handled_by, updated_at, contacts(phone)')
      .eq('handled_by', 'human')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return
    }

    console.log(`Found ${conversations.length} human-handled conversations:`)
    conversations.forEach((conv, index) => {
      console.log(`${index + 1}. ID: ${conv.id}, Phone: ${conv.contacts?.phone}, Updated: ${conv.updated_at}`)
    })

    return conversations
  } catch (error) {
    console.error('Failed to check human-handled conversations:', error)
  }
}

async function resetHumanHandledConversations() {
  const supabase = getSupabaseAdmin()

  try {
    const { data, error } = await supabase
      .from('conversations')
      .update({ handled_by: null })
      .eq('handled_by', 'human')
      .select('id, contact_id, contacts(phone)')

    if (error) {
      console.error('Error resetting conversations:', error)
      return
    }

    console.log(`Reset ${data.length} conversations from human-handled to AI:`)
    data.forEach((conv, index) => {
      console.log(`${index + 1}. ID: ${conv.id}, Phone: ${conv.contacts?.phone}`)
    })

    return data
  } catch (error) {
    console.error('Failed to reset human-handled conversations:', error)
  }
}

// CLI interface
const command = process.argv[2]

if (command === 'check') {
  await checkHumanHandledConversations()
} else if (command === 'reset') {
  console.log('WARNING: This will reset ALL human-handled conversations back to AI handling.')
  console.log('Are you sure? (Type "yes" to confirm)')
  process.stdin.once('data', async (data) => {
    if (data.toString().trim().toLowerCase() === 'yes') {
      await resetHumanHandledConversations()
    } else {
      console.log('Operation cancelled.')
    }
    process.exit(0)
  })
} else {
  console.log('Usage:')
  console.log('  node scripts/manage-human-conversations.js check  # List human-handled conversations')
  console.log('  node scripts/manage-human-conversations.js reset  # Reset all to AI handling')
}