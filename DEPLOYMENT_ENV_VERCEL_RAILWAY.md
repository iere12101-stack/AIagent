# Production Env Setup

This project is deployed with:

- Frontend: `https://a-iagent-frontend-c2qjgel4j-iere12101-1231s-projects.vercel.app`
- Backend: `https://aiagent-production-3477.up.railway.app`

## Vercel

Set these in the Vercel project for the `frontend` app:

```env
NEXT_PUBLIC_APP_URL=https://a-iagent-frontend-c2qjgel4j-iere12101-1231s-projects.vercel.app
BACKEND_URL=https://aiagent-production-3477.up.railway.app
NEXT_PUBLIC_BACKEND_URL=https://aiagent-production-3477.up.railway.app
NEXT_PUBLIC_ENABLE_REALTIME=false
NEXT_PUBLIC_REALTIME_URL=
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-supabase-publishable-key>
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
SUPABASE_SERVICE_KEY=<same-service-role-key-if-needed>
SUPABASE_SECRET_KEY=<your-supabase-secret-key-if-used>
ANTHROPIC_API_KEY=<your-anthropic-key-if-frontend-server-routes-use-it>
GROQ_API_KEY=<your-groq-key-if-needed>
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRY=7d
NODE_ENV=production
TZ=Asia/Dubai
```

Notes:

- `NEXT_PUBLIC_BACKEND_URL` must point to Railway, not localhost.
- `BACKEND_URL` should also point to Railway so Next.js server routes proxy correctly in production.
- `COOKIE_DOMAIN` is not required on Vercel for the current login flow because auth cookies are issued from the frontend domain itself.

## Railway

Set these in the Railway service for the backend app:

```env
NEXT_PUBLIC_APP_URL=https://a-iagent-frontend-c2qjgel4j-iere12101-1231s-projects.vercel.app
BACKEND_URL=https://aiagent-production-3477.up.railway.app
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
SUPABASE_SERVICE_KEY=<same-service-role-key-if-needed>
SUPABASE_SECRET_KEY=<your-supabase-secret-key-if-used>
ANTHROPIC_API_KEY=<your-anthropic-key>
GROQ_API_KEY=<your-groq-key>
OPENAI_API_KEY=<optional>
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRY=7d
REDIS_HOST=<your-redis-host-if-used>
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password-if-used>
WA_SESSION_ENCRYPTION_KEY=<64-hex-character-key>
PORT=3001
NODE_ENV=production
TZ=Asia/Dubai
COOKIE_DOMAIN=
```

Notes:

- `WA_SESSION_ENCRYPTION_KEY` is required and must be exactly 64 hex characters.
- If Redis is not configured, queue-related features will run degraded.
- The backend uses `node dist/index.js`, so Railway must run the clean build before start.

## Root Directory Settings

- Vercel root directory: `frontend`
- Railway root directory: repo root using `railpack.json`

## After Updating Env Vars

1. Redeploy Vercel.
2. Redeploy Railway.
3. Test:
   - Login
   - Dashboard API pages
   - WhatsApp backend health
   - Company info replies
   - Property search replies

## Security

The local `.env` currently contains live-looking secrets that were also pasted into chat. Rotate these after deployment:

- `ANTHROPIC_API_KEY`
- `GROQ_API_KEY`
- `JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_SECRET_KEY`
