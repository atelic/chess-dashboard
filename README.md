# Chess Dashboard

A chess game analysis dashboard that aggregates games from Chess.com and Lichess, providing statistics, opening analysis, and browser-based Stockfish engine analysis.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **State**: Zustand
- **Charts**: Recharts
- **Database**: Turso (production), SQLite (development)
- **Chess Engine**: Stockfish.wasm

## Getting Started

### Prerequisites

- Node.js 25.2.1 (use `nvm use` to switch)
- npm

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Configure database (optional for development):
   - Development uses local SQLite at `./data/dev.db` by default
   - For production, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run test:all` | Run all tests |

## Database

- **Development**: Local SQLite file at `./data/dev.db`
- **Production**: Turso (LibSQL)

To seed dev database with production data:
```bash
npx tsx scripts/copy-prod-to-dev.ts
```

To use production database in development:
```bash
USE_PROD_DB=true npm run dev
```

## Project Structure

See [CLAUDE.md](./CLAUDE.md) or [AGENTS.md](./AGENTS.md) for detailed architecture documentation.
