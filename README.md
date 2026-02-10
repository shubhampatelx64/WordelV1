# WordelV1 (Phase 2)

Next.js + TypeScript + Tailwind + Prisma/PostgreSQL Wordle platform with daily, custom, and practice games.

## Setup
1. `cp .env.example .env`
2. `npm install`
3. Start Postgres (`docker compose up -d postgres`) or full stack (`docker compose up --build`)
4. `npm run prisma:generate`
5. `npm run prisma:migrate`
6. `npm run prisma:seed`
7. `npm run dev`

## Single-command tests
- Unit + e2e: `npm run test:all`

## Docker compose
`docker compose up --build` starts app + postgres and runs migrate+seed on app startup.

The app service is bound to port `10000` (`http://localhost:10000`).

## Render Docker deployment
- Use `npm run start` as the container start command.
- The start script binds Next.js to `0.0.0.0:10000` (`next start -H 0.0.0.0 -p 10000`), so Render can detect the open HTTP port.
- Render uses port `10000` by default for Docker services and expects your process to listen on that port/interface during its port scan. Binding to another fixed port (like `3000`) can cause deployment health-check timeouts.

## Seeded users
- Admin: `admin@example.com` / `Admin123!`
- Creator: `creator@example.com` / `Creator123!`
- User: `player@example.com` / `Password123!`

## Core architecture
- Shared server logic: `lib/server/*`
- Domain logic: `lib/domain/*`
  - Evaluation algorithm: `lib/domain/evaluate.ts`
  - Scoring: `lib/domain/scoring.ts`
  - Hint sequencing: `lib/domain/hints.ts`
- API route handlers orchestrate auth/validation/domain only.

## JSON response contract
All API responses use:
- success: `{ ok: true, data: ... }`
- error: `{ ok: false, error: { code, message, details? } }`

## API routes
### Auth
- `POST /api/auth/signup` body `{ email, password, displayName }`
- `GET|POST /api/auth/[...nextauth]`

### Daily/public
- `GET /api/daily?date=YYYY-MM-DD&length=5&difficulty=medium`
- `GET /api/g/:shareCode`
- `GET /api/leaderboard/daily?date=YYYY-MM-DD&limit=20&length=5&difficulty=medium`
- `GET /api/leaderboard/game/:gameId`
- `POST /api/practice/start`

### Gameplay
- `POST /api/games/:gameId/start` body `{ hardMode?: boolean }`
- `POST /api/games/:gameId/guess` body `{ guessText }`
- `GET /api/games/:gameId/state`
- `POST /api/games/:gameId/hint`

### Profile
- `GET /api/me/stats`

### Admin
- `GET|POST|PUT|DELETE /api/admin/words`
- `POST /api/admin/words/import` (JSON rows from parsed CSV preview)
- `POST /api/admin/daily/schedule` body type assign/autofill
- `GET|POST|PUT /api/admin/games`
- `GET|PUT /api/admin/users`
- `GET /api/admin/audit`

## Security notes
- Answer word is never returned by API.
- Score and penalties are computed server-side only.
- UTC date keys are used (`YYYY-MM-DD`) at 00:00 UTC rollover.
- Rate limiting is applied to login, guess, and hint.
- Basic security headers are set in middleware.
- Same-origin CSRF checks are used on mutating custom endpoints.

## Phase 2 features
- Roles: ADMIN/CREATOR/USER with route-level permission checks
- Hints (0-3 per word), ordered retrieval, stored hint usage, score penalties
- Custom games with share code and per-game leaderboard
- Practice mode game creation
- Daily schedule assign + autofill
- Audit logging for admin/creator actions
- Admin pages (`/admin`, `/admin/audit`) and share page (`/g/:shareCode`)
