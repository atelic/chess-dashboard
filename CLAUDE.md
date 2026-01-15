# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chess game analysis dashboard that aggregates games from Chess.com and Lichess, with browser-based Stockfish analysis.

## Build/Test Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Unit tests (Vitest)
npm run test:watch   # Tests in watch mode
npm run test:e2e     # Playwright e2e tests
npm run test:all     # All tests (unit + e2e)
```

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript (strict)
- **Styling**: Tailwind CSS v4, shadcn/ui (zinc theme, new-york style)
- **State**: Zustand with persist middleware
- **Charts**: Recharts
- **Database**: Turso (LibSQL) in production, SQLite in development
- **Chess Engine**: Stockfish.wasm (requires CORS headers for SharedArrayBuffer)

## Architecture

**Domain-Driven Design layers:**
- `lib/domain/` - Business logic, models, service interfaces
- `lib/infrastructure/` - Database clients, API implementations, repositories
- `lib/shared/` - Common types, errors, validation utilities
- `lib/api/` - Chess.com and Lichess API clients

**Data flow:** Components → Hooks (useGames, useUser, useSync) → Services → Zustand store

**Database strategy:** Environment-based switching - local SQLite (`./data/dev.db`) for development, Turso for production via `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

## Key Conventions

**TypeScript:**
- `import type { ... }` for type-only imports
- Path alias: `@/*` maps to project root
- Props interfaces: `interface ComponentNameProps { ... }`

**React:**
- `'use client'` directive for client components with hooks/interactivity
- UI primitives use `forwardRef` with `displayName`

**Import order:**
```typescript
'use client';
import { useState } from 'react';           // React/external
import type { Game } from '@/lib/types';    // Type imports
import { calculateStats } from '@/lib/utils'; // Internal (@/)
import Card from './ui/Card';               // Relative
```

**Styling (dark theme):**
- Cards: `bg-zinc-900 border border-zinc-800 rounded-xl p-6`
- Primary button: `bg-blue-600 text-white hover:bg-blue-700`
- Success: `text-green-400`, Error: `text-red-400`

**Naming:**
- Components/Types: PascalCase
- Functions/Variables: camelCase
- Constants (arrays): SCREAMING_SNAKE_CASE

## Testing

- Unit tests: Vitest with jsdom, MSW for API mocking
- E2E: Playwright (Chrome, Firefox)
- Coverage thresholds: 70% (branches, functions, lines, statements)
- Test files in `__tests__/` mirroring source structure

## Important Files

- `lib/utils/core.ts` - Statistical analysis utilities (large file)
- `lib/types.ts` - Core TypeScript definitions
- `stores/useAppStore.ts` - Global Zustand store
- `next.config.ts` - CORS headers required for Stockfish WASM multi-threading

## Node Version

Use Node.js 25.2.1 (specified in `.nvmrc`). Run `nvm use` to switch.
