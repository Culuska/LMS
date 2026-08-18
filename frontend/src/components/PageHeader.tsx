import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronRight } from './icons';

export interface Crumb {
  label: string;
  to?: string;
}

/** Consistent page identity: where am I (breadcrumb), what is this (title +
 * one-line purpose), what can I do from here (actions). Used at the top of every
 * screen so navigation context never depends on remembering how you got there —
 * the Findable pillar's "consistent page structure" requirement. */
export function PageHeader({
  title,
  subtitle,
  crumbs,
  actions,
}: {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {crumbs && crumbs.length > 0 && (
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <ol style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
              {crumbs.map((c, i) => (
                <li key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {i > 0 && <IconChevronRight className="sep" style={{ width: '0.9rem', height: '0.9rem' }} />}
                  {c.to ? <Link to={c.to}>{c.label}</Link> : <span className="current">{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
