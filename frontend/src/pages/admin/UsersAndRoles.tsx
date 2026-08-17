import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { RoleName } from '../../auth/types';
import type { Department, UserDetail } from '../../types/domain';

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
      setNotice(`Lecturer account created. Temporary password: ${res.temporaryPassword}`);
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
      setNotice(`Student account created. Temporary password: ${res.temporaryPassword}`);
      setStudentForm({ email: '', firstName: '', lastName: '', studentNumber: '', dateOfBirth: '' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create student');
    }
  };

  return (
    <div>
      <h1>Users &amp; Roles</h1>
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      <h2>Create Lecturer</h2>
      <form className="inline-form form-grid" onSubmit={createLecturer}>
        <input
          placeholder="Email"
          type="email"
          value={lecturerForm.email}
          onChange={(e) => setLecturerForm({ ...lecturerForm, email: e.target.value })}
          required
        />
        <input
          placeholder="First name"
          value={lecturerForm.firstName}
          onChange={(e) => setLecturerForm({ ...lecturerForm, firstName: e.target.value })}
          required
        />
        <input
          placeholder="Last name"
          value={lecturerForm.lastName}
          onChange={(e) => setLecturerForm({ ...lecturerForm, lastName: e.target.value })}
          required
        />
        <select
          value={lecturerForm.departmentId}
          onChange={(e) => setLecturerForm({ ...lecturerForm, departmentId: e.target.value })}
          required
        >
          <option value="" disabled>
            Department…
          </option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Staff number"
          value={lecturerForm.staffNumber}
          onChange={(e) => setLecturerForm({ ...lecturerForm, staffNumber: e.target.value })}
          required
        />
        <button type="submit">Create lecturer</button>
      </form>

      <h2>Create Student</h2>
      <form className="inline-form form-grid" onSubmit={createStudent}>
        <input
          placeholder="Email"
          type="email"
          value={studentForm.email}
          onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
          required
        />
        <input
          placeholder="First name"
          value={studentForm.firstName}
          onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
          required
        />
        <input
          placeholder="Last name"
          value={studentForm.lastName}
          onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
          required
        />
        <input
          placeholder="Student number"
          value={studentForm.studentNumber}
          onChange={(e) => setStudentForm({ ...studentForm, studentNumber: e.target.value })}
          required
        />
        <label>
          Date of birth
          <input
            type="date"
            value={studentForm.dateOfBirth}
            onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
            required
          />
        </label>
        <button type="submit">Create student</button>
      </form>

      <h2>All Users</h2>
      {!users ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Grant role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const f = formFor(u.id);
              return (
                <tr key={u.id}>
                  <td>
                    {u.firstName} {u.lastName}
                    {!u.isActive && ' (inactive)'}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    {u.roles.length === 0
                      ? '—'
                      : u.roles.map((r) => (
                          <span key={r.id} className="role-chip">
                            {r.role}
                            <RevokeButton userId={u.id} roleId={r.id} onDone={load} />
                          </span>
                        ))}
                  </td>
                  <td className="action-cell">
                    <select
                      value={f.role}
                      onChange={(e) =>
                        setRoleForm({ ...roleForm, [u.id]: { ...f, role: e.target.value as RoleName } })
                      }
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => void grantRole(u.id)}>Grant</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function RevokeButton({ userId, roleId, onDone }: { userId: string; roleId: string; onDone: () => void }) {
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
    <button className="role-revoke" disabled={busy} onClick={() => void revoke()}>
      ×
    </button>
  );
}
