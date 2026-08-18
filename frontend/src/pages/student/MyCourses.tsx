import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { CourseRegistration } from '../../types/domain';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, Loading } from '../../components/StateViews';
import { IconBook } from '../../components/icons';

const STATUS_CHIP: Record<CourseRegistration['status'], string> = {
  REGISTERED: 'chip-neutral',
  COMPLETED: 'chip-ok',
  WITHDRAWN: 'chip-warn',
  WITHDRAWN_FAIL: 'chip-danger',
};

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
      <PageHeader
        title="My Courses"
        subtitle="Everything you're registered for this term, and the grade once it's published."
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'My Courses' }]}
      />
      {error && <p className="error" role="alert">{error}</p>}
      {!registrations ? (
        <Loading label="Loading your courses…" />
      ) : registrations.length === 0 ? (
        <EmptyState
          icon={<IconBook />}
          title="No courses yet"
          description="You aren't registered for any courses this term. Once you register, they'll show up here."
        />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Course</th>
                <th className="num">Credits</th>
                <th>Semester</th>
                <th>Status</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.courseOffering.course.code}</td>
                  <td>{r.courseOffering.course.title}</td>
                  <td className="num">{r.courseOffering.course.credits}</td>
                  <td>
                    {r.courseOffering.semester?.academicYear?.name} {r.courseOffering.semester?.term}
                  </td>
                  <td>
                    <span className={`chip ${STATUS_CHIP[r.status]}`}>
                      {r.status.replace('_', ' ').toLowerCase()}
                      {r.isRetake ? ' · retake' : ''}
                    </span>
                  </td>
                  <td>
                    {r.courseResult?.status === 'PUBLISHED' ? (
                      <span className="chip chip-ok">{r.courseResult.letterGrade}</span>
                    ) : r.courseResult ? (
                      <span className="chip chip-warn">{r.courseResult.status.toLowerCase()}</span>
                    ) : (
                      <span className="chip chip-neutral">not graded</span>
                    )}
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
