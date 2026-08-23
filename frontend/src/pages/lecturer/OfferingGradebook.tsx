import { Fragment, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError, downloadResource } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import type { AssessmentItem, AssessmentType, CourseResult, Mark, RosterEntry, Submission } from '../../types/domain';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, Loading } from '../../components/StateViews';
import { IconFile, IconUsers } from '../../components/icons';

const ASSESSMENT_TYPES: AssessmentType[] = ['ASSIGNMENT', 'QUIZ', 'MIDTERM', 'FINAL', 'PRACTICAL'];

const RESULT_CHIP: Record<CourseResult['status'], string> = {
  DRAFT: 'chip-neutral',
  SUBMITTED: 'chip-warn',
  APPROVED: 'chip-warn',
  PUBLISHED: 'chip-ok',
};

/** Lecturer/admin gradebook for one course offering: define assessment items, enter
 * marks per student per item, then drive each student's result through the
 * compute -> submit -> approve -> publish pipeline (docs/00 §5, docs/04). Approve and
 * publish are gated to roles the backend actually allows — buttons for a role that
 * would just get a 403 aren't shown, but the backend remains the real enforcement. */
export function OfferingGradebook() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const { user } = useAuth();
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [items, setItems] = useState<AssessmentItem[] | null>(null);
  const [marks, setMarks] = useState<Record<string, Record<string, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ type: 'ASSIGNMENT' as AssessmentType, title: '', weight: '', maxMarks: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});

  const canApprove = user?.roles.some((r) =>
    ['EXAM_OFFICER', 'REGISTRAR', 'HEAD_OF_DEPARTMENT', 'DEAN', 'SUPER_ADMIN'].includes(r),
  );
  const canPublish = user?.roles.some((r) => ['EXAM_OFFICER', 'SUPER_ADMIN'].includes(r));

  const load = useCallback(() => {
    if (!offeringId) return;
    Promise.all([
      api.get<RosterEntry[]>(`/course-registrations/offering/${offeringId}`),
      api.get<AssessmentItem[]>(`/course-offerings/${offeringId}/assessment-items`),
    ])
      .then(([rosterData, itemsData]) => {
        setRoster(rosterData);
        setItems(itemsData);
        return Promise.all(
          itemsData.map((item) => api.get<Mark[]>(`/assessment-items/${item.id}/marks`)),
        ).then((allMarks) => {
          const next: Record<string, Record<string, string>> = {};
          itemsData.forEach((item, idx) => {
            next[item.id] = {};
            for (const m of allMarks[idx]) {
              next[item.id][m.studentId] = m.score;
            }
          });
          setMarks(next);
        });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load gradebook'));
  }, [offeringId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!offeringId) return <p className="error" role="alert">Missing offering id.</p>;

  const saveMark = async (itemId: string, studentId: string, score: string) => {
    if (score === '' || Number.isNaN(Number(score))) return;
    setBusy(`${itemId}:${studentId}`);
    setActionError(null);
    try {
      await api.put(`/assessment-items/${itemId}/marks`, { studentId, score: Number(score) });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to save mark');
    } finally {
      setBusy(null);
    }
  };

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.post(`/course-offerings/${offeringId}/assessment-items`, {
        type: newItem.type,
        title: newItem.title,
        weight: Number(newItem.weight),
        maxMarks: Number(newItem.maxMarks),
      });
      setNewItem({ type: 'ASSIGNMENT', title: '', weight: '', maxMarks: '' });
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to create assessment item');
    }
  };

  const toggleSubmissions = async (itemId: string) => {
    if (expandedItemId === itemId) {
      setExpandedItemId(null);
      return;
    }
    setExpandedItemId(itemId);
    if (!submissions[itemId]) {
      try {
        const data = await api.get<Submission[]>(`/assessment-items/${itemId}/submissions`);
        setSubmissions((prev) => ({ ...prev, [itemId]: data }));
      } catch (err) {
        setActionError(err instanceof ApiError ? err.message : 'Failed to load submissions');
      }
    }
  };

  const runAction = async (
    action: 'compute' | 'submit' | 'approve' | 'publish',
    registrationId: string,
    resultId?: string,
  ) => {
    setBusy(registrationId);
    setActionError(null);
    try {
      if (action === 'compute') {
        await api.post(`/course-results/compute/${registrationId}`);
      } else if (resultId) {
        await api.patch(`/course-results/${resultId}/${action}`);
      }
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `Failed to ${action} result`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Gradebook"
        subtitle="Define assessment items, enter marks, then move each result through review to publication."
        crumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'My Offerings', to: '/my-offerings' },
          { label: 'Gradebook' },
        ]}
      />
      {error && <p className="error" role="alert">{error}</p>}
      {actionError && <p className="error" role="alert">{actionError}</p>}

      {!roster || !items ? (
        <Loading label="Loading gradebook…" />
      ) : (
        <>
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Assessment items</h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th className="num">Weight %</th>
                  <th className="num">Max marks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <Fragment key={i.id}>
                    <tr>
                      <td>{i.type}</td>
                      <td>{i.title}</td>
                      <td className="num">{i.weight}</td>
                      <td className="num">{i.maxMarks}</td>
                      <td className="action-cell">
                        <button className="btn btn-secondary btn-sm" onClick={() => void toggleSubmissions(i.id)}>
                          {expandedItemId === i.id ? 'Hide submissions' : 'View submissions'}
                        </button>
                      </td>
                    </tr>
                    {expandedItemId === i.id && (
                      <tr>
                        <td colSpan={5} style={{ background: 'var(--color-surface-sunken)' }}>
                          {!submissions[i.id] ? (
                            <Loading label="Loading submissions…" />
                          ) : submissions[i.id].length === 0 ? (
                            <p style={{ padding: 'var(--space-2) 0' }}>No submissions yet for this item.</p>
                          ) : (
                            <ul style={{ listStyle: 'none', margin: 0, padding: 'var(--space-2) 0', display: 'grid', gap: 'var(--space-3)' }}>
                              {submissions[i.id].map((s) => (
                                <li key={s.id}>
                                  <p style={{ fontWeight: 500 }}>
                                    {s.student?.user.firstName} {s.student?.user.lastName}{' '}
                                    <span className="mono" style={{ color: 'var(--color-ink-faint)', fontWeight: 400 }}>
                                      ({s.student?.studentNumber})
                                    </span>{' '}
                                    {s.isLate && <span className="chip chip-warn">late</span>}
                                  </p>
                                  {s.content && <p>{s.content}</p>}
                                  {s.resources.length > 0 && (
                                    <ul style={{ listStyle: 'none', margin: 'var(--space-1) 0 0', padding: 0, display: 'grid', gap: 'var(--space-1)' }}>
                                      {s.resources.map((r) => (
                                        <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                          <IconFile style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                                          <button
                                            type="button"
                                            onClick={() => void downloadResource(r.id)}
                                            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-brand-strong)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
                                          >
                                            {r.fileName}
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <form className="inline-form" onSubmit={createItem} aria-label="Add assessment item">
            <label>
              Type
              <select
                value={newItem.type}
                onChange={(e) => setNewItem({ ...newItem, type: e.target.value as AssessmentType })}
              >
                {ASSESSMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input
                placeholder="Title"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                required
              />
            </label>
            <label>
              Weight %
              <input
                placeholder="Weight %"
                type="number"
                step="0.01"
                value={newItem.weight}
                onChange={(e) => setNewItem({ ...newItem, weight: e.target.value })}
                required
              />
            </label>
            <label>
              Max marks
              <input
                placeholder="Max marks"
                type="number"
                value={newItem.maxMarks}
                onChange={(e) => setNewItem({ ...newItem, maxMarks: e.target.value })}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Add item
            </button>
          </form>

          <h2 style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>Marks &amp; results</h2>
          {roster.length === 0 ? (
            <EmptyState icon={<IconUsers />} title="No students registered yet" description="Once students register for this offering, they'll appear here." />
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    {items.map((i) => (
                      <th key={i.id}>{i.title}</th>
                    ))}
                    <th>Result</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((r) => {
                    const result: CourseResult | null = r.courseResult;
                    return (
                      <tr key={r.id}>
                        <td>
                          {r.student.user.firstName} {r.student.user.lastName}{' '}
                          <span className="mono" style={{ color: 'var(--color-ink-faint)' }}>
                            ({r.student.studentNumber})
                          </span>
                        </td>
                        {items.map((i) => (
                          <td key={i.id}>
                            <label className="sr-only" htmlFor={`mark-${i.id}-${r.student.id}`}>
                              {i.title} mark for {r.student.user.firstName} {r.student.user.lastName}
                            </label>
                            <input
                              id={`mark-${i.id}-${r.student.id}`}
                              type="number"
                              className="mark-input"
                              defaultValue={marks[i.id]?.[r.student.id] ?? ''}
                              disabled={busy === `${i.id}:${r.student.id}`}
                              onBlur={(e) => void saveMark(i.id, r.student.id, e.target.value)}
                            />
                          </td>
                        ))}
                        <td>
                          {result ? (
                            <span className={`chip ${RESULT_CHIP[result.status]}`}>
                              {result.status.toLowerCase()} · {result.letterGrade} ({result.countedPercentage}%)
                            </span>
                          ) : (
                            <span className="chip chip-neutral">no marks yet</span>
                          )}
                        </td>
                        <td className="action-cell">
                          {(!result || result.status === 'DRAFT') && (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={busy === r.id}
                              onClick={() => void runAction('compute', r.id)}
                            >
                              Compute
                            </button>
                          )}
                          {result?.status === 'DRAFT' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={busy === r.id}
                              onClick={() => void runAction('submit', r.id, result.id)}
                            >
                              Submit
                            </button>
                          )}
                          {result?.status === 'SUBMITTED' && canApprove && (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={busy === r.id}
                              onClick={() => void runAction('approve', r.id, result.id)}
                            >
                              Approve
                            </button>
                          )}
                          {result?.status === 'APPROVED' && canPublish && (
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={busy === r.id}
                              onClick={() => void runAction('publish', r.id, result.id)}
                            >
                              Publish
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
