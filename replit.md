# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS (with credentials), cookie-parser, JSON/urlencoded parsing, auth middleware, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health`; `src/routes/auth.ts` handles OIDC login/callback/logout and mobile token exchange; `src/routes/saves.ts` handles cloud save/load (GET/PUT /api/saves, requires auth)
- Auth: `src/lib/auth.ts` — session CRUD (PostgreSQL-backed), OIDC config via `openid-client` v6; `src/middlewares/authMiddleware.ts` — loads user from session on every request, patches `req.isAuthenticated()`
- Depends on: `@workspace/db`, `@workspace/api-zod`, `openid-client`, `cookie-parser`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/auth.ts` — sessions table, users table, and game_saves table (userId FK to users, gameState JSONB, version, savedAt)
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/mobile` (`@workspace/mobile`)

Expo React Native mobile game "Dropper Clicker" — a 2D incremental clicker with manual drop mechanics and multiple progression layers.

- **Game tab**: Manual DROP button with cooldown (2s base, reducible via rapidDrop upgrade, min 500ms), XP/level system with additive multipliers (pts: 1+(level-1)*2.5, XP: 1+(level-1)*0.5), drop upgrades (3: dropAmount, dropXP, rapidDrop), prestige system (unlocks at 1000 current points, PP = floor(pts/1000)), rebirth system (5 tiers with point-based costs)
- **Bonuses tab** (unlocked at level 8): Coins spawn every 2s (cap 10, no expiry), tap to collect. Coin upgrades (3): moreCash (2x pts, max 10), moreXP (2x XP, max 10), fasterSpawn (-0.2s interval, max 4). No combo/frenzy system.
- **Upgrade Tree** (unlocked at level 7): 9 rows of permanent nodes with multi-currency costs (points, PP, coins, RP), tree-wide multipliers. Defined in `constants/upgradeTree.ts`.
- **Reading system** (unlocked via tree node r7_unlockReading): Books cost 10k coins +10%/buy, earn 1 RP/sec each. 3 reading upgrades: morePoints, moreXP, moreRP.
- **Prestige**: Max 10 buys per upgrade (+25 with tier 2 rebirth). Upgrades: morePoints (2x), moreXP (2x), morePP (2x). Tier 2 rebirth keeps upgrades across prestiges.
- **Rebirth**: 5 tiers, visible at level 10. Costs: T1=1e15, T2=2.5e16, T3=5e17, T4=2.5e19, T5=1e21. Uses `rebirthTier` integer (not boolean perks). Resets points, XP, level, upgrades, prestige; keeps coins, tree, reading.
- **Auth**: Replit Auth (OIDC + PKCE) for cloud saves
- **Cloud sync**: 10s debounced sync via GET/PUT /api/saves, offline queue, conflict resolution by lifetimePoints
- **State**: GameContext.tsx manages all game state via useReducer; persisted to AsyncStorage (key: "dropper_game_v3") + cloud. LOAD reducer migrates old saves (dropTimer→rapidDrop, pointSurge→moreCash, xpSurge→moreXP, coinRush→fasterSpawn, rebirthPerks booleans→rebirthTier integer).
- **Design**: Dark navy (#050D1A) bg, neon cyan (#00E5FF) accents, gold for prestige, purple for rebirth, 5 rebirth tier colors

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
