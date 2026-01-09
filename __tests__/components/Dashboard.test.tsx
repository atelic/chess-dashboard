import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '@/components/Dashboard';
import { createTestGame, createWinGame, createLossGame } from '../fixtures/game';

// Mock the tab components to simplify testing
vi.mock('@/components/tabs/OverviewTab', () => ({
  default: ({ games }: { games: unknown[] }) => (
    <div data-testid="dashboard-tab">Dashboard Tab - {games.length} games</div>
  ),
}));

vi.mock('@/components/tabs/GamesTab', () => ({
  default: ({ games }: { games: unknown[] }) => (
    <div data-testid="games-tab">Games Tab - {games.length} games</div>
  ),
}));

vi.mock('@/components/tabs/AnalysisTab', () => ({
  default: ({ games }: { games: unknown[] }) => (
    <div data-testid="analysis-tab">Analysis Tab - {games.length} games</div>
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
      
      expect(screen.getByText('Loading games...')).toBeInTheDocument();
    });

    it('does not show tabs during loading', () => {
      render(<Dashboard games={[]} isLoading={true} />);
      
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
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
      
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });
  });

  describe('with games', () => {
    it('renders tab navigation', () => {
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('renders all expected tabs', () => {
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      expect(screen.getByRole('tab', { name: /Dashboard/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Games/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Analysis/ })).toBeInTheDocument();
    });

    it('shows Dashboard tab content by default', () => {
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument();
    });

    it('marks Dashboard tab as selected by default', () => {
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      const dashboardTab = screen.getByRole('tab', { name: /Dashboard/ });
      expect(dashboardTab).toHaveAttribute('aria-selected', 'true');
    });

    it('does not show other tab content initially', () => {
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      expect(screen.queryByTestId('games-tab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analysis-tab')).not.toBeInTheDocument();
    });
  });

  describe('tab navigation', () => {
    it('switches to Games tab when clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      await user.click(screen.getByRole('tab', { name: /Games/ }));
      
      expect(screen.getByTestId('games-tab')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-tab')).not.toBeInTheDocument();
    });

    it('updates aria-selected when tab is selected', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      await user.click(screen.getByRole('tab', { name: /Games/ }));
      
      expect(screen.getByRole('tab', { name: /Games/ })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /Dashboard/ })).toHaveAttribute('aria-selected', 'false');
    });

    it('switches to Analysis tab when clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      await user.click(screen.getByRole('tab', { name: /Analysis/ }));
      
      expect(screen.getByTestId('analysis-tab')).toBeInTheDocument();
    });

    it('can navigate back to previous tab', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      // Navigate to Games tab
      await user.click(screen.getByRole('tab', { name: /Games/ }));
      expect(screen.getByTestId('games-tab')).toBeInTheDocument();
      
      // Navigate back to Dashboard
      await user.click(screen.getByRole('tab', { name: /Dashboard/ }));
      expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument();
      expect(screen.queryByTestId('games-tab')).not.toBeInTheDocument();
    });
  });

  describe('data passing', () => {
    it('passes games to active tab component', () => {
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      expect(screen.getByTestId('dashboard-tab')).toHaveTextContent('3 games');
    });

    it('passes games when switching tabs', async () => {
      const user = userEvent.setup();
      render(<Dashboard games={mockGames} isLoading={false} />);
      
      await user.click(screen.getByRole('tab', { name: /Analysis/ }));
      
      expect(screen.getByTestId('analysis-tab')).toHaveTextContent('3 games');
    });
  });

  describe('edge cases', () => {
    it('handles single game', () => {
      const singleGame = [createWinGame({ id: '1' })];
      render(<Dashboard games={singleGame} isLoading={false} />);
      
      expect(screen.getByTestId('dashboard-tab')).toHaveTextContent('1 games');
    });

    it('handles large number of games', () => {
      const manyGames = Array.from({ length: 1000 }, (_, i) =>
        createTestGame({ id: String(i) })
      );
      render(<Dashboard games={manyGames} isLoading={false} />);
      
      expect(screen.getByTestId('dashboard-tab')).toHaveTextContent('1000 games');
    });
  });
});
