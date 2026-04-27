import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54322';
const SUPABASE_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';

// Direct PostgreSQL connection
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: '127.0.0.1',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
});

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

async function getMigrationFiles() {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.match(/^\d{3}_.*\.sql$/) && !f.includes('legacy'))
    .sort();
  return files;
}

async function runMigration(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\nApplying ${fileName}...`);
  
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  try {
    const client = await pool.connect();
    await client.query(sql);
    client.release();
    console.log(`✓ ${fileName} applied successfully`);
    return true;
  } catch (error) {
    console.error(`✗ Error applying ${fileName}:`);
    console.error(error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('Starting database migrations...\n');
    
    const files = await getMigrationFiles();
    console.log(`Found ${files.length} migration files`);
    
    let succeeded = 0;
    let failed = 0;
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const success = await runMigration(filePath);
      if (success) succeeded++;
      else failed++;
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Migrations complete: ${succeeded} succeeded, ${failed} failed`);
    console.log(`${'='.repeat(50)}\n`);
    
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
