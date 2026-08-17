# Backend — University Management System + LMS

NestJS (TypeScript) + Prisma + PostgreSQL. Implements the architecture in
[`../docs/02-architecture-proposal.md`](../docs/02-architecture-proposal.md) and the
database model in [`../docs/00-requirements-audit.md`](../docs/00-requirements-audit.md) §7.

## What's actually implemented right now

Verified working end-to-end (real database, real HTTP calls, automated tests passing —
not just "compiles"):

- **Database schema** (`prisma/schema.prisma`) — the full V1 conceptual model: identity/RBAC,
  faculty/department/program structure, academic calendar, curriculum & prerequisites,
  course offerings, enrollment & registration, attendance, assessment/grading, admissions,
  and the Somalia-DPA-driven compliance entities (`RetentionClass`, `ConsentRecord`).
- **Auth**: login, JWT issuance, password hashing (bcrypt), role-based route guards.
  Roles are re-checked from the database on every request, not just baked into the token.
- **Grading engine** (`src/grading/`): pure, unit-tested functions implementing
  [`../docs/04-grading-and-academic-policy.md`](../docs/04-grading-and-academic-policy.md) —
  grade-band resolution, weighted-percentage computation, retake capping, credit-weighted
  GPA, attendance percentage. 40 unit tests.
- **Academic structure, calendar, courses, curriculum**: CRUD with the validation the
  audit calls for (e.g. assessment weights must fall within policy bands and sum to 100%).
- **Course registration business rules** (`src/enrollment/course-registrations.service.ts`),
  enforced server-side: registration window open, no duplicate registration for the same
  course in the same semester, course must be in the curriculum of a program the student
  is actively enrolled in, prerequisites satisfied (checked against `AcademicRecordEntry` +
  `GradeBand`), retake attempts capped at 3 total, advisor approval required and *verified*
  (must actually be the student's assigned advisor) when exceeding the credit limit or the
  student is on probation. **Self-service**: a STUDENT caller can register themself; their
  `studentId` in the request body is ignored and replaced with their own record server-side,
  so it can't be used to register a different student — verified live (see below).
- **Attendance** (`src/attendance/`) — sessions, bulk roll-call marking (only registered
  students can be marked), percentage calculation excluding excused absences from the
  denominator, all gated to the offering's own lecturer (or admin).
- **Full grading pipeline** (`src/assessment/`) — the piece the registration rules'
  prerequisite check was previously simulated for:
  1. Lecturer creates `AssessmentItem`s; weight validated against the offering's CA/Midterm/
     Final bucket allocation (can't silently exceed the configured 40/20/40 split).
  2. Lecturer enters `Mark`s (ownership-checked, capped at each item's `maxMarks`, blocked
     once the student's result has moved past DRAFT).
  3. `compute` — requires every assessment item to have a mark, checks the student's
     attendance meets the 75% exam-eligibility threshold, computes the weighted percentage,
     applies the retake cap, resolves the letter grade.
  4. `submit` → `approve` → `publish` — a real state machine, not just status labels:
     approval requires a role Set (`EXAM_OFFICER`/`REGISTRAR`/`HEAD_OF_DEPARTMENT`/`DEAN`/
     `SUPER_ADMIN`) that excludes `LECTURER` entirely, an explicit **anti-self-approval
     check** blocks the same account from both submitting and approving, and publication is
     narrowed further to `EXAM_OFFICER`/`SUPER_ADMIN` only — enforcing the audit's "a
     lecturer must never publish their own course's results" rule structurally, not just
     by convention.
  5. Publication creates the `AcademicRecordEntry`, marks the `CourseRegistration`
     `COMPLETED`, recomputes semester GPA + CGPA, and updates the student's academic
     standing (`PROBATION`/`DISMISSED`/recovery to `ACTIVE`) per docs/04 §7 — with an
     `AuditLog` entry for both the publication and any standing change.

- **Grade-change requests** (`src/assessment/grade-change-requests.service.ts`) — the only
  path allowed to alter a result once it's past DRAFT, per docs/00 §5's RBAC table:
  - **Request**: `REGISTRAR`/`DEAN`/`HEAD_OF_DEPARTMENT` (broad academic oversight, no
    ownership check) or `LECTURER` (must be the offering's own assigned lecturer — checked,
    not assumed). Blocked entirely while the result is still DRAFT (edit it directly instead).
  - **Approve/deny**: `EXAM_OFFICER` only. This is the one RBAC row in the whole system that
    deliberately excludes even `SUPER_ADMIN` — and the code has no admin-override bypass for
    it, matching the table exactly rather than defaulting to the override pattern used
    everywhere else.
  - **Approval effects**: corrects the `CourseResult`; if the result was already `PUBLISHED`,
    also finds and corrects the matching `AcademicRecordEntry` and reruns the same GPA/
    academic-standing recomputation used at publish time (`AcademicStandingService`, extracted
    so both paths share one implementation instead of two that could drift) — with `AuditLog`
    entries throughout.

- **Role assignment** (`POST/GET/DELETE /users/:userId/roles`, `SUPER_ADMIN` only) — grants
  or revokes a role on an existing account. Closes the gap every earlier smoke test had to
  work around with direct SQL. `GET /users` (`SUPER_ADMIN` only — the full directory,
  every user with their current role assignments, powering the frontend's Users & Roles
  screen) and `GET /users/lecturers` (`SUPER_ADMIN`/`REGISTRAR`/`DEPARTMENT_ADMIN` — just
  enough to populate a lecturer picker, e.g. when creating a course offering) round out
  the users API now that the frontend needs to list rather than only create/mutate.
- **Password reset & change** — `forgot-password`/`reset-password` (public, single-use
  SHA-256-hashed tokens, 1-hour expiry, identical response whether or not the email exists
  so it can't be used to enumerate accounts) and an authenticated `change-password` that
  clears `mustChangePassword` — the flow the temporary-password-at-account-creation stopgap
  needed to actually be resolvable by the account holder, not just documented as needed.
- **Email abstraction** (`src/email/`) — an `EmailService` every password/account flow now
  goes through, with a console-log stub implementation. Swapping in a real provider (SES/
  Postmark/etc.) is a one-line change (`useClass` in `EmailModule`); nothing that calls it
  needs to change. Still not real delivery — flagged in the module itself.

- **Course content** (`src/lms/course-content.service.ts`) — nested text/markdown
  materials (modules → lessons) per offering; the offering's own lecturer (or admin) can
  create/delete, deletion is blocked while nested items still exist (no orphaning/silent
  cascade). File attachments are explicitly NOT covered — see gaps below.
- **Announcements** (`src/lms/announcements.service.ts`) — course-scoped (offering's own
  lecturer or admin) or university-wide (`REGISTRAR`/`SUPER_ADMIN` only). Course-scoped
  announcements notify every currently-registered student directly; university-wide ones
  deliberately do NOT fan out to every account in the system (no subscription/targeting
  model exists for that yet) — visible via the list endpoint instead, a scope decision.
- **Notifications** (`src/notifications/`) — in-app only (no email/SMS/push — see docs/00
  §12, V2+). Dispatched on: course-scoped announcement created, result published, grade
  change approved (to the student) or denied (to the requester). List-mine and mark-read
  endpoints; ownership enforced (can't mark someone else's notification read).
- **Admissions** (`src/admissions/`) — the applicant pipeline confirmed in scope by
  docs/00 item A1: public `POST /applications` (no account needed to apply) → staff review
  (`UNDER_REVIEW`/`OFFERED`/`REJECTED`/`WITHDRAWN`) → `accept` converts an `OFFERED`
  applicant into a real User+Student account (same temporary-password stopgap as
  `UsersService`). The Somalia DPA guardian-consent gate (docs/00 §8 rule 13) is enforced
  twice: submission rejects an under-18 applicant with no guardian name/email, and every
  status transition re-checks a `ConsentRecord` exists before letting a minor's application
  progress. Deliberately does NOT auto-create an `Enrollment` on acceptance — which
  `CurriculumVersion` applies is a Registrar decision, not something admissions should guess.
- **Transcripts** (`src/academic-records/transcript.service.ts`) — `GET
  /students/:studentId/transcript`: courses grouped by semester, credits attempted vs.
  earned (only passing grades count toward earned), latest cumulative GPA. Access matches
  docs/00 §5's RBAC table row exactly — deliberately narrower than most academic-data
  endpoints: `SUPER_ADMIN`/`REGISTRAR`/`DEAN`/`HEAD_OF_DEPARTMENT`/`EXAM_OFFICER`, or the
  student themself. **No `ADVISOR`, no `LECTURER`** — both can see other student data
  elsewhere in this system, but the audit's table excludes them specifically from official
  transcripts, and that's matched here rather than generalized from the broader pattern.

  All of the above verified live against a running server + real database via seven scripts
  totaling 68 checks: `smoke-test.sh` (registration rules), `smoke-test-grading.sh` (the full
  grading pipeline), `smoke-test-grade-change.sh` (request → approve/deny, the lecturer-
  ownership check, and the Super-Admin-cannot-approve restriction specifically),
  `smoke-test-auth.sh` (password reset/change, role assignment, no-account-enumeration),
  `smoke-test-admissions.sh` (minor-without-guardian-info rejected, full application→offer→
  accept→login flow, double-accept blocked),
  `smoke-test-lms.sh` (course content nesting/deletion rules, announcement→notification
  dispatch, cross-user notification access blocked),
  `smoke-test-transcript.sh` (correct GPA/credits computation, staff access, cross-student
  access blocked).

## What is NOT implemented yet (do not assume otherwise)

- **Real email delivery.** The `EmailService` abstraction exists and everything routes
  through it, but the only implementation logs to the console — no real users can receive
  a password reset or their temporary password until a provider is wired in.
- **File uploads / object storage.** `Resource` exists in the schema (polymorphic file
  metadata) but there's no upload endpoint and no storage backend decision made
  (docs/00 §14) — course content is text/markdown only right now.
- **Prerequisite cycle detection.** Only direct self-reference/duplicate is blocked; a
  longer chain (A requires B requires A) is not detected.
- **Rate limiting.** Login and password-reset endpoints have no throttling — flagged Medium
  in docs/00 §12, not yet implemented (no `@nestjs/throttler` wired up).
- **View-scoping on read endpoints.** Most GET endpoints (course offerings, assessment
  items, marks, etc.) are open to any authenticated user rather than scoped to "registered
  students + relevant staff only," per the RBAC table's intent — a consistent simplification
  across the codebase, not unique to any one module, flagged here rather than silently
  assumed correct.
- **Assignments/quizzes as LMS content** (student-facing submission workflow — `Submission`
  exists in the schema, no service layer) and administrative reports beyond the transcript.
- **Transcript PDF rendering.** The endpoint returns structured JSON, not a printable
  document — no PDF library is wired in yet.
- **Frontend.** See `../frontend/` — real screens now cover student/lecturer/admin flows
  including the full grading pipeline, but curriculum-version management, structural
  record edit/delete, and a forced password-change prompt still have no UI (see that
  README's gap list for the current cut).

## Local development

Requires Node 22+, PostgreSQL 16, npm.

```bash
cp .env.example .env   # then edit DATABASE_URL, JWT_SECRET
npm install
npx prisma migrate dev   # creates/updates the schema
npx prisma db seed       # seeds grade bands + an initial Super Admin account
npm run start:dev
```

The seed script prints the Super Admin's temporary login. `mustChangePassword: true` is
returned in the login/`/auth/me` response for the frontend to act on; use
`POST /auth/change-password` to clear it.

### Useful scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Dev server with hot reload |
| `npm test` | Unit tests (no database needed) |
| `npm run test:e2e` | End-to-end tests (needs a running database) |
| `npm run lint` | ESLint |
| `npx prisma studio` | Browse the database visually |
| `./smoke-test.sh` | Live scenario test of the registration business rules |
| `./smoke-test-grading.sh` | Live scenario test of the full grading pipeline |
| `./smoke-test-grade-change.sh` | Live scenario test of the grade-change request workflow |
| `SERVER_LOG=<path> ./smoke-test-auth.sh` | Live scenario test of password reset/change and role assignment — needs the running server's stdout log path to read the console-stub "email" |
| `./smoke-test-lms.sh` | Live scenario test of course content, announcements, and notification dispatch |
| `./smoke-test-admissions.sh` | Live scenario test of the admissions workflow, including the guardian-consent gate |
| `./smoke-test-transcript.sh` | Live scenario test of the transcript endpoint and its access control |

All smoke-test scripts assume a freshly seeded database (they create their own
faculty/course/student data with fixed codes, so re-running without resetting the DB
will hit conflicts on the second run). Reset with:

```bash
psql -h localhost -p 5432 -U postgres -d lms_dev -c "TRUNCATE TABLE users, faculties, \
  departments, programs, courses, academic_years, semesters, curriculum_versions, \
  curriculum_courses, course_offerings, students, lecturers, enrollments, \
  course_registrations, academic_record_entries, user_roles, course_prerequisites, \
  gpa_records, attendance_sessions, attendance_records, assessment_items, marks, \
  course_results, audit_logs, grade_change_requests, password_reset_tokens, \
  course_content, announcements, notifications, applications, consent_records \
  RESTART IDENTITY CASCADE;"
npx prisma db seed
```

**Connect over TCP (`-h localhost -p 5432`), not `psql`'s default local socket.** In some
sandboxed dev environments the default unix-socket connection (e.g. `su postgres -c
psql`) is routed to an isolated Postgres instance that looks identical but isn't the one
the running server actually talks to — a truncate against it silently does nothing to
the real data. If a "freshly reset" database still 409s on a fixture the app should no
longer have, check for exactly this before assuming it's an application bug.

### Environment variables

See `.env.example`. `DATABASE_URL` and `JWT_SECRET` are required; everything else has a
sensible default.

## Project layout

Each directory under `src/` is a Nest module matching a domain boundary from
[`../docs/01-agent-responsibility-matrix.md`](../docs/01-agent-responsibility-matrix.md) —
`auth`, `users`, `academic-structure` (faculties/departments/programs),
`academic-calendar` (years/semesters), `courses` (courses/prerequisites/curriculum/offerings),
`enrollment` (enrollments/course registrations), `attendance` (sessions/records),
`assessment` (assessment items/marks/course results/grade-change requests/academic
standing — the grading pipeline), `lms` (course content/announcements), `notifications`,
`admissions` (applications), `academic-records` (transcripts), `grading` (pure calculation
functions, DB-independent and reused by whichever module needs them), `audit` (the one
shared sensitive-action log), `email` (the one shared, swappable email abstraction),
`prisma` (the one shared database connection), `common` (guards/decorators/offering-
ownership checks shared across modules).
