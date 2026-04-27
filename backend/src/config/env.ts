import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

const currentFilePath = fileURLToPath(import.meta.url)
const backendRoot = path.resolve(path.dirname(currentFilePath), '../..')
const repoRoot = path.resolve(backendRoot, '..')

const envFiles = [
  // Load backend-local values first, then fill missing keys from repo root and frontend dev env.
  path.join(backendRoot, '.env'),
  path.join(backendRoot, '.env.local'),
  path.join(repoRoot, '.env'),
  path.join(repoRoot, '.env.local'),
  path.join(repoRoot, 'frontend', '.env.local'),
]

envFiles.forEach((envFile) => {
  if (fs.existsSync(envFile)) {
    loadEnv({ path: envFile, override: false })
    console.log('Loaded env file:', envFile)
  } else {
    console.log('Env file not found:', envFile)
  }
})

const rawEnv = {
  ...process.env,
  SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY,
  ANTHROPIC_API_KEY:
    process.env.ANTHROPIC_API_KEY ??
    process.env.CLAUDE_API_KEY ??
    process.env.ANTHROPIC_KEY ??
    process.env.CLAUDE_KEY,
}

if (!process.env.SUPABASE_URL && rawEnv.SUPABASE_URL) {
  process.env.SUPABASE_URL = rawEnv.SUPABASE_URL
}

if (!process.env.SUPABASE_SERVICE_KEY && rawEnv.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_KEY = rawEnv.SUPABASE_SERVICE_ROLE_KEY
}

if (!process.env.ANTHROPIC_API_KEY && rawEnv.ANTHROPIC_API_KEY) {
  process.env.ANTHROPIC_API_KEY = rawEnv.ANTHROPIC_API_KEY
}

const envSchema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  WA_SESSION_ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'WA_SESSION_ENCRYPTION_KEY must be 64 hex characters')
    .optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRY: z.string().default('7d'),
  COOKIE_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  BACKEND_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TZ: z.string().default('Asia/Dubai'),
})

const parsedEnv = envSchema.safeParse(rawEnv)

const fallbackEnv = envSchema.parse({
  ...rawEnv,
  REDIS_PORT: process.env.REDIS_PORT ?? '6379',
  PORT: process.env.PORT ?? '3001',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  JWT_EXPIRY: process.env.JWT_EXPIRY ?? '7d',
  TZ: process.env.TZ ?? 'Asia/Dubai',
})

export const env = parsedEnv.success ? parsedEnv.data : fallbackEnv

export const envIssues = parsedEnv.success
  ? []
  : parsedEnv.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'env'
      return `${path}: ${issue.message}`
    })

export const degradedServices = {
  supabase: !(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  anthropic: !env.ANTHROPIC_API_KEY,
  groq: !env.GROQ_API_KEY,
  openai: !env.OPENAI_API_KEY,
  redis: !(env.REDIS_HOST && env.REDIS_PORT),
  resend: !(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL),
  whatsappSessionEncryption: !env.WA_SESSION_ENCRYPTION_KEY,
}

export function hasAnyAIProvider(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY || env.GROQ_API_KEY || env.OPENAI_API_KEY)
}
