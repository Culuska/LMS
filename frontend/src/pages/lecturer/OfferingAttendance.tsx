import { Fragment, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { AttendanceSession, AttendanceStatus, RosterEntry } from '../../types/domain';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, Loading } from '../../components/StateViews';
import { IconClipboard } from '../../components/icons';

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/** Lecturer-side attendance: create a session for today's (or any) class date, then mark
 * every registered student Present/Absent/Late/Excused in one bulk save — a roll call,
 * not one request per student (see backend RecordAttendanceDto). */
export function OfferingAttendance() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [sessions, setSessions] = useState<AttendanceSession[] | null>(null);
  const [sessionDate, setSessionDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!offeringId) return;
    Promise.all([
      api.get<RosterEntry[]>(`/course-registrations/offering/${offeringId}`),
      api.get<AttendanceSession[]>(`/course-offerings/${offeringId}/attendance-sessions`),
    ])
      .then(([rosterData, sessionData]) => {
        setRoster(rosterData);
        setSessions(sessionData);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load attendance'));
  }, [offeringId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!offeringId) return <p className="error" role="alert">Missing offering id.</p>;

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.post(`/course-offerings/${offeringId}/attendance-sessions`, { sessionDate });
      setSessionDate('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const openSession = (session: AttendanceSession) => {
    if (expandedSessionId === session.id) {
      setExpandedSessionId(null);
      return;
    }
    setExpandedSessionId(session.id);
    const initial: Record<string, AttendanceStatus> = {};
    for (const r of roster ?? []) {
      const existing = session.records.find((rec) => rec.studentId === r.student.id);
      initial[r.student.id] = existing?.status ?? 'PRESENT';
    }
    setDraft(initial);
  };

  const saveAttendance = async (sessionId: string) => {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/course-offerings/${offeringId}/attendance-sessions/${sessionId}/records`, {
        records: Object.entries(draft).map(([studentId, status]) => ({ studentId, status })),
      });
      setExpandedSessionId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Create a session for each class date, then mark who was present."
        crumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'My Offerings', to: '/my-offerings' },
          { label: 'Attendance' },
        ]}
      />
      {error && <p className="error" role="alert">{error}</p>}

      <form className="inline-form" onSubmit={createSession} aria-label="Create attendance session">
        <label>
          Class date
          <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? 'Creating…' : 'New session'}
        </button>
      </form>

      <div style={{ marginTop: 'var(--space-6)' }}>
        {!sessions || !roster ? (
          <Loading label="Loading attendance…" />
        ) : sessions.length === 0 ? (
          <EmptyState icon={<IconClipboard />} title="No sessions yet" description="Create your first class session above." />
        ) : roster.length === 0 ? (
          <EmptyState icon={<IconClipboard />} title="No students registered yet" description="Once students register, you can take attendance." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="num">Present</th>
                  <th className="num">Absent</th>
                  <th className="num">Late</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <Fragment key={s.id}>
                    <tr>
                      <td>{formatDate(s.sessionDate)}</td>
                      <td className="num">{s.records.filter((r) => r.status === 'PRESENT').length}</td>
                      <td className="num">{s.records.filter((r) => r.status === 'ABSENT').length}</td>
                      <td className="num">{s.records.filter((r) => r.status === 'LATE').length}</td>
                      <td className="action-cell">
                        <button className="btn btn-secondary btn-sm" onClick={() => openSession(s)}>
                          {expandedSessionId === s.id ? 'Close' : 'Take attendance'}
                        </button>
                      </td>
                    </tr>
                    {expandedSessionId === s.id && (
                      <tr>
                        <td colSpan={5} style={{ background: 'var(--color-surface-sunken)' }}>
                          <div style={{ display: 'grid', gap: 'var(--space-2)', padding: 'var(--space-3) 0' }}>
                            {roster.map((r) => (
                              <div key={r.student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                                <span>
                                  {r.student.user.firstName} {r.student.user.lastName}{' '}
                                  <span className="mono" style={{ color: 'var(--color-ink-faint)' }}>
                                    ({r.student.studentNumber})
                                  </span>
                                </span>
                                <select
                                  value={draft[r.student.id] ?? 'PRESENT'}
                                  onChange={(e) =>
                                    setDraft({ ...draft, [r.student.id]: e.target.value as AttendanceStatus })
                                  }
                                  aria-label={`Attendance status for ${r.student.user.firstName} ${r.student.user.lastName}`}
                                >
                                  {STATUSES.map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ justifySelf: 'start' }}
                              disabled={saving}
                              onClick={() => void saveAttendance(s.id)}
                            >
                              {saving ? 'Saving…' : 'Save attendance'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
