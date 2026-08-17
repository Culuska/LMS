import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { Application, ApplicationStatus } from '../../types/domain';

const REVIEWABLE_STATUSES: ApplicationStatus[] = ['UNDER_REVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN'];

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
      <h1>Applications</h1>
      {error && <p className="error">{error}</p>}
      <div className="tab-bar">
        <button className={filter === '' ? 'tab-active' : ''} onClick={() => setFilter('')}>
          All
        </button>
        {(['SUBMITTED', 'UNDER_REVIEW', 'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as ApplicationStatus[]).map((s) => (
          <button key={s} className={filter === s ? 'tab-active' : ''} onClick={() => setFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      {!applications ? (
        <p>Loading…</p>
      ) : applications.length === 0 ? (
        <p>No applications match this filter.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>DOB</th>
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
                <td>{a.status}</td>
                <td className="action-cell">
                  {REVIEWABLE_STATUSES.map((s) => (
                    <button key={s} disabled={busy === a.id || a.status === s} onClick={() => void changeStatus(a.id, s)}>
                      {s}
                    </button>
                  ))}
                  {a.status === 'OFFERED' && (
                    <button disabled={busy === a.id} onClick={() => void accept(a.id)}>
                      Accept
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
