import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import type { AssessmentItem, AssessmentType, CourseResult, Mark, RosterEntry } from '../../types/domain';

const ASSESSMENT_TYPES: AssessmentType[] = ['ASSIGNMENT', 'QUIZ', 'MIDTERM', 'FINAL', 'PRACTICAL'];

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

  if (!offeringId) return <p className="error">Missing offering id.</p>;

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
      <h1>Gradebook</h1>
      {error && <p className="error">{error}</p>}
      {actionError && <p className="error">{actionError}</p>}

      {!roster || !items ? (
        <p>Loading…</p>
      ) : (
        <>
          <h2>Assessment Items</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Weight %</th>
                <th>Max Marks</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.type}</td>
                  <td>{i.title}</td>
                  <td>{i.weight}</td>
                  <td>{i.maxMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <form className="inline-form" onSubmit={createItem}>
            <select value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value as AssessmentType })}>
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              placeholder="Title"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              required
            />
            <input
              placeholder="Weight %"
              type="number"
              step="0.01"
              value={newItem.weight}
              onChange={(e) => setNewItem({ ...newItem, weight: e.target.value })}
              required
            />
            <input
              placeholder="Max marks"
              type="number"
              value={newItem.maxMarks}
              onChange={(e) => setNewItem({ ...newItem, maxMarks: e.target.value })}
              required
            />
            <button type="submit">Add item</button>
          </form>

          <h2>Marks &amp; Results</h2>
          {roster.length === 0 ? (
            <p>No students registered yet.</p>
          ) : (
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
                        {r.student.user.firstName} {r.student.user.lastName} ({r.student.studentNumber})
                      </td>
                      {items.map((i) => (
                        <td key={i.id}>
                          <input
                            type="number"
                            className="mark-input"
                            defaultValue={marks[i.id]?.[r.student.id] ?? ''}
                            disabled={busy === `${i.id}:${r.student.id}`}
                            onBlur={(e) => void saveMark(i.id, r.student.id, e.target.value)}
                          />
                        </td>
                      ))}
                      <td>
                        {result ? `${result.status}: ${result.letterGrade} (${result.countedPercentage}%)` : '—'}
                      </td>
                      <td className="action-cell">
                        {(!result || result.status === 'DRAFT') && (
                          <button disabled={busy === r.id} onClick={() => void runAction('compute', r.id)}>
                            Compute
                          </button>
                        )}
                        {result?.status === 'DRAFT' && (
                          <button disabled={busy === r.id} onClick={() => void runAction('submit', r.id, result.id)}>
                            Submit
                          </button>
                        )}
                        {result?.status === 'SUBMITTED' && canApprove && (
                          <button disabled={busy === r.id} onClick={() => void runAction('approve', r.id, result.id)}>
                            Approve
                          </button>
                        )}
                        {result?.status === 'APPROVED' && canPublish && (
                          <button disabled={busy === r.id} onClick={() => void runAction('publish', r.id, result.id)}>
                            Publish
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
