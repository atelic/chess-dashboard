# lib/ - Core Application Logic

Domain-Driven Design architecture. Business logic isolated from infrastructure.

## Structure

```
lib/
  domain/
    models/           # Game, User, GameFilter (immutable value objects)
    services/         # GameService, UserService, SyncService, AnalysisService
    repositories/     # IGameRepository, IUserRepository, ISessionRepository interfaces
  infrastructure/
    api-clients/      # ChessComClient, LichessClient (implement IChessClient)
    database/
      repositories/   # TursoGameRepository, TursoUserRepository (concrete impls)
      client.ts       # Turso/libSQL connection
    factories.ts      # Dependency injection entry point
  auth/               # NextAuth v5 config, rate limiting, session helpers
  analysis/           # Stockfish WASM, Lichess cloud eval, opening explorer
  shared/             # AppError hierarchy, base types, validation
  api/                # Legacy API utilities (prefer infrastructure/api-clients/)
  types.ts            # Central type definitions (USE THIS for imports)
  utils.ts            # 2100+ lines of stats/insights functions
```

## Where to Look

| Task | Location |
|------|----------|
| Add repository method | `domain/repositories/interfaces.ts` then `infrastructure/database/repositories/` |
| Add service logic | `domain/services/` |
| Modify game model | `domain/models/Game.ts` |
| Add API client feature | `infrastructure/api-clients/` |
| Add error type | `shared/errors.ts` (extend `AppError`) |
| Add stat calculation | `utils.ts` under appropriate section header |

## Patterns

### Repository Interface Pattern
```typescript
// 1. Define in domain/repositories/interfaces.ts
export interface IGameRepository {
  findAll(userId: number, filter?: GameFilter): Promise<Game[]>;
}

// 2. Implement in infrastructure/database/repositories/
export class TursoGameRepository implements IGameRepository { ... }

// 3. Wire via factories.ts
export async function createGameService(): Promise<GameService> {
  const repo = await createGameRepository();
  return new GameService(repo);
}
```

### Service Pattern
Services orchestrate domain logic. Inject repositories via constructor:
```typescript
export class SyncService {
  constructor(
    private readonly gameRepository: IGameRepository,
    private readonly userRepository: IUserRepository,
    private readonly chessComClient: IChessClient,
    private readonly lichessClient: IChessClient,
  ) {}
}
```

### GameFilter (Immutable Value Object)
```typescript
const filter = GameFilter.empty()
  .withTimeClasses(['blitz', 'rapid'])
  .withResults(['win']);
const games = filter.apply(allGames); // Client-side filtering
```

## Anti-Patterns

| Forbidden | Do Instead |
|-----------|------------|
| Import from `shared/types` | Use `@/lib/types` |
| Direct Turso calls in services | Use repository interfaces |
| New file in `api/` | Add to `infrastructure/api-clients/` |
| Hardcode user ID | Get from session via `getAuthenticatedUser()` |

## Complexity Hotspots

| File | Lines | Notes |
|------|-------|-------|
| `utils.ts` | 2100+ | Stats, insights, filtering. Grouped by section headers. |
| `infrastructure/api-clients/ChessComClient.ts` | 543 | Archive pagination, PGN parsing |
| `infrastructure/database/repositories/TursoGameRepository.ts` | 453 | SQL filter building |
| `domain/models/GameFilter.ts` | 442 | Builder pattern, client-side filtering |

## Auth Layer (`lib/auth/`)

| File | Purpose |
|------|---------|
| `config.ts` | NextAuth v5 setup, `authorized` callback, session cleanup |
| `rate-limit.ts` | IP-based limits, email lockout (5 attempts = 15min lock) |
| `helpers.ts` | `getAuthenticatedUser()`, `getOptionalUser()` |
| `types.ts` | Module augmentation for Session/JWT types |

## Analysis Layer (`lib/analysis/`)

| File | Purpose |
|------|---------|
| `lichess-cloud-eval.ts` | Pre-computed evals from Lichess (fast) |
| `stockfish-engine.ts` | WASM engine wrapper (fallback) |
| `lichess-opening-explorer.ts` | Opening book lookups |
