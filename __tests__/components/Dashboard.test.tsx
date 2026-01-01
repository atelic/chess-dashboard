import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '@/components/Dashboard';
import { createTestGame, createWinGame, createLossGame } from '../fixtures/game';

// Mock the tab components to simplify testing
vi.mock('@/components/tabs/OverviewTab', () => ({
  default: ({ games }: { games: unknown[] }) => (
    <div data-testid="overview-tab">Overview Tab - {games.length} games</div>
  ),
}));

vi.mock('@/components/tabs/GamesTab', () => ({
  default: ({ games }: { games: unknown[] }) => (
    <div data-testid="games-tab">Games Tab - {games.length} games</div>
  ),
}));

vi.mock('@/components/tabs/OpeningsTab', () => ({
  default: ({ games }: { games: unknown[] }) => (
    <div data-testid="openings-tab">Openings Tab - {games.length} games</div>
  ),
}));

vi.mock('@/components/tabs/DaysTab', () => ({
  default: ({ games }: { games: unknown[] }) => (
    <div data-testid="days-tab">Days Tab - {games.length} games</div>
  ),
}));

vi.mock('@/components/tabs/OpponentsTab', () => ({
  default: ({ games }: { games: unknown[] }) => (
    <div data-testid="opponents-tab">Opponents Tab - {games.length} games</div>
  ),
}));

vi.mock('@/components/tabs/InsightsTab', () => ({
  default: ({ games }: { games: unknown[] }) => (
    <div data-testid="insights-tab">Insights Tab - {games.length} games</div>
  ),
}));

describe('Dashboard', () => {
  const mockGames = [
    createWinGame({ id: '1', playedAt: new Date('2025-01-01') }),
    createLossGame({ id: '2', playedAt: new Date('2025-01-02') }),
    createTestGame({ id: '3', result: 'draw', playedAt: new Date('2025-01-03') }),
  ];

  describe('loading state', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<Dashboard games={[]} isLoading={true} />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading games...')).toBeInTheDocument();
    });

    it('does not show tabs during loading', () => {
      render(<Dashboard games={[]} isLoading={true} />);
      
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state message when no games and not loading', () => {
      render(<Dashboard games={[]} isLoading={false} />);
      
      expect(screen.getByText('No games to display')).toBeInTheDocument();
    });

    it('provides instructions to add games', () => {
      render(<Dashboard games={[]} isLoading={false} />);
      
      expect(screen.getByText(/Enter your Chess.com or Lichess username/)).toBeInTheDocument();
    });

    it('does not show tabs in empty state', () => {
      render(<Dashboard games={[]} isLoading={false} />);
      
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });

  describe('with games', () => {
    it('renders tab navigation', () => {
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeInTheDocument();
    });

    it('renders all expected tabs', () => {
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      expect(screen.getByRole('button', { name: /Overview/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Games/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Openings/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Days/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Opponents/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Insights/ })).toBeInTheDocument();
    });

    it('shows Overview tab content by default', () => {
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    });

    it('marks Overview tab as current by default', () => {
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      const overviewTab = screen.getByRole('button', { name: /Overview/ });
      expect(overviewTab).toHaveAttribute('aria-current', 'page');
    });

    it('does not show other tab content initially', () => {
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      expect(screen.queryByTestId('games-tab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('openings-tab')).not.toBeInTheDocument();
    });
  });

  describe('tab navigation', () => {
    it('switches to Games tab when clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      await user.click(screen.getByRole('button', { name: /Games/ }));
      
      expect(screen.getByTestId('games-tab')).toBeInTheDocument();
      expect(screen.queryByTestId('overview-tab')).not.toBeInTheDocument();
    });

    it('updates aria-current when tab is selected', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      await user.click(screen.getByRole('button', { name: /Games/ }));
      
      expect(screen.getByRole('button', { name: /Games/ })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('button', { name: /Overview/ })).not.toHaveAttribute('aria-current');
    });

    it('switches to Openings tab when clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      await user.click(screen.getByRole('button', { name: /Openings/ }));
      
      expect(screen.getByTestId('openings-tab')).toBeInTheDocument();
    });

    it('switches to Days tab when clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      await user.click(screen.getByRole('button', { name: /Days/ }));
      
      expect(screen.getByTestId('days-tab')).toBeInTheDocument();
    });

    it('switches to Opponents tab when clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      await user.click(screen.getByRole('button', { name: /Opponents/ }));
      
      expect(screen.getByTestId('opponents-tab')).toBeInTheDocument();
    });

    it('switches to Insights tab when clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      await user.click(screen.getByRole('button', { name: /Insights/ }));
      
      expect(screen.getByTestId('insights-tab')).toBeInTheDocument();
    });

    it('can navigate back to previous tab', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      // Navigate to Games tab
      await user.click(screen.getByRole('button', { name: /Games/ }));
      expect(screen.getByTestId('games-tab')).toBeInTheDocument();
      
      // Navigate back to Overview
      await user.click(screen.getByRole('button', { name: /Overview/ }));
      expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      expect(screen.queryByTestId('games-tab')).not.toBeInTheDocument();
    });
  });

  describe('data passing', () => {
    it('passes games to active tab component', () => {
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      // The mock component displays the game count
      expect(screen.getByTestId('overview-tab')).toHaveTextContent('3 games');
    });

    it('passes games when switching tabs', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      await user.click(screen.getByRole('button', { name: /Insights/ }));
      
      expect(screen.getByTestId('insights-tab')).toHaveTextContent('3 games');
    });
  });

  describe('edge cases', () => {
    it('handles single game', () => {
      const singleGame = [createWinGame({ id: '1' })];
      render(<Dashboard games={singleGame} isLoading={false} />);
      
      expect(screen.getByTestId('overview-tab')).toHaveTextContent('1 games');
    });

    it('handles large number of games', () => {
      const manyGames = Array.from({ length: 1000 }, (_, i) =>
        createTestGame({ id: String(i) })
      );
      render(<Dashboard games={manyGames} isLoading={false} />);
      
      expect(screen.getByTestId('overview-tab')).toHaveTextContent('1000 games');
    });
  });
});
