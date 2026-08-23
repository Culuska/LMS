import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { CourseOffering } from '../../types/domain';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, Loading } from '../../components/StateViews';
import { IconUsers } from '../../components/icons';

const EMPTY_FORM = { code: '', title: '', description: '', credits: '3', capacity: '40' };

export function MyOfferings() {
  const [offerings, setOfferings] = useState<CourseOffering[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', credits: '', capacity: '' });
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<CourseOffering[]>('/course-offerings/mine')
      .then(setOfferings)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load offerings'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreating(true);
    try {
      await api.post('/course-offerings/simple', {
        code: form.code,
        title: form.title,
        description: form.description || undefined,
        credits: Number(form.credits),
        capacity: Number(form.capacity),
      });
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (o: CourseOffering) => {
    setEditingId(o.id);
    setEditForm({ title: o.course.title, credits: String(o.course.credits), capacity: String(o.capacity) });
  };

  const saveEdit = async (offeringId: string) => {
    setBusyId(offeringId);
    setFormError(null);
    try {
      await api.patch(`/course-offerings/${offeringId}`, {
        title: editForm.title,
        credits: Number(editForm.credits),
        capacity: Number(editForm.capacity),
      });
      setEditingId(null);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save changes');
    } finally {
      setBusyId(null);
    }
  };

  const removeCourse = async (offeringId: string) => {
    if (!confirm('Delete this course? This only works if nothing has been attached to it yet.')) return;
    setBusyId(offeringId);
    setFormError(null);
    try {
      await api.delete(`/course-offerings/${offeringId}`);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to delete course');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="My Offerings"
        subtitle="The courses you're teaching this term. Create a new one, or open one to manage its content, assignments, and grades."
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'My Offerings' }]}
      />
      {error && <p className="error" role="alert">{error}</p>}
      {formError && <p className="error" role="alert">{formError}</p>}

      <h2 style={{ marginBottom: 'var(--space-3)' }}>Create a course</h2>
      <form className="inline-form" onSubmit={createCourse} aria-label="Create a course">
        <label>
          Code
          <input
            placeholder="e.g. CS301"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
        </label>
        <label>
          Title
          <input
            placeholder="e.g. Data Structures"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </label>
        <label>
          Description
          <input
            placeholder="Optional"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label>
          Credits
          <input
            type="number"
            min={1}
            value={form.credits}
            onChange={(e) => setForm({ ...form, credits: e.target.value })}
            required
          />
        </label>
        <label>
          Capacity
          <input
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? 'Creating…' : 'Create course'}
        </button>
      </form>

      <h2 style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>Your courses</h2>
      {!offerings ? (
        <Loading label="Loading your offerings…" />
      ) : offerings.length === 0 ? (
        <EmptyState
          icon={<IconUsers />}
          title="No courses yet"
          description="Create your first course above — it's ready to use immediately."
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
              {offerings.map((o) =>
                editingId === o.id ? (
                  <tr key={o.id}>
                    <td className="mono">{o.course.code}</td>
                    <td colSpan={2}>
                      <input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        aria-label="Course title"
                        style={{ marginRight: 'var(--space-2)' }}
                      />
                      <input
                        type="number"
                        min={1}
                        value={editForm.credits}
                        onChange={(e) => setEditForm({ ...editForm, credits: e.target.value })}
                        aria-label="Credits"
                        style={{ width: '5rem' }}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        min={1}
                        value={editForm.capacity}
                        onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                        aria-label="Capacity"
                        style={{ width: '5rem' }}
                      />
                    </td>
                    <td className="action-cell">
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={busyId === o.id}
                        onClick={() => void saveEdit(o.id)}
                      >
                        Save
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={o.id}>
                    <td className="mono">{o.course.code}</td>
                    <td>{o.course.title}</td>
                    <td>
                      {o.semester?.academicYear?.name} {o.semester?.term}
                    </td>
                    <td className="num">{o.capacity}</td>
                    <td className="action-cell">
                      <Link to={`/my-offerings/${o.id}/content`} className="btn btn-secondary btn-sm">
                        Content
                      </Link>
                      <Link to={`/my-offerings/${o.id}/attendance`} className="btn btn-secondary btn-sm">
                        Attendance
                      </Link>
                      <Link to={`/my-offerings/${o.id}`} className="btn btn-secondary btn-sm">
                        Gradebook
                      </Link>
                      <button className="btn btn-secondary btn-sm" onClick={() => startEdit(o)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={busyId === o.id}
                        onClick={() => void removeCourse(o.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
