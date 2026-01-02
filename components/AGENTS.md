# components/ - React Components

All components use `'use client'` directive. Dark theme with Tailwind v4.

## Structure

```
components/
  ui/                 # Primitives: Button, Card, Input, Tabs, Toast, Spinner
  tabs/               # Dashboard tabs: Overview, Games, Openings, Opponents, Insights, Improve, Days
  games/              # Game-specific: GamesTable, GameAnalysisPanel, GameLink
  providers/          # SessionProvider (NextAuth)
  *.tsx               # Feature components (charts, filters, forms)
```

## Where to Look

| Task | Location |
|------|----------|
| New UI primitive | `ui/` with forwardRef pattern |
| New dashboard tab | `tabs/` accepting `games: Game[]` prop |
| New chart | Root `components/`, wrap in Card |
| Game list feature | `games/` |

## Patterns

### UI Primitives (`ui/`)
```typescript
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', ...props }, ref) => (
    <button ref={ref} className={cn(baseStyles, variantStyles[variant], className)} {...props} />
  )
);
Button.displayName = 'Button';
```

### Chart Components
```typescript
'use client';
import { ResponsiveContainer, BarChart } from 'recharts';
import Card from './ui/Card';

export default function MyChart({ data }: { data: DataPoint[] }) {
  if (!data.length) {
    return <Card title="My Chart"><EmptyState /></Card>;
  }
  return (
    <Card title="My Chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>...</BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

### Tab Components (`tabs/`)
```typescript
interface TabProps {
  games: Game[];
}
export default function OpeningsTab({ games }: TabProps) {
  const stats = useMemo(() => calculateOpeningStats(games), [games]);
  return (
    <div className="space-y-6">
      <OpeningsChart data={stats} />
      <OpeningDepthChart games={games} />
    </div>
  );
}
```

## Styling Reference

| Element | Classes |
|---------|---------|
| Card container | `bg-zinc-900 border border-zinc-800 rounded-xl p-6` |
| Section gap | `space-y-6` |
| Grid layout | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` |
| Empty state | `h-64 flex items-center justify-center text-zinc-500` |
| Chart height | `h-64` or `h-80` |

## Key Components

| Component | Purpose |
|-----------|---------|
| `Dashboard.tsx` | Main layout, tab navigation, filter state |
| `AdvancedFilters.tsx` | Complex filter UI (441 lines) |
| `GamesTable.tsx` | Paginated game list with expandable rows |
| `GameAnalysisPanel.tsx` | Per-game analysis display |
| `StatsOverview.tsx` | Summary cards (wins/losses/draws) |

## Anti-Patterns

| Forbidden | Do Instead |
|-----------|------------|
| Fetch data in components | Use hooks (`useGames`, `useUser`) or receive as props |
| Complex calc in render | Use `useMemo` with dependency array |
| Inline styles | Use Tailwind classes |
