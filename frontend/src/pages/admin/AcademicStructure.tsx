import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type {
  AcademicYear,
  Course,
  CourseOffering,
  Department,
  Faculty,
  Program,
  ProgramLevel,
  SemesterFull,
  SemesterTerm,
} from '../../types/domain';

interface LecturerOption {
  id: string;
  staffNumber: string;
  user: { firstName: string; lastName: string; email: string };
}

type Tab = 'faculties' | 'departments' | 'programs' | 'academic-years' | 'semesters' | 'courses' | 'offerings';

const TABS: { key: Tab; label: string }[] = [
  { key: 'faculties', label: 'Faculties' },
  { key: 'departments', label: 'Departments' },
  { key: 'programs', label: 'Programs' },
  { key: 'academic-years', label: 'Academic Years' },
  { key: 'semesters', label: 'Semesters' },
  { key: 'courses', label: 'Courses' },
  { key: 'offerings', label: 'Course Offerings' },
];

const PROGRAM_LEVELS: ProgramLevel[] = ['UNDERGRADUATE', 'POSTGRADUATE'];
const SEMESTER_TERMS: SemesterTerm[] = ['FIRST', 'SECOND', 'SUMMER'];

/** Admin console for the academic structure hierarchy: faculty -> department -> program,
 * plus academic calendar (years/semesters), the course catalog, and course offerings
 * (the join of course + semester + lecturer that students actually register into).
 * Each tab is deliberately list+create only — edit/delete of structural records is not
 * built yet (flagged in backend/README.md as a follow-up; changing an already-referenced
 * faculty/course safely needs its own cascade-review design, not a quick add-on here). */
export function AcademicStructure() {
  const [tab, setTab] = useState<Tab>('faculties');

  return (
    <div>
      <h1>Academic Structure</h1>
      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'tab-active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'faculties' && <FacultiesTab />}
      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'programs' && <ProgramsTab />}
      {tab === 'academic-years' && <AcademicYearsTab />}
      {tab === 'semesters' && <SemestersTab />}
      {tab === 'courses' && <CoursesTab />}
      {tab === 'offerings' && <OfferingsTab />}
    </div>
  );
}

function useErrorBanner() {
  const [error, setError] = useState<string | null>(null);
  const capture = useCallback(
    (err: unknown, fallback: string) => setError(err instanceof ApiError ? err.message : fallback),
    [],
  );
  return { error, setError, capture };
}

function FacultiesTab() {
  const [items, setItems] = useState<Faculty[] | null>(null);
  const [form, setForm] = useState({ code: '', name: '' });
  const { error, capture } = useErrorBanner();

  const load = () => {
    api.get<Faculty[]>('/faculties').then(setItems).catch((e) => capture(e, 'Failed to load faculties'));
  };
  useEffect(load, [capture]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/faculties', form);
      setForm({ code: '', name: '' });
      load();
    } catch (err) {
      capture(err, 'Failed to create faculty');
    }
  };

  return (
    <section>
      {error && <p className="error">{error}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((f) => (
            <tr key={f.id}>
              <td>{f.code}</td>
              <td>{f.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <button type="submit">Add faculty</button>
      </form>
    </section>
  );
}

function DepartmentsTab() {
  const [items, setItems] = useState<Department[] | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [form, setForm] = useState({ code: '', name: '', facultyId: '' });
  const { error, capture } = useErrorBanner();

  const load = () => {
    api.get<Department[]>('/departments').then(setItems).catch((e) => capture(e, 'Failed to load departments'));
    api.get<Faculty[]>('/faculties').then(setFaculties).catch(() => undefined);
  };
  useEffect(load, [capture]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/departments', form);
      setForm({ code: '', name: '', facultyId: '' });
      load();
    } catch (err) {
      capture(err, 'Failed to create department');
    }
  };

  const facultyName = (id: string) => faculties.find((f) => f.id === id)?.name ?? id;

  return (
    <section>
      {error && <p className="error">{error}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Faculty</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((d) => (
            <tr key={d.id}>
              <td>{d.code}</td>
              <td>{d.name}</td>
              <td>{facultyName(d.facultyId)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="inline-form" onSubmit={submit}>
        <select value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })} required>
          <option value="" disabled>
            Faculty…
          </option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <button type="submit">Add department</button>
      </form>
    </section>
  );
}

function ProgramsTab() {
  const [items, setItems] = useState<Program[] | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState({ code: '', name: '', departmentId: '', level: 'UNDERGRADUATE' as ProgramLevel });
  const { error, capture } = useErrorBanner();

  const load = () => {
    api.get<Program[]>('/programs').then(setItems).catch((e) => capture(e, 'Failed to load programs'));
    api.get<Department[]>('/departments').then(setDepartments).catch(() => undefined);
  };
  useEffect(load, [capture]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/programs', form);
      setForm({ code: '', name: '', departmentId: '', level: 'UNDERGRADUATE' });
      load();
    } catch (err) {
      capture(err, 'Failed to create program');
    }
  };

  const departmentName = (id: string) => departments.find((d) => d.id === id)?.name ?? id;

  return (
    <section>
      {error && <p className="error">{error}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Level</th>
            <th>Department</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((p) => (
            <tr key={p.id}>
              <td>{p.code}</td>
              <td>{p.name}</td>
              <td>{p.level}</td>
              <td>{departmentName(p.departmentId)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="inline-form" onSubmit={submit}>
        <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required>
          <option value="" disabled>
            Department…
          </option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as ProgramLevel })}>
          {PROGRAM_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <button type="submit">Add program</button>
      </form>
    </section>
  );
}

function AcademicYearsTab() {
  const [items, setItems] = useState<AcademicYear[] | null>(null);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const { error, capture } = useErrorBanner();

  const load = () => {
    api.get<AcademicYear[]>('/academic-years').then(setItems).catch((e) => capture(e, 'Failed to load academic years'));
  };
  useEffect(load, [capture]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/academic-years', form);
      setForm({ name: '', startDate: '', endDate: '' });
      load();
    } catch (err) {
      capture(err, 'Failed to create academic year');
    }
  };

  return (
    <section>
      {error && <p className="error">{error}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Start</th>
            <th>End</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((y) => (
            <tr key={y.id}>
              <td>{y.name}</td>
              <td>{y.startDate.slice(0, 10)}</td>
              <td>{y.endDate.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="inline-form" onSubmit={submit}>
        <input
          placeholder="e.g. 2026/2027"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
        <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
        <button type="submit">Add academic year</button>
      </form>
    </section>
  );
}

function SemestersTab() {
  const [items, setItems] = useState<SemesterFull[] | null>(null);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [form, setForm] = useState({
    academicYearId: '',
    term: 'FIRST' as SemesterTerm,
    startDate: '',
    endDate: '',
    registrationOpensAt: '',
    registrationClosesAt: '',
    withdrawalDeadline: '',
  });
  const { error, capture } = useErrorBanner();

  const load = () => {
    api.get<SemesterFull[]>('/semesters').then(setItems).catch((e) => capture(e, 'Failed to load semesters'));
    api.get<AcademicYear[]>('/academic-years').then(setYears).catch(() => undefined);
  };
  useEffect(load, [capture]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/semesters', form);
      setForm({ ...form, startDate: '', endDate: '', registrationOpensAt: '', registrationClosesAt: '', withdrawalDeadline: '' });
      load();
    } catch (err) {
      capture(err, 'Failed to create semester');
    }
  };

  const yearName = (id: string) => years.find((y) => y.id === id)?.name ?? id;

  return (
    <section>
      {error && <p className="error">{error}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Year</th>
            <th>Term</th>
            <th>Start</th>
            <th>End</th>
            <th>Registration window</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((s) => (
            <tr key={s.id}>
              <td>{yearName(s.academicYearId)}</td>
              <td>{s.term}</td>
              <td>{s.startDate.slice(0, 10)}</td>
              <td>{s.endDate.slice(0, 10)}</td>
              <td>
                {s.registrationOpensAt.slice(0, 10)} – {s.registrationClosesAt.slice(0, 10)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="inline-form form-grid" onSubmit={submit}>
        <select value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value })} required>
          <option value="" disabled>
            Academic year…
          </option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
        <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value as SemesterTerm })}>
          {SEMESTER_TERMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label>
          Start
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
        </label>
        <label>
          End
          <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
        </label>
        <label>
          Registration opens
          <input
            type="date"
            value={form.registrationOpensAt}
            onChange={(e) => setForm({ ...form, registrationOpensAt: e.target.value })}
            required
          />
        </label>
        <label>
          Registration closes
          <input
            type="date"
            value={form.registrationClosesAt}
            onChange={(e) => setForm({ ...form, registrationClosesAt: e.target.value })}
            required
          />
        </label>
        <label>
          Withdrawal deadline
          <input
            type="date"
            value={form.withdrawalDeadline}
            onChange={(e) => setForm({ ...form, withdrawalDeadline: e.target.value })}
            required
          />
        </label>
        <button type="submit">Add semester</button>
      </form>
    </section>
  );
}

function CoursesTab() {
  const [items, setItems] = useState<Course[] | null>(null);
  const [form, setForm] = useState({ code: '', title: '', credits: '' });
  const { error, capture } = useErrorBanner();

  const load = () => {
    api.get<Course[]>('/courses').then(setItems).catch((e) => capture(e, 'Failed to load courses'));
  };
  useEffect(load, [capture]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/courses', { code: form.code, title: form.title, credits: Number(form.credits) });
      setForm({ code: '', title: '', credits: '' });
      load();
    } catch (err) {
      capture(err, 'Failed to create course');
    }
  };

  return (
    <section>
      {error && <p className="error">{error}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Title</th>
            <th>Credits</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((c) => (
            <tr key={c.id}>
              <td>{c.code}</td>
              <td>{c.title}</td>
              <td>{c.credits}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input
          placeholder="Credits"
          type="number"
          min={1}
          value={form.credits}
          onChange={(e) => setForm({ ...form, credits: e.target.value })}
          required
        />
        <button type="submit">Add course</button>
      </form>
    </section>
  );
}

function OfferingsTab() {
  const [items, setItems] = useState<CourseOffering[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<SemesterFull[]>([]);
  const [lecturers, setLecturers] = useState<LecturerOption[]>([]);
  const [form, setForm] = useState({ courseId: '', semesterId: '', lecturerId: '', capacity: '40' });
  const { error, capture } = useErrorBanner();

  const load = () => {
    api.get<CourseOffering[]>('/course-offerings').then(setItems).catch((e) => capture(e, 'Failed to load offerings'));
    api.get<Course[]>('/courses').then(setCourses).catch(() => undefined);
    api.get<SemesterFull[]>('/semesters').then(setSemesters).catch(() => undefined);
    api.get<LecturerOption[]>('/users/lecturers').then(setLecturers).catch(() => undefined);
  };
  useEffect(load, [capture]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/course-offerings', { ...form, capacity: Number(form.capacity) });
      setForm({ courseId: '', semesterId: '', lecturerId: '', capacity: '40' });
      load();
    } catch (err) {
      capture(err, 'Failed to create course offering');
    }
  };

  return (
    <section>
      {error && <p className="error">{error}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Course</th>
            <th>Semester</th>
            <th>Lecturer</th>
            <th>Capacity</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((o) => (
            <tr key={o.id}>
              <td>{o.course.code}</td>
              <td>{o.course.title}</td>
              <td>
                {o.semester?.academicYear?.name} {o.semester?.term}
              </td>
              <td>
                {o.lecturer ? `${o.lecturer.user.firstName} ${o.lecturer.user.lastName}` : '—'}
              </td>
              <td>{o.capacity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="inline-form" onSubmit={submit}>
        <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required>
          <option value="" disabled>
            Course…
          </option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.title}
            </option>
          ))}
        </select>
        <select value={form.semesterId} onChange={(e) => setForm({ ...form, semesterId: e.target.value })} required>
          <option value="" disabled>
            Semester…
          </option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.academicYear?.name} {s.term}
            </option>
          ))}
        </select>
        <select value={form.lecturerId} onChange={(e) => setForm({ ...form, lecturerId: e.target.value })} required>
          <option value="" disabled>
            Lecturer…
          </option>
          {lecturers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.user.firstName} {l.user.lastName} ({l.staffNumber})
            </option>
          ))}
        </select>
        <input
          placeholder="Capacity"
          type="number"
          min={1}
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          required
        />
        <button type="submit">Add offering</button>
      </form>
    </section>
  );
}
