# __tests__/ - Test Suite

**529 tests** | Vitest (unit/component) + Playwright (E2E) | **70% coverage threshold**

## Structure

```
__tests__/
  unit/
    domain/
      models/         # Game.test.ts, User.test.ts, GameFilter.test.ts
      services/       # GameService.test.ts, UserService.test.ts, SyncService.test.ts
    infrastructure/
      api-clients/    # ChessComClient.test.ts, LichessClient.test.ts
      database/       # TursoGameRepository.test.ts, TursoUserRepository.test.ts
    lib/              # utils.test.ts (72 tests)
    shared/           # errors.test.ts
    analysis/         # lichess-opening-explorer.test.ts
  components/
    ui/               # Button.test.tsx, Card.test.tsx, Input.test.tsx, etc.
    Dashboard.test.tsx
  e2e/
    auth.spec.ts      # Playwright login/register flows
  fixtures/           # Test data factories
  mocks/              # MSW handlers
  setup.ts            # Global Vitest setup
```

## Where to Look

| Task | Location |
|------|----------|
| Add unit test | Mirror path: `lib/foo.ts` → `__tests__/unit/lib/foo.test.ts` |
| Add component test | `__tests__/components/` |
| Add E2E test | `__tests__/e2e/*.spec.ts` |
| Add test fixture | `fixtures/` |
| Add mock API response | `mocks/handlers.ts` |

## Patterns

### Unit Test Structure
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameService } from '@/lib/domain/services/GameService';

describe('GameService', () => {
  let service: GameService;
  let mockRepo: MockGameRepository;

  beforeEach(() => {
    mockRepo = createMockGameRepository();
    service = new GameService(mockRepo);
  });

  it('calculates win rate correctly', async () => {
    mockRepo.findAll.mockResolvedValue([...testGames]);
    const stats = await service.getStats(1);
    expect(stats.winRate).toBe(60);
  });
});
```

### Fixture Factories (`fixtures/`)
```typescript
// fixtures/game.ts
export function createTestGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'test-game-1',
    source: 'lichess',
    result: 'win',
    ...overrides,
  };
}
```

### In-Memory Database (`fixtures/test-db.ts`)
```typescript
import { TestDatabaseClient } from './test-db';

const db = new TestDatabaseClient();  // Uses :memory: SQLite
await db.exec(TEST_SCHEMA);
const repo = new TursoGameRepository(db);
```

### MSW Mocking (`mocks/handlers.ts`)
```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.chess.com/pub/player/:username', ({ params }) => {
    if (params.username === 'validuser') {
      return HttpResponse.json({ username: 'validuser' });
    }
    return new HttpResponse(null, { status: 404 });
  }),
];
```

## Commands

```bash
npm run test              # Run all unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
npm run test:ui           # Vitest UI
npm run test:e2e          # Playwright E2E
npm run test:e2e:ui       # Playwright UI mode
npm run test:all          # Unit + E2E
```

## Coverage Thresholds

Defined in `vitest.config.ts`:
```typescript
coverage: {
  thresholds: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
  include: ['lib/**', 'app/api/**', 'hooks/**'],
}
```

## Anti-Patterns

| Forbidden | Do Instead |
|-----------|------------|
| Real network calls | Use MSW handlers |
| Shared test database | Use in-memory `:memory:` SQLite |
| Snapshot tests | Use explicit assertions |
| `test.only` in commits | Remove before push |
