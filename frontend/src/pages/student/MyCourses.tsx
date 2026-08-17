import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { CourseRegistration } from '../../types/domain';

export function MyCourses() {
  const [registrations, setRegistrations] = useState<CourseRegistration[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CourseRegistration[]>('/course-registrations/mine')
      .then(setRegistrations)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load courses'));
  }, []);

  return (
    <div>
      <h1>My Courses</h1>
      {error && <p className="error">{error}</p>}
      {!registrations ? (
        <p>Loading…</p>
      ) : registrations.length === 0 ? (
        <p>You are not registered for any courses yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Course</th>
              <th>Credits</th>
              <th>Semester</th>
              <th>Status</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((r) => (
              <tr key={r.id}>
                <td>{r.courseOffering.course.code}</td>
                <td>{r.courseOffering.course.title}</td>
                <td>{r.courseOffering.course.credits}</td>
                <td>
                  {r.courseOffering.semester?.academicYear?.name} {r.courseOffering.semester?.term}
                </td>
                <td>
                  {r.status}
                  {r.isRetake ? ' (retake)' : ''}
                </td>
                <td>
                  {r.courseResult?.status === 'PUBLISHED'
                    ? r.courseResult.letterGrade
                    : r.courseResult
                      ? `pending (${r.courseResult.status.toLowerCase()})`
                      : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
