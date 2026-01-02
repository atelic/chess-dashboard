# AGENTS.md - Chess Dashboard

**Generated**: 2026-01-02 | **Commit**: 659074c | **Branch**: main

## Overview

Next.js 16 chess analytics dashboard. Imports games from Chess.com/Lichess, stores in Turso/libSQL, analyzes with Stockfish WASM. Multi-user auth via NextAuth v5.

## Structure

```
app/                    # Next.js App Router
  api/                  # REST endpoints (games, sync, auth, user)
  dashboard/            # Main authenticated view
  (auth pages)          # login, register, forgot-password, etc.
components/             # React components (see components/AGENTS.md)
lib/                    # Core logic - DDD architecture (see lib/AGENTS.md)
  domain/               # Models, Services, Repository interfaces
  infrastructure/       # Turso repos, Chess.com/Lichess clients
  auth/                 # NextAuth config, rate limiting, helpers
  analysis/             # Stockfish WASM, Lichess cloud eval
hooks/                  # useGames, useSync, useUser
stores/                 # Zustand (useAppStore)
__tests__/              # Vitest + Playwright (see __tests__/AGENTS.md)
```

## Where to Look

| Task | Location | Notes |
|------|----------|-------|
| Add API endpoint | `app/api/` | Use `getAuthenticatedUser()` from `lib/auth/helpers` |
| Add chart/visualization | `components/` | Wrap in Card, use Recharts |
| Add game stat calculation | `lib/utils.ts` | 2100+ lines - group by section headers |
| Modify game sync logic | `lib/domain/services/SyncService.ts` | Orchestrates Chess.com + Lichess |
| Change auth behavior | `lib/auth/config.ts` | NextAuth v5 credentials provider |
| Add database query | `lib/infrastructure/database/repositories/` | Implement interface from `lib/domain/repositories/interfaces.ts` |
| Add/modify types | `lib/types.ts` | Central type definitions |

## Commands

```bash
npm run dev             # Dev server (localhost:3000)
npm run build           # Production build
npm run lint            # ESLint
npm run test            # Vitest unit tests
npm run test:e2e        # Playwright E2E tests
npm run test:all        # Both test suites
```

## Conventions

### TypeScript
- `import type { X }` for type-only imports
- Path alias: `@/*` maps to root
- Types in `@/lib/types` (NOT `@/lib/shared/types`)

### React
- `'use client'` directive for interactive components
- UI primitives use `forwardRef` with `displayName`
- Hooks return `{ state, actions }` pattern

### Styling (Tailwind v4 - Dark Theme)
| Element | Classes |
|---------|---------|
| Background | `bg-zinc-950` |
| Card | `bg-zinc-900 border border-zinc-800 rounded-xl p-6` |
| Primary text | `text-zinc-100` |
| Muted text | `text-zinc-400` / `text-zinc-500` |
| Primary button | `bg-blue-600 hover:bg-blue-700 text-white` |
| Success | `text-green-400` |
| Error | `text-red-400` |

### Import Order
```typescript
'use client';
import { useState } from 'react';           // 1. React/external
import type { Game } from '@/lib/types';    // 2. Types
import { calculateStats } from '@/lib/utils'; // 3. Internal (@/)
import Card from './ui/Card';               // 4. Relative
```

## Anti-Patterns

| Forbidden | Reason |
|-----------|--------|
| Edit `next.config.ts` headers | COOP/COEP required for Stockfish WASM SharedArrayBuffer |
| Import types from `@/lib/shared/types` | Use `@/lib/types` exclusively |
| Skip `getAuthenticatedUser()` in API routes | All `/api/` routes (except auth) require session check |
| Modify `public/stockfish/*` | Vendored WASM files, excluded from lint |

## Architecture Notes

### DDD Layers
- **Domain** (`lib/domain/`): Business logic, interfaces, models
- **Infrastructure** (`lib/infrastructure/`): Concrete implementations (Turso, API clients)
- **Shared** (`lib/shared/`): Cross-cutting (errors, base types)

### Auth Flow
- NextAuth v5 with Credentials provider
- 30-day JWT sessions enriched with chess usernames
- Rate limiting: 5 login attempts/min, 15-min lockout after 5 failures
- `proxy.ts` contains middleware logic but is **not active** (should be `middleware.ts`)

### Analysis Pipeline
1. Try Lichess Cloud Eval (fast, pre-computed)
2. Fallback to Stockfish WASM (slower, local)
3. Store results in `games.analysis` column

### Testing
- **529 tests** across 20 files
- **70% coverage threshold** (branches, functions, lines, statements)
- MSW for API mocking, in-memory SQLite for DB tests

## Key Types

```typescript
interface Game {
  id: string;
  source: 'chesscom' | 'lichess';
  playedAt: Date;
  timeClass: 'bullet' | 'blitz' | 'rapid' | 'classical';
  playerColor: 'white' | 'black';
  result: 'win' | 'loss' | 'draw';
  opening: { eco: string; name: string };
  opponent: { username: string; rating: number };
  clock?: ClockData;
  analysis?: AnalysisData;
}
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
- **Security**: `npm audit`
- **Test + Typecheck**: Must pass (blocking)
- **Lint**: Non-blocking (pre-existing issues)
- **Build**: Runs after test + typecheck pass
