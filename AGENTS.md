# AGENTS.md - Chess Dashboard

Guidelines for AI agents working in this codebase.

## Build/Lint/Test Commands

```bash
npm install          # Install dependencies
npm run dev          # Development server (hot reload)
npm run build        # Production build
npm run lint         # ESLint with Next.js config
npm test             # Unit tests (Vitest)
npm run test:watch   # Tests in watch mode
npm run test:e2e     # Playwright e2e tests
npm run test:all     # All tests (unit + e2e)
```

## Project Structure

```
app/                    # Next.js App Router
  api/                  # API routes (games/, sync/, user/)
  dashboard/            # Main dashboard page
components/
  ui/                   # Reusable primitives (Button, Card, Input, Tabs, Toast, Spinner)
  tabs/                 # Tab content (OverviewTab, GamesTab, AnalysisTab, etc.)
  dashboard/            # Dashboard layout components
  games/                # Game-related components
  *.tsx                 # Feature components (charts, forms, filters)
hooks/                  # Custom hooks (useGames, useUser, useSync)
stores/                 # Zustand stores (useAppStore)
lib/
  api/                  # Chess.com and Lichess API clients
  domain/               # Business logic, models, service interfaces
  infrastructure/       # Database clients, repositories
  shared/               # Common types, errors, validation
  utils/core.ts         # Statistical analysis utilities
  types.ts              # TypeScript type definitions
__tests__/              # Test files (unit/, integration/, e2e/, fixtures/, mocks/)
```

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4, shadcn/ui (zinc theme)
- **State**: Zustand with persist middleware
- **Charts**: Recharts
- **Database**: Turso (prod), SQLite (dev)
- **Chess Engine**: Stockfish.wasm

## TypeScript Conventions

- Use `import type { ... }` for type-only imports
- Define props interfaces: `interface ComponentNameProps { ... }`
- Union types for constrained values: `type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'classical'`
- Path alias: `@/*` maps to project root

## React Patterns

```typescript
'use client';  // Required for components with hooks/interactivity

// UI primitives use forwardRef
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', ...props }, ref) => { ... }
);
Button.displayName = 'Button';

// Custom hooks return objects with state and actions
function useGames(): UseGamesReturn {
  // Use useCallback for returned functions, useMemo for computed values
}
```

## Styling (Tailwind CSS - Dark Theme)

| Element | Classes |
|---------|---------|
| Page background | `bg-zinc-950` |
| Cards | `bg-zinc-900 border border-zinc-800 rounded-xl p-6` |
| Inputs | `bg-zinc-800` |
| Primary text | `text-zinc-100` |
| Secondary text | `text-zinc-400` |
| Muted text | `text-zinc-500` |
| Primary button | `bg-blue-600 text-white hover:bg-blue-700` |
| Success | `text-green-400`, `bg-green-500/10` |
| Error | `text-red-400`, `bg-red-900/20 border-red-800` |

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `WinRateChart`, `StatsOverview` |
| Types/Interfaces | PascalCase | `Game`, `FilterState` |
| Functions/Variables | camelCase | `calculateStats`, `activeTab` |
| Constants (arrays) | SCREAMING_SNAKE_CASE | `TIME_CLASSES`, `RESULTS` |

## Import Order

```typescript
'use client';
import { useState } from 'react';           // 1. React/external
import { LineChart } from 'recharts';
import type { Game } from '@/lib/types';    // 2. Type imports
import { calculateStats } from '@/lib/utils/core'; // 3. Internal (@/)
import Card from './ui/Card';               // 4. Relative
```

## Error Handling

```typescript
try {
  await fetchGames(username);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  setState(prev => ({ ...prev, error: message }));
}
// Display: className="bg-red-900/20 border-red-800 text-red-400"
```

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
  playerRating: number;
  termination: TerminationType;
  moveCount: number;
  ratingChange?: number;
}
```

## Component Patterns

### Chart Components
- Wrap in `Card` with title/subtitle props
- Use `ResponsiveContainer` from Recharts
- Handle empty state: `<div className="h-64 flex items-center justify-center text-zinc-500">No data</div>`

### Tab Components
- Accept `games: Game[]` as primary prop
- Calculate derived data using utils at component top
- Compose multiple chart components

### Utility Functions (`lib/utils/core.ts`)
- Group with comment headers: `// ============================================`
- Return typed data points (e.g., `OpeningDataPoint[]`)
- Filter functions accept `Partial<FilterState>`

## CSS Variables (globals.css)

```css
:root {
  --background: #0a0a0a;
  --foreground: #fafafa;
  --primary: #3b82f6;
  --success: #22c55e;
  --danger: #ef4444;
  --warning: #eab308;
}
```

## Testing

- Unit tests: Vitest with jsdom environment, MSW for API mocking
- E2E tests: Playwright (Chrome, Firefox)
- Coverage thresholds: 70% (branches, functions, lines, statements)
- Test files mirror source structure in `__tests__/`

## Common Tasks

### Adding a New Chart
1. Create `components/NewChart.tsx` with `'use client'` directive
2. Define `interface NewChartProps { data: DataPoint[] }`
3. Wrap in Card, use ResponsiveContainer, handle empty state

### Adding a Utility Function
1. Add to `lib/utils/core.ts` under appropriate section header
2. Define return type in `lib/types.ts` if needed
3. Export and import via `@/lib/utils/core`

### Adding an API Endpoint
1. Add response types to `lib/types.ts`
2. Create async function in `lib/api/*.ts`
3. Map response to internal `Game` type
