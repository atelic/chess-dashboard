'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  List,
  Search,
  BarChart3,
  BookOpen,
  Users,
  Clock,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

function SidebarTooltip({ children, content, isCollapsed }: { children: React.ReactNode; content: string; isCollapsed: boolean }) {
  if (!isCollapsed) return <>{children}</>;
  
  return (
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger asChild>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className="z-50 px-2 py-1.5 text-xs font-medium text-zinc-100 bg-zinc-800 border border-zinc-700 rounded-md shadow-md animate-scale-in"
        >
          {content}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export type NavSection =
  | 'overview'
  | 'games'
  | 'explorer'
  | 'openings'
  | 'opponents'
  | 'time'
  | 'performance'
  | 'settings';

interface CommandSidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
}

interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
  expandable?: boolean;
}

const NAV_STRUCTURE: NavGroup[] = [
  {
    id: 'main',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, shortcut: 'G O' },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    items: [
      { id: 'games', label: 'Games', icon: List, shortcut: 'G G' },
      { id: 'explorer', label: 'Explorer', icon: Search, shortcut: 'G E' },
    ],
  },
  {
    id: 'analysis',
    label: 'Analysis',
    expandable: true,
    items: [
      { id: 'openings', label: 'Openings', icon: BookOpen, shortcut: 'G A' },
      { id: 'opponents', label: 'Opponents', icon: Users, shortcut: 'G P' },
      { id: 'time', label: 'Time Analysis', icon: Clock, shortcut: 'G T' },
      { id: 'performance', label: 'Performance', icon: TrendingUp, shortcut: 'G R' },
    ],
  },
  {
    id: 'system',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings, shortcut: 'G S' },
    ],
  },
];

export default function CommandSidebar({
  activeSection,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
}: CommandSidebarProps) {
  const [analysisExpanded, setAnalysisExpanded] = useState(true);

  const isAnalysisSection = ['openings', 'opponents', 'time', 'performance'].includes(activeSection);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-card/50 border-r border-border flex flex-col sidebar-transition z-40',
        isCollapsed ? 'w-16' : 'w-60'
      )}
      aria-label="Main navigation"
    >
      <Tooltip.Provider>
      {/* Logo Area */}
      <div className={cn(
        'h-14 flex items-center border-b border-border px-4',
        isCollapsed && 'justify-center px-0'
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">Chess Command</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Primary">
        {NAV_STRUCTURE.map((group, groupIndex) => (
          <div key={group.id} className={cn(groupIndex > 0 && 'mt-6')}>
            {/* Group Label */}
            {group.label && !isCollapsed && (
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </div>
            )}

            {/* Expandable Group Header */}
            {group.expandable && !isCollapsed && (
              <button
                onClick={() => setAnalysisExpanded(!analysisExpanded)}
                className={cn(
                  'nav-item w-full mb-1',
                  isAnalysisSection && 'text-primary'
                )}
                aria-expanded={analysisExpanded}
                aria-controls="analysis-nav-group"
              >
                <BarChart3 className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform',
                    !analysisExpanded && '-rotate-90'
                  )}
                  aria-hidden="true"
                />
              </button>
            )}

            {/* Nav Items */}
            {(!group.expandable || analysisExpanded || isCollapsed) && (
              <div id={group.expandable ? 'analysis-nav-group' : undefined} className={cn(group.expandable && !isCollapsed && 'ml-4')}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <SidebarTooltip key={item.id} content={item.label} isCollapsed={isCollapsed}>
                      <button
                        onClick={() => onNavigate(item.id)}
                        className={cn(
                          'nav-item w-full',
                          isActive && 'active',
                          isCollapsed && 'justify-center px-0'
                        )}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.shortcut && (
                              <span className="text-[10px] text-muted-foreground/60">{item.shortcut}</span>
                            )}
                          </>
                        )}
                      </button>
                    </SidebarTooltip>
                  );
                })}
              </div>
            )}

            {/* Divider after group (except last) */}
            {groupIndex < NAV_STRUCTURE.length - 1 && groupIndex !== 0 && (
              <div className="my-4 border-t border-border" />
            )}
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-border">
        <SidebarTooltip content="Expand sidebar" isCollapsed={isCollapsed}>
          <button
            onClick={onToggleCollapse}
            className={cn(
              'nav-item w-full',
              isCollapsed && 'justify-center px-0'
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </SidebarTooltip>
      </div>
      </Tooltip.Provider>
    </aside>
  );
}
