# comp360 - Compliance Management Platform

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Setup
- Install pnpm globally: `npm install -g pnpm`
- Install dependencies: `pnpm install --no-frozen-lockfile`
- Note: Uses pnpm workspaces, NOT npm. The `workspace:*` dependencies require pnpm.

### Build Status
**CRITICAL: Full workspace build currently FAILS due to TypeScript configuration conflicts.**
- DO NOT attempt `pnpm run build` - it will fail with 165+ TypeScript errors
- Individual applications can be built and run separately
- The build failures are due to monorepo TypeScript configuration issues, not code logic errors

### Development Commands (VALIDATED - these work)
**Next.js Web Application:**
- Start dev server: `cd apps/web && pnpm run dev`
- Starts in ~8-15 seconds (longer on first run). NEVER CANCEL. Set timeout to 30+ minutes.
- Runs on http://localhost:3000
- Note: App starts but returns 500 errors due to missing dependencies/configuration

**Cloudflare Worker API:**
- Start dev server: `cd services/api-worker && pnpm run dev`
- Starts in ~15 seconds. NEVER CANCEL. Set timeout to 30+ minutes.
- Runs on http://localhost:8787
- Health check: `curl http://localhost:8787/health` returns `{"status":"ok","env":"dev"}`
- **CRITICAL**: The API worker WORKS correctly and serves requests
- **Note**: No manual config copy needed - wrangler.toml is already configured correctly

**Full Dev Environment:**
- Start all services: `pnpm run dev`
- Takes ~20-30 seconds to start both apps. NEVER CANCEL. Set timeout to 60+ minutes.

### Package Manager Requirements
**CRITICAL**: Must use pnpm, NOT npm
- Install pnpm: `npm install -g pnpm`
- Reason: Uses pnpm workspaces with `workspace:*` dependencies that npm cannot resolve

### Testing and Validation
**Current Test Status:**
- `pnpm run test` - FAILS due to build dependency issues
- `pnpm run lint` - FAILS due to missing ESLint TypeScript plugin
- Individual app testing must be done manually

**Manual Validation Steps (ALWAYS run these after changes):**
1. Test API worker health: `curl http://localhost:8787/health` (should return `{"status":"ok","env":"dev"}`)
2. Test JWKS endpoint: `curl http://localhost:8787/.well-known/jwks.json` (should return `{"keys":[null]}`)
3. Test protected endpoint: `curl http://localhost:8787/v1/controls` (should return `{"error":{"code":"UNAUTHORIZED","message":"Token required"}}`)
4. Web app accessibility: `curl -I http://localhost:3000` (should return HTTP/1.1 500 - expected behavior)

**Timing Validation:**
- API worker ready in ~15 seconds
- Web app ready in ~8-15 seconds  
- Both can run simultaneously without conflicts

**Complete Validation Script (copy-paste to test everything):**
```bash
# Test API worker
cd services/api-worker && pnpm run dev > /dev/null 2>&1 & 
sleep 15
curl http://localhost:8787/health  # Should return {"status":"ok","env":"dev"}
curl http://localhost:8787/.well-known/jwks.json  # Should return {"keys":[null]}
pkill -f wrangler

# Test web app  
cd ../apps/web && pnpm run dev > /dev/null 2>&1 &
sleep 15
curl -I http://localhost:3000  # Should return HTTP/1.1 500 (expected)
pkill -f next
```

### Infrastructure Requirements
**Cloudflare Services (for production):**
- D1 Database (SQLite-compatible serverless database)
- R2 Storage (object storage for evidence files)
- KV Store (key-value storage for sessions/cache)
- Workers (serverless compute)
- Queues (background job processing)

**Local Development:**
- All Cloudflare services are simulated locally via Miniflare
- No external dependencies required for basic development
- Database schema in `db/migrations/`

## Project Structure
```
├── apps/
│   └── web/                 # Next.js frontend (React/TypeScript)
├── services/
│   └── api-worker/          # Cloudflare Worker API (Hono framework)
├── packages/
│   ├── core/                # Shared types and constants
│   └── shared/              # Shared utilities (auth, crypto, etc.)
├── db/migrations/           # Database schema
└── infra/wrangler/          # Cloudflare deployment configs
```

## Key Technologies
- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Cloudflare Workers, Hono framework
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Auth**: JWT with Google/Microsoft OIDC
- **Build**: Turborepo monorepo, pnpm workspaces

## Validation Scenarios
**After making changes, ALWAYS:**
1. Test API worker health: `curl http://localhost:8787/health`
2. Test a controls endpoint: `curl http://localhost:8787/v1/controls`
3. If adding new routes, test the specific endpoint
4. For web changes, verify the dev server starts without TypeScript errors

## Common Tasks

### Adding New API Routes
1. Create route file in `services/api-worker/src/routes/`
2. Export a Hono instance with the routes
3. Import and mount in `services/api-worker/src/index.ts`
4. Test with curl after starting dev server

### Working with Database
- Schema files: `db/migrations/*.sql`
- Database is simulated locally, no setup required
- Use Cloudflare D1 prepared statements in routes

### Working with Types
- Core types: `packages/core/src/types.ts`
- Shared between frontend and backend
- Update both packages if adding new types

## Critical Notes
- **NEVER CANCEL** dev servers or builds - they may take 10-20 seconds to start
- Use pnpm, NOT npm - workspace dependencies require it
- Individual apps work better than full workspace commands
- Focus validation on API worker - it's the most reliable component
- Web app starts but has runtime configuration issues
- Full build system needs TypeScript configuration fixes

## Timing Expectations
- Dependency install: ~1-20 seconds (1s with lockfile, 20s fresh)
- API worker dev start: ~15 seconds  
- Web app dev start: ~8-15 seconds (longer on first run)
- Full dev environment: ~20-30 seconds
- Health check response: <1 second

## Troubleshooting
- If workspace errors: Ensure pnpm is used, not npm
- If build fails: Work with individual apps, avoid full workspace build
- If API doesn't respond: Check dev server logs, restart if needed
- If "entry-point not found": Verify wrangler.toml has `main = "src/index.ts"` not `dist/index.js`