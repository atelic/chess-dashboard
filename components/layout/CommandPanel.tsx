'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
}

interface Action {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

interface CommandPanelProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  actions?: Action[];
  badge?: { text: string; variant: 'success' | 'warning' | 'danger' | 'info' };
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export default function CommandPanel({
  title,
  description,
  icon,
  tabs,
  activeTab,
  onTabChange,
  actions,
  badge,
  children,
  className,
  collapsible = false,
  defaultCollapsed = false,
}: CommandPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const badgeClasses = badge && {
    success: 'status-badge-success',
    warning: 'status-badge-warning',
    danger: 'status-badge-danger',
    info: 'status-badge-info',
  }[badge.variant];

  if (collapsible) {
    return (
      <div className={cn('', className)}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="collapsible-trigger"
          aria-expanded={!isCollapsed}
          aria-controls={`panel-content-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="flex items-center gap-3">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <div className="text-left">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
            {badge && (
              <span className={cn('status-badge', badgeClasses)}>{badge.text}</span>
            )}
          </div>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-muted-foreground transition-transform',
              !isCollapsed && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
        {!isCollapsed && (
          <div id={`panel-content-${title.toLowerCase().replace(/\s+/g, '-')}`} className="collapsible-content">
            <div className="p-5">{children}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('command-panel', className)}>
      {/* Header */}
      <div className="command-panel-header">
        <div className="flex items-center gap-3">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {badge && (
            <span className={cn('status-badge ml-2', badgeClasses)}>{badge.text}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          {tabs && tabs.length > 0 && (
            <div className="flex items-center gap-1 mr-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn('panel-tab', activeTab === tab.id && 'active')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-1">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  aria-label={action.label}
                >
                  {action.icon}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="command-panel-content">{children}</div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subValue,
  icon,
  trend,
  trendValue,
  className,
}: MetricCardProps) {
  const trendColor = {
    up: 'text-gain',
    down: 'text-loss',
    neutral: 'text-muted-foreground',
  }[trend || 'neutral'];

  return (
    <div className={cn('metric-card', className)}>
      <div className="flex items-start justify-between mb-3">
        <span className="metric-label">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="metric-value">{value}</div>
      {(subValue || trendValue) && (
        <div className="flex items-center gap-2 mt-2">
          {trendValue && (
            <span className={cn('text-sm font-medium', trendColor)}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {trendValue}
            </span>
          )}
          {subValue && <span className="text-sm text-muted-foreground">{subValue}</span>}
        </div>
      )}
    </div>
  );
}

// Progress Bar Component
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  color = 'primary',
  size = 'md',
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  }[color];

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  return (
    <div className={cn('', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-sm text-muted-foreground">{label}</span>}
          {showValue && (
            <span className="text-sm font-medium">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className={cn('progress-bar', heightClasses)}>
        <div
          className={cn('progress-bar-fill', colorClasses)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
