import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { CourseOffering } from '../../types/domain';

export function MyOfferings() {
  const [offerings, setOfferings] = useState<CourseOffering[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CourseOffering[]>('/course-offerings/mine')
      .then(setOfferings)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load offerings'));
  }, []);

  return (
    <div>
      <h1>My Offerings</h1>
      {error && <p className="error">{error}</p>}
      {!offerings ? (
        <p>Loading…</p>
      ) : offerings.length === 0 ? (
        <p>You are not assigned to any course offerings yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Course</th>
              <th>Semester</th>
              <th>Capacity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {offerings.map((o) => (
              <tr key={o.id}>
                <td>{o.course.code}</td>
                <td>{o.course.title}</td>
                <td>
                  {o.semester?.academicYear?.name} {o.semester?.term}
                </td>
                <td>{o.capacity}</td>
                <td>
                  <Link to={`/my-offerings/${o.id}`}>Gradebook</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
