import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { CourseOffering, CourseRegistration } from '../../types/domain';
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
  const [offerings, setOfferings] = useState<CourseOffering[] | null>(null);
  const [selectedOfferingId, setSelectedOfferingId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      api.get<CourseRegistration[]>('/course-registrations/mine'),
      api.get<CourseOffering[]>('/course-offerings'),
    ])
      .then(([regs, allOfferings]) => {
        setRegistrations(regs);
        setOfferings(allOfferings);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load courses'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const registeredOfferingIds = new Set((registrations ?? []).map((r) => r.courseOffering.id));
  const availableOfferings = (offerings ?? []).filter((o) => !registeredOfferingIds.has(o.id));

  const registerForCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferingId) return;
    setRegistering(true);
    setFormError(null);
    try {
      await api.post('/course-registrations', { courseOfferingId: selectedOfferingId });
      setSelectedOfferingId('');
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to register for this course');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="My Courses"
        subtitle="Register for available courses, and see everything you're taking this term."
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'My Courses' }]}
      />
      {error && <p className="error" role="alert">{error}</p>}
      {formError && <p className="error" role="alert">{formError}</p>}

      {offerings && availableOfferings.length > 0 && (
        <>
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Register for a course</h2>
          <form className="inline-form" onSubmit={registerForCourse} aria-label="Register for a course">
            <label>
              Course
              <select value={selectedOfferingId} onChange={(e) => setSelectedOfferingId(e.target.value)} required>
                <option value="" disabled>
                  Choose a course
                </option>
                {availableOfferings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.course.code} — {o.course.title}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary" disabled={registering || !selectedOfferingId}>
              {registering ? 'Registering…' : 'Register'}
            </button>
          </form>
        </>
      )}

      <h2 style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>Your courses</h2>
      {!registrations ? (
        <Loading label="Loading your courses…" />
      ) : registrations.length === 0 ? (
        <EmptyState
          icon={<IconBook />}
          title="No courses yet"
          description="You aren't registered for any courses this term. Register for one above to get started."
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
                <th></th>
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
                  <td className="action-cell">
                    <Link to={`/my-courses/${r.courseOffering.id}`} className="btn btn-secondary btn-sm">
                      Open
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
