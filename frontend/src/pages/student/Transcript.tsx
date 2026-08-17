import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import type { Transcript as TranscriptData } from '../../types/domain';

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
      <h1>Official Transcript</h1>
      {error && <p className="error">{error}</p>}
      {!error && !transcript && <p>Loading…</p>}
      {transcript && (
        <>
          <p>
            <strong>
              {transcript.student.firstName} {transcript.student.lastName}
            </strong>{' '}
            — {transcript.student.studentNumber} ({transcript.student.status})
          </p>
          {transcript.programs.map((p) => (
            <p key={p.programName} className="transcript-program">
              {p.programName} — {p.curriculumVersion} ({p.enrollmentStatus})
            </p>
          ))}

          {transcript.semesters.length === 0 && <p>No published results yet.</p>}

          {transcript.semesters.map((sem) => (
            <div key={sem.semesterName} className="transcript-semester">
              <h2>{sem.semesterName}</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course</th>
                    <th>Credits</th>
                    <th>Grade</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {sem.courses.map((c) => (
                    <tr key={c.courseCode}>
                      <td>{c.courseCode}</td>
                      <td>{c.courseTitle}</td>
                      <td>{c.credits}</td>
                      <td>{c.letterGrade}</td>
                      <td>{c.gradePoints.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="transcript-summary">
            <p>Credits attempted: {transcript.totalCreditsAttempted}</p>
            <p>Credits earned: {transcript.totalCreditsEarned}</p>
            <p>
              <strong>Cumulative GPA: {transcript.cumulativeGpa !== null ? transcript.cumulativeGpa.toFixed(2) : '—'}</strong>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
