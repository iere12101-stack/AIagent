import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const ORG_ID = process.env.ORG_ID || 'a0000000-0000-0000-0000-000000000001'

async function importProperties() {
  try {
    const csv = readFileSync('./Properties.csv', 'utf-8')
    const lines = csv.trim().split('\n')
    if (lines.length < 3) {
      console.error('CSV file must have at least a header and one data row')
      process.exit(1)
    }
    const headers = lines[0].split(',').map(h => h.trim())
    const properties = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length < headers.length) continue
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = values[idx] })
      properties.push({
        org_id: ORG_ID,
        ref_number: row['Ref Number'] || row['ref_number'] || '',
        transaction_type: (row['Type'] || row['type'] || 'SALE').toUpperCase(),
        category: row['Category'] || row['category'] || 'Apartment',
        bedrooms: row['Beds'] || row['bedrooms'] || null,
        bathrooms: row['Baths'] || row['bathrooms'] || null,
        size_sqft: row['Size (sqft)'] || row['size_sqft'] ? parseFloat((row['Size (sqft)'] || row['size_sqft'] || '0').replace(/,/g, '')) : null,
        status: row['Status'] || row['status'] || null,
        district: row['District'] || row['district'] || null,
        building: row['Building'] || row['building'] || null,
        full_area: row['Full Area'] || row['full_area'] || null,
        price_aed: parseFloat((row['Price (AED)'] || row['price_aed'] || '0').replace(/,/g, '')),
        agent_name: row['Agent'] || row['agent_name'] || null,
        agent_whatsapp: row['Agent WhatsApp'] || row['agent_whatsapp'] || null,
        available: (row['Available'] || row['available'] || 'TRUE').toUpperCase() === 'TRUE',
        permit_number: row['Permit No.'] || row['permit_number'] || null,
        portal: row['Portal'] || row['portal'] || null,
      })
    }
    // Batch insert (50 at a time)
    const BATCH = 50
    for (let i = 0; i < properties.length; i += BATCH) {
      const batch = properties.slice(i, i + BATCH)
      const { error } = await supabase.from('properties').upsert(batch, { onConflict: 'org_id,ref_number' })
      if (error) {
        console.error(`Batch ${i / BATCH + 1} error:`, error.message)
      } else {
        console.log(`Batch ${i / BATCH + 1}: ${batch.length} properties imported`)
      }
    }
    console.log(`\nDone! Total: ${properties.length} properties`)
  } catch (err) {
    console.error('Import failed:', err)
    process.exit(1)
  }
}

importProperties()
