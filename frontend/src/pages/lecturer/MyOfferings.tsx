import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { CourseOffering } from '../../types/domain';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, Loading } from '../../components/StateViews';
import { IconUsers } from '../../components/icons';

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
      <PageHeader
        title="My Offerings"
        subtitle="The courses you're teaching this term — open one to manage its gradebook."
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'My Offerings' }]}
      />
      {error && <p className="error" role="alert">{error}</p>}
      {!offerings ? (
        <Loading label="Loading your offerings…" />
      ) : offerings.length === 0 ? (
        <EmptyState
          icon={<IconUsers />}
          title="No offerings assigned"
          description="You aren't assigned to any course offerings this term. Your department admin assigns these."
        />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Course</th>
                <th>Semester</th>
                <th className="num">Capacity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {offerings.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.course.code}</td>
                  <td>{o.course.title}</td>
                  <td>
                    {o.semester?.academicYear?.name} {o.semester?.term}
                  </td>
                  <td className="num">{o.capacity}</td>
                  <td className="action-cell">
                    <Link to={`/my-offerings/${o.id}`} className="btn btn-secondary btn-sm">
                      Open gradebook
                    </Link>
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
