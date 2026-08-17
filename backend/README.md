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
  work around with direct SQL.
- **Password reset & change** — `forgot-password`/`reset-password` (public, single-use
  SHA-256-hashed tokens, 1-hour expiry, identical response whether or not the email exists
  so it can't be used to enumerate accounts) and an authenticated `change-password` that
  clears `mustChangePassword` — the flow the temporary-password-at-account-creation stopgap
  needed to actually be resolvable by the account holder, not just documented as needed.
- **Email abstraction** (`src/email/`) — an `EmailService` every password/account flow now
  goes through, with a console-log stub implementation. Swapping in a real provider (SES/
  Postmark/etc.) is a one-line change (`useClass` in `EmailModule`); nothing that calls it
  needs to change. Still not real delivery — flagged in the module itself.

  All of the above verified live against a running server + real database via four scripts
  totaling 38 checks: `smoke-test.sh` (registration rules), `smoke-test-grading.sh` (the full
  grading pipeline), `smoke-test-grade-change.sh` (request → approve/deny, the lecturer-
  ownership check, and the Super-Admin-cannot-approve restriction specifically),
  `smoke-test-auth.sh` (password reset/change, role assignment, no-account-enumeration).

## What is NOT implemented yet (do not assume otherwise)

- **Real email delivery.** The `EmailService` abstraction exists and everything routes
  through it, but the only implementation logs to the console — no real users can receive
  a password reset or their temporary password until a provider is wired in.
- **Prerequisite cycle detection.** Only direct self-reference/duplicate is blocked; a
  longer chain (A requires B requires A) is not detected.
- **Rate limiting.** Login and password-reset endpoints have no throttling — flagged Medium
  in docs/00 §12, not yet implemented (no `@nestjs/throttler` wired up).
- **Assignments/quizzes as LMS content** (student-facing submission UI, file uploads),
  announcements, notifications, reports, admissions workflow, transcript generation.
  `Submission`/`Resource`/`Application` exist in the schema; no service/controller layer.
- **Frontend.** See `../frontend/` — a thin login-flow slice only; none of the above has
  a UI yet.

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

All smoke-test scripts assume a freshly seeded database (they create their own
faculty/course/student data with fixed codes, so re-running without resetting the DB
will hit conflicts on the second run).

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
standing — the grading pipeline), `grading` (pure calculation functions, DB-independent
and reused by whichever module needs them), `audit` (the one shared sensitive-action log),
`email` (the one shared, swappable email abstraction), `prisma` (the one shared database
connection), `common` (guards/decorators/offering-ownership checks shared across modules).
