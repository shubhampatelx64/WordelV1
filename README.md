# WordelV1 (Phase 1)

Production-focused Wordle-like app with Next.js App Router + Prisma + PostgreSQL + NextAuth Credentials.

## Stack
- Next.js 14 + TypeScript + Tailwind
- PostgreSQL + Prisma (with migrations)
- NextAuth (Credentials)
- Vitest (unit tests)
- Playwright (2 smoke tests)

## Setup
1. Copy env file:
   ```bash
   cp .env.example .env
   ```
2. Start postgres (docker):
   ```bash
   docker compose up -d postgres
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run migrations + generate client + seed:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```
5. Start app:
   ```bash
   npm run dev
   ```

## One-command tests
```bash
npm run test:all
```

## Docker Compose (app + postgres)
```bash
docker compose up --build
```
This runs migrations and seed on app start.

## Seeded credentials
- Admin: `admin@example.com` / `Admin123!`
- User: `player@example.com` / `Password123!`

## API routes (consistent JSON)
All endpoints return either:
- Success: `{ ok: true, data: ... }`
- Error: `{ ok: false, error: { code, message, details? } }`

### Auth
- `POST /api/auth/signup`
  - Body: `{ email, password, displayName }`
  - Validates via zod, hashes password with bcryptjs, creates user.
- `POST/GET /api/auth/[...nextauth]`
  - NextAuth credentials login/logout/session endpoints.

### Daily game
- `GET /api/daily?date=YYYY-MM-DD`
  - Returns active daily game metadata only (never answer).

### Gameplay
- `POST /api/games/:gameId/start`
  - Body: `{ hardMode?: boolean }`
  - Creates gameplay or resumes in-progress gameplay.
  - Returns 409 if already completed (replay prevention).
- `POST /api/games/:gameId/guess`
  - Body: `{ guessText }`
  - Validates length, A-Z only, dictionary membership, hard mode constraints.
  - Evaluates duplicates with Wordle rules.
  - Computes score server-side only and updates leaderboard on completion.
- `GET /api/games/:gameId/state`
  - Returns guesses/status/attempt counts for refresh-resume flows.

### Leaderboard
- `GET /api/leaderboard/daily?date=YYYY-MM-DD&limit=20`
  - Sorted by score desc, attempts asc, time asc, completion asc.

### Profile
- `GET /api/me/stats`
  - Returns streak, win rate, and last 10 results.

### Hint (Phase 1)
- `POST /api/hint`
  - Rate-limited endpoint that intentionally returns 501 in Phase 1.

## Architecture
- Shared server utils: `lib/server/*`
- Domain logic:
  - Evaluation algorithm: `lib/domain/evaluate.ts`
  - Hard mode rules: `lib/domain/hard-mode.ts`
  - Scoring: `lib/domain/scoring.ts`
- HTTP handlers only orchestrate validation/auth/domain usage.

## Security & correctness notes
- Answer word is never returned to client.
- Score is computed server-side only.
- Rate limiting implemented for login (via NextAuth credentials path and signup), guess, and hint.
- Security headers are set in middleware.
- CSRF same-origin checks for mutating custom endpoints.
- UTC dateKey (`YYYY-MM-DD`) used for daily rollover.
