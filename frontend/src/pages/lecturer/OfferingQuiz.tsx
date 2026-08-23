import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { AssessmentItem, QuizAttempt, QuizQuestion } from '../../types/domain';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, Loading } from '../../components/StateViews';
import { IconAward } from '../../components/icons';

const EMPTY_CHOICES = ['', ''];

function QuestionForm({ itemId, onAdded }: { itemId: string; onAdded: () => void }) {
  const [text, setText] = useState('');
  const [choices, setChoices] = useState<string[]>(EMPTY_CHOICES);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addChoice = () => setChoices([...choices, '']);
  const removeChoice = (i: number) => {
    if (choices.length <= 2) return;
    setChoices(choices.filter((_, idx) => idx !== i));
    if (correctIndex >= choices.length - 1) setCorrectIndex(0);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/assessment-items/${itemId}/quiz-questions`, {
        text,
        choices: choices.map((c, i) => ({ text: c, isCorrect: i === correctIndex })),
      });
      setText('');
      setChoices(EMPTY_CHOICES);
      setCorrectIndex(0);
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add question');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card" onSubmit={submit} aria-label="Add a question" style={{ display: 'grid', gap: 'var(--space-3)' }}>
      {error && <p className="error" role="alert">{error}</p>}
      <label>
        Question
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="What's the question?" required />
      </label>

      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        <span>Choices — select the correct one</span>
        {choices.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <input
              type="radio"
              name={`correct-${itemId}`}
              checked={correctIndex === i}
              onChange={() => setCorrectIndex(i)}
              aria-label={`Choice ${i + 1} is correct`}
            />
            <input
              value={c}
              onChange={(e) => setChoices(choices.map((cc, idx) => (idx === i ? e.target.value : cc)))}
              placeholder={`Choice ${i + 1}`}
              required
              style={{ flex: 1 }}
            />
            {choices.length > 2 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeChoice(i)}>
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" style={{ justifySelf: 'start' }} onClick={addChoice}>
          Add another choice
        </button>
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifySelf: 'start' }}>
        {saving ? 'Adding…' : 'Add question'}
      </button>
    </form>
  );
}

export function OfferingQuiz() {
  const { offeringId, itemId } = useParams<{ offeringId: string; itemId: string }>();
  const [item, setItem] = useState<AssessmentItem | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!offeringId || !itemId) return;
    Promise.all([
      api.get<AssessmentItem[]>(`/course-offerings/${offeringId}/assessment-items`),
      api.get<QuizQuestion[]>(`/assessment-items/${itemId}/quiz-questions`),
      api.get<QuizAttempt[]>(`/assessment-items/${itemId}/quiz-attempts`),
    ])
      .then(([items, questionData, attemptData]) => {
        setItem(items.find((i) => i.id === itemId) ?? null);
        setQuestions(questionData);
        setAttempts(attemptData);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load quiz'));
  }, [offeringId, itemId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!offeringId || !itemId) return <p className="error" role="alert">Missing offering or quiz id.</p>;

  const removeQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;
    setBusyQuestionId(questionId);
    setError(null);
    try {
      await api.delete(`/assessment-items/${itemId}/quiz-questions/${questionId}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete question');
    } finally {
      setBusyQuestionId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title={item ? `Quiz: ${item.title}` : 'Quiz'}
        subtitle="Add multiple-choice questions and see which students have taken it."
        crumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'My Offerings', to: '/my-offerings' },
          { label: 'Gradebook', to: `/my-offerings/${offeringId}` },
          { label: 'Quiz' },
        ]}
      />
      {error && <p className="error" role="alert">{error}</p>}

      <h2 style={{ marginBottom: 'var(--space-3)' }}>Questions</h2>
      {!questions ? (
        <Loading label="Loading questions…" />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {questions.length === 0 ? (
            <EmptyState icon={<IconAward />} title="No questions yet" description="Add your first question below." />
          ) : (
            questions.map((q, idx) => (
              <div key={q.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                  <p style={{ fontWeight: 500 }}>
                    {idx + 1}. {q.text}
                  </p>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={busyQuestionId === q.id}
                    onClick={() => void removeQuestion(q.id)}
                  >
                    Delete
                  </button>
                </div>
                <ul style={{ listStyle: 'none', margin: 'var(--space-2) 0 0', padding: 0, display: 'grid', gap: 'var(--space-1)' }}>
                  {q.choices.map((c) => (
                    <li key={c.id} style={{ color: c.isCorrect ? 'var(--color-success)' : 'var(--color-ink-soft)' }}>
                      {c.isCorrect ? '✓ ' : '– '}
                      {c.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}

      {itemId && <QuestionForm itemId={itemId} onAdded={load} />}

      <h2 style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>Attempts</h2>
      {!attempts ? (
        <Loading label="Loading attempts…" />
      ) : attempts.length === 0 ? (
        <EmptyState icon={<IconAward />} title="No attempts yet" description="No student has taken this quiz yet." />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th className="num">Score</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.student?.user.firstName} {a.student?.user.lastName}{' '}
                    <span className="mono" style={{ color: 'var(--color-ink-faint)' }}>
                      ({a.student?.studentNumber})
                    </span>
                  </td>
                  <td>
                    {a.submittedAt ? (
                      <span className={`chip ${a.isLate ? 'chip-warn' : 'chip-ok'}`}>
                        {a.isLate ? 'submitted late' : 'submitted'}
                      </span>
                    ) : (
                      <span className="chip chip-neutral">in progress</span>
                    )}
                  </td>
                  <td className="num">{a.score !== null ? `${a.score} / ${item?.maxMarks ?? '?'}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
