import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { RoleName } from '../../auth/types';
import type { Department, UserDetail } from '../../types/domain';
import { PageHeader } from '../../components/PageHeader';
import { Loading } from '../../components/StateViews';
import { IconClose } from '../../components/icons';

const ALL_ROLES: RoleName[] = [
  'SUPER_ADMIN',
  'IT_ADMIN',
  'REGISTRAR',
  'DEAN',
  'HEAD_OF_DEPARTMENT',
  'FACULTY_ADMIN',
  'DEPARTMENT_ADMIN',
  'EXAM_OFFICER',
  'ADMISSIONS_OFFICER',
  'ADVISOR',
  'LECTURER',
  'STUDENT',
  'AUDITOR',
];

/** SUPER_ADMIN-only screen: create Lecturer/Student accounts and grant/revoke roles.
 * Role assignment is deliberately the most locked-down mutation in the system — see
 * backend UsersController's comment on "dangerous permission conflict #3". */
export function UsersAndRoles() {
  const [users, setUsers] = useState<UserDetail[] | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<Record<string, { role: RoleName; facultyId: string; departmentId: string }>>({});
  const [lecturerForm, setLecturerForm] = useState({ email: '', firstName: '', lastName: '', departmentId: '', staffNumber: '' });
  const [studentForm, setStudentForm] = useState({ email: '', firstName: '', lastName: '', studentNumber: '', dateOfBirth: '' });
  const [notice, setNotice] = useState<string | null>(null);

  const load = () => {
    api.get<UserDetail[]>('/users').then(setUsers).catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load users'));
    api.get<Department[]>('/departments').then(setDepartments).catch(() => undefined);
  };
  useEffect(load, []);

  const formFor = (userId: string) => roleForm[userId] ?? { role: 'LECTURER' as RoleName, facultyId: '', departmentId: '' };

  const grantRole = async (userId: string) => {
    const f = formFor(userId);
    setError(null);
    try {
      await api.post(`/users/${userId}/roles`, {
        role: f.role,
        facultyId: f.facultyId || undefined,
        departmentId: f.departmentId || undefined,
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to grant role');
    }
  };

  const createLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await api.post<{ temporaryPassword: string }>('/users/lecturers', lecturerForm);
      setNotice(`Lecturer account created for ${lecturerForm.firstName} ${lecturerForm.lastName}. Temporary password: ${res.temporaryPassword}`);
      setLecturerForm({ email: '', firstName: '', lastName: '', departmentId: '', staffNumber: '' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create lecturer');
    }
  };

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await api.post<{ temporaryPassword: string }>('/users/students', studentForm);
      setNotice(`Student account created for ${studentForm.firstName} ${studentForm.lastName}. Temporary password: ${res.temporaryPassword}`);
      setStudentForm({ email: '', firstName: '', lastName: '', studentNumber: '', dateOfBirth: '' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create student');
    }
  };

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Create staff and student accounts, and grant or revoke role assignments."
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Users & Roles' }]}
      />
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="card">
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Create lecturer</h2>
          <form onSubmit={createLecturer} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <label>
              Email
              <input
                type="email"
                value={lecturerForm.email}
                onChange={(e) => setLecturerForm({ ...lecturerForm, email: e.target.value })}
                required
              />
            </label>
            <label>
              First name
              <input
                value={lecturerForm.firstName}
                onChange={(e) => setLecturerForm({ ...lecturerForm, firstName: e.target.value })}
                required
              />
            </label>
            <label>
              Last name
              <input
                value={lecturerForm.lastName}
                onChange={(e) => setLecturerForm({ ...lecturerForm, lastName: e.target.value })}
                required
              />
            </label>
            <label>
              Department
              <select
                value={lecturerForm.departmentId}
                onChange={(e) => setLecturerForm({ ...lecturerForm, departmentId: e.target.value })}
                required
              >
                <option value="" disabled>
                  Select a department…
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Staff number
              <input
                value={lecturerForm.staffNumber}
                onChange={(e) => setLecturerForm({ ...lecturerForm, staffNumber: e.target.value })}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Create lecturer
            </button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Create student</h2>
          <form onSubmit={createStudent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <label>
              Email
              <input
                type="email"
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                required
              />
            </label>
            <label>
              First name
              <input
                value={studentForm.firstName}
                onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                required
              />
            </label>
            <label>
              Last name
              <input
                value={studentForm.lastName}
                onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                required
              />
            </label>
            <label>
              Student number
              <input
                value={studentForm.studentNumber}
                onChange={(e) => setStudentForm({ ...studentForm, studentNumber: e.target.value })}
                required
              />
            </label>
            <label>
              Date of birth
              <input
                type="date"
                value={studentForm.dateOfBirth}
                onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Create student
            </button>
          </form>
        </div>
      </div>

      <h2 style={{ marginBottom: 'var(--space-3)' }}>All users</h2>
      {!users ? (
        <Loading label="Loading users…" />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Grant a role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const f = formFor(u.id);
                return (
                  <tr key={u.id}>
                    <td>
                      {u.firstName} {u.lastName}
                      {!u.isActive && (
                        <span className="chip chip-neutral" style={{ marginLeft: '0.4rem' }}>
                          inactive
                        </span>
                      )}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      {u.roles.length === 0
                        ? <span style={{ color: 'var(--color-ink-faint)' }}>No roles</span>
                        : u.roles.map((r) => (
                            <span key={r.id} className="role-chip">
                              {r.role.replace(/_/g, ' ')}
                              <RevokeButton userId={u.id} roleId={r.id} roleLabel={r.role.replace(/_/g, ' ')} userName={`${u.firstName} ${u.lastName}`} onDone={load} />
                            </span>
                          ))}
                    </td>
                    <td className="action-cell">
                      <label className="sr-only" htmlFor={`role-select-${u.id}`}>
                        Role to grant to {u.firstName} {u.lastName}
                      </label>
                      <select
                        id={`role-select-${u.id}`}
                        value={f.role}
                        onChange={(e) => setRoleForm({ ...roleForm, [u.id]: { ...f, role: e.target.value as RoleName } })}
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-secondary btn-sm" onClick={() => void grantRole(u.id)}>
                        Grant
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RevokeButton({
  userId,
  roleId,
  roleLabel,
  userName,
  onDone,
}: {
  userId: string;
  roleId: string;
  roleLabel: string;
  userName: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const revoke = async () => {
    setBusy(true);
    try {
      await api.delete(`/users/${userId}/roles/${roleId}`);
      onDone();
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      className="role-revoke"
      disabled={busy}
      onClick={() => void revoke()}
      aria-label={`Remove ${roleLabel} role from ${userName}`}
    >
      <IconClose style={{ width: '0.7rem', height: '0.7rem' }} />
    </button>
  );
}
