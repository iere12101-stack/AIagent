# WA AI Chatbot SaaS v4 - IERE Edition

This repository contains the IERE WhatsApp AI Chatbot monorepo with the Next.js frontend under `frontend/` and the Baileys/Express backend under `backend/`.

## Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- Backend: Node.js, Express, Baileys, BullMQ, ioredis
- Data: Supabase Postgres with pgvector
- AI: Claude Sonnet 4 primary, Groq fallback, OpenAI fallback

## Project Layout

- `frontend/src/app/`: Next.js App Router pages and API routes
- `frontend/src/components/`: UI components and page-level views
- `backend/src/`: Express API, WhatsApp runtime, AI, queues, flows, handoff
- `supabase/migrations/`: schema, indexes, RLS, seed data, SQL helper functions
- ''

## Setup

1. Copy `.env.example` to `.env` and fill in the required values.
2. Install workspace dependencies with `npm install` at the repo root.
3. Start local infrastructure with `docker compose up -d`.
4. Apply the canonical SQL files in `supabase/migrations/` in this order:
   `001_initial_schema.sql`
   `002_pgvector.sql`
   `003_properties_seed.sql`
   `004_team_members_seed.sql`
   `005_rls_policies.sql`
   `006_vector_functions.sql`
   `007_nudge_functions.sql`
   `008_sentiment_functions.sql`
   `009_alert_functions.sql`
5. Start both frontend and backend together with `npm run dev`.
6. Or start services separately with `npm run dev:frontend` and `npm run dev:backend`.

## Verification

- Frontend typecheck: `cd frontend && npm run typecheck`
- Frontend lint: `cd frontend && npm run lint`
- Backend typecheck: `cd backend && npm run typecheck`
- Backend lint: 'cd backend && npm run lint'


## Runtime Notes

- Authentication uses the `sb-access-token` httpOnly cookie.
- The backend supports degraded mode when optional integrations are not configured.
- WhatsApp sessions are stored in Supabase through `baileys_sessions` and encrypted with AES-256-GCM.
- Booking and alert workflows expect organization-scoped data in Supabase, including devices, team members, contacts, conversations, and settings.
- Older superseded SQL files live under `supabase/migrations/legacy/`. The active migration chain starts at `001_initial_schema.sql`.
