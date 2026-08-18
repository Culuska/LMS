import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import type { Transcript as TranscriptData } from '../../types/domain';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, Loading } from '../../components/StateViews';
import { IconAward } from '../../components/icons';

export function Transcript() {
  const { user } = useAuth();
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.studentId) {
      setError('No student record is associated with this account.');
      return;
    }
    api
      .get<TranscriptData>(`/students/${user.studentId}/transcript`)
      .then(setTranscript)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load transcript'));
  }, [user]);

  return (
    <div>
      <PageHeader
        title="Official Transcript"
        subtitle="Your published grades, by semester, with credits and cumulative GPA."
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Transcript' }]}
      />
      {error && <p className="error" role="alert">{error}</p>}
      {!error && !transcript && <Loading label="Loading your transcript…" />}
      {transcript && (
        <>
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <h2 style={{ marginBottom: '0.25rem' }}>
              {transcript.student.firstName} {transcript.student.lastName}
            </h2>
            <p className="mono" style={{ color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)' }}>
              {transcript.student.studentNumber} · {transcript.student.status}
            </p>
            {transcript.programs.map((p) => (
              <p key={p.programName} className="transcript-program">
                {p.programName} — {p.curriculumVersion} ({p.enrollmentStatus})
              </p>
            ))}
          </div>

          {transcript.semesters.length === 0 && (
            <EmptyState
              icon={<IconAward />}
              title="No published results yet"
              description="Once a semester's grades are approved and published, they'll appear here."
            />
          )}

          {transcript.semesters.map((sem) => (
            <div key={sem.semesterName} className="transcript-semester">
              <h2>{sem.semesterName}</h2>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Course</th>
                      <th className="num">Credits</th>
                      <th>Grade</th>
                      <th className="num">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sem.courses.map((c) => (
                      <tr key={c.courseCode}>
                        <td className="mono">{c.courseCode}</td>
                        <td>{c.courseTitle}</td>
                        <td className="num">{c.credits}</td>
                        <td>
                          <span className="chip chip-ok">{c.letterGrade}</span>
                        </td>
                        <td className="num">{c.gradePoints.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {transcript.semesters.length > 0 && (
            <div className="transcript-summary">
              <p>
                Credits attempted
                <br />
                <strong>{transcript.totalCreditsAttempted}</strong>
              </p>
              <p>
                Credits earned
                <br />
                <strong>{transcript.totalCreditsEarned}</strong>
              </p>
              <p>
                Cumulative GPA
                <br />
                <strong>{transcript.cumulativeGpa !== null ? transcript.cumulativeGpa.toFixed(2) : '—'}</strong>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
