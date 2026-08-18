import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { Application, ApplicationStatus } from '../../types/domain';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, Loading } from '../../components/StateViews';
import { IconClipboard } from '../../components/icons';

const REVIEWABLE_STATUSES: ApplicationStatus[] = ['UNDER_REVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN'];

const STATUS_CHIP: Record<ApplicationStatus, string> = {
  SUBMITTED: 'chip-neutral',
  UNDER_REVIEW: 'chip-warn',
  OFFERED: 'chip-warn',
  ACCEPTED: 'chip-ok',
  REJECTED: 'chip-danger',
  WITHDRAWN: 'chip-danger',
};

/** Admissions review queue. Deliberately excludes ACCEPTED from the status dropdown —
 * that transition only happens via the dedicated "Accept" action, which converts the
 * applicant into a Student account (see backend UpdateApplicationStatusDto's comment). */
export function Applications() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    const query = filter ? `?status=${filter}` : '';
    api
      .get<Application[]>(`/applications${query}`)
      .then(setApplications)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load applications'));
  };

  useEffect(load, [filter]);

  const changeStatus = async (id: string, status: ApplicationStatus) => {
    setBusy(id);
    setError(null);
    try {
      await api.patch(`/applications/${id}/status`, { status });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status');
    } finally {
      setBusy(null);
    }
  };

  const accept = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await api.post(`/applications/${id}/accept`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to accept applicant');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Applications"
        subtitle="Review admissions applications and move each one through the decision workflow."
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Applications' }]}
      />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="tab-bar">
        <button className={filter === '' ? 'tab-active' : ''} aria-pressed={filter === ''} onClick={() => setFilter('')}>
          All
        </button>
        {(['SUBMITTED', 'UNDER_REVIEW', 'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as ApplicationStatus[]).map((s) => (
          <button key={s} className={filter === s ? 'tab-active' : ''} aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {!applications ? (
        <Loading label="Loading applications…" />
      ) : applications.length === 0 ? (
        <EmptyState icon={<IconClipboard />} title="No applications match this filter" description="Try a different status filter above." />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Date of birth</th>
                <th>Guardian</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.firstName} {a.lastName}
                  </td>
                  <td>{a.email}</td>
                  <td>{a.dateOfBirth.slice(0, 10)}</td>
                  <td>{a.guardianName ?? '—'}</td>
                  <td>
                    <span className={`chip ${STATUS_CHIP[a.status]}`}>{a.status.replace('_', ' ').toLowerCase()}</span>
                  </td>
                  <td className="action-cell">
                    {REVIEWABLE_STATUSES.map((s) => (
                      <button
                        key={s}
                        className="btn btn-secondary btn-sm"
                        disabled={busy === a.id || a.status === s}
                        onClick={() => void changeStatus(a.id, s)}
                      >
                        {s.replace('_', ' ').toLowerCase()}
                      </button>
                    ))}
                    {a.status === 'OFFERED' && (
                      <button className="btn btn-primary btn-sm" disabled={busy === a.id} onClick={() => void accept(a.id)}>
                        Accept
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
