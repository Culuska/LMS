import type { ReactNode } from 'react';
import { IconInbox } from './icons';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-row" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon ?? <IconInbox />}
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)' }}>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
