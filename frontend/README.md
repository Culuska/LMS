# Frontend — University Management System + LMS

React + TypeScript + Vite. Real screens wired to the backend for the three main roles
(student, lecturer, admin/registrar), not just a login-flow proof of concept anymore.

## What's here

- `src/api/client.ts` — fetch wrapper: attaches the bearer token, parses errors into a
  typed `ApiError`. `get`/`post`/`patch`/`put`/`delete` helpers; tolerates endpoints that
  return no body (not every 200 comes with JSON — see the comment in the file).
- `src/auth/` — `AuthContext`/`AuthProvider` (token + user state, persisted in
  `localStorage`, re-validated against `/auth/me` on load), `useAuth` hook,
  `ProtectedRoute`, `types.ts` (mirrors the backend's `AuthenticatedUser`, including the
  `studentId`/`lecturerId` the backend now returns so pages don't need a separate lookup).
- `src/types/domain.ts` — hand-maintained interfaces mirroring backend response shapes
  (still not generated from an OpenAPI spec — see the note in the file).
- `src/layout/AppLayout.tsx` — the shared shell every authenticated page renders inside:
  role-aware nav (only shows links a role can actually use), a notification-count badge,
  sign-out.
- `src/pages/Login.tsx` — working login form.
- `src/pages/Dashboard.tsx` — role-aware hub: link cards for whatever the signed-in
  user's roles unlock, mirroring `AppLayout`'s nav.
- `src/pages/Notifications.tsx` — list-mine + mark-read, shared by every role.
- `src/pages/student/MyCourses.tsx` — the student's own registrations, status, and grade
  once published.
- `src/pages/student/Transcript.tsx` — the student's own official transcript (keyed off
  `user.studentId`): programs, semesters, credits attempted/earned, cumulative GPA.
- `src/pages/lecturer/MyOfferings.tsx` — the offerings a lecturer is assigned to teach.
- `src/pages/lecturer/OfferingGradebook.tsx` — the heaviest page: create assessment
  items, enter marks per student per item, and drive each student's result through
  compute → submit → approve → publish. Approve/publish buttons are only shown to roles
  the backend would actually allow (the backend remains the real enforcement — this is
  just not showing a button that would 403).
- `src/pages/admin/AcademicStructure.tsx` — tabbed admin console: faculties, departments,
  programs, academic years, semesters, courses, course offerings. Deliberately list+create
  only — no edit/delete yet (see gaps below).
- `src/pages/admin/Applications.tsx` — the admissions review queue: filter by status,
  move an application through the reviewable statuses, accept an `OFFERED` applicant
  (converts them to a Student account).
- `src/pages/admin/UsersAndRoles.tsx` — `SUPER_ADMIN`-only: create Lecturer/Student
  accounts, grant/revoke role assignments. The most locked-down screen in the app,
  matching how locked-down the backend keeps this endpoint.

Verified with a real browser (Playwright) driving the actual flow against a running
backend + freshly seeded database: login as super admin/lecturer/student, navigate every
page above, create academic-structure records through the admin console, and run the
**full grading pipeline through the UI** — enter marks as the lecturer, compute, submit,
then approve and publish as an admin, then confirm the student's transcript reflects the
published grade. 21 UI-level checks + a 9-check pipeline walkthrough, all passing.

## Local development

```bash
cp .env.example .env.local   # point VITE_API_BASE_URL at your backend
npm install
npm run dev
```

Requires the backend (`../backend`) running and seeded (see its README) — there's
nothing to log in with otherwise.

## Not implemented yet

- **No forced password-change screen.** The backend returns `mustChangePassword: true`
  and `POST /auth/change-password` exists, but nothing in the frontend acts on that flag
  yet — a user with a temporary password can use the app indefinitely without being
  prompted to change it. Real gap, not a hidden assumption.
- **Edit/delete for structural records.** Academic Structure is list+create only;
  changing an already-referenced faculty/course/offering safely needs its own
  cascade-review design, not a quick add-on.
- **Curriculum version management UI.** The backend has full curriculum-version +
  curriculum-course endpoints; there's no admin screen for them yet (the fixture/smoke
  scripts drive it via curl instead).
- **File uploads, assignment/quiz submission UI, transcript PDF export, admin reports** —
  none of these exist on the backend yet either (see `../backend/README.md`), so there's
  nothing for the frontend to call.
- **Error boundaries** beyond the per-page try/catch pattern, accessibility audit,
  responsive design polish beyond basic flex/grid layouts, and a generated (rather than
  hand-maintained) API type layer once the backend's contract stabilizes.
