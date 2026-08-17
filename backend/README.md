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
- **Course registration business rules** — the flagship data-integrity piece
  (`src/enrollment/course-registrations.service.ts`), enforced server-side:
  - registration window must be open
  - no duplicate registration for the same course in the same semester
  - the course must be part of the curriculum of a program the student is actively
    enrolled in
  - prerequisites must be satisfied (checked against `AcademicRecordEntry` + `GradeBand`)
  - retake attempts capped at 3 total (docs/04 §4)
  - advisor approval required and verified when exceeding the credit limit or the
    student is on probation (docs/04 §9)

  All five of the above are exercised by `smoke-test.sh` against a live server + database,
  not just asserted in isolation.

## What is NOT implemented yet (do not assume otherwise)

- **The grading pipeline from Mark → CourseResult → approval → publication → `AcademicRecordEntry`.**
  The schema and business rules that *consume* `AcademicRecordEntry` (prerequisite checks)
  are built and tested; the pipeline that *produces* it (a lecturer entering marks, an Exam
  Officer approving and publishing) is not built yet. `smoke-test.sh` inserts a record
  directly via SQL to simulate this for testing.
- **Student self-service registration.** Registration is currently entered by
  Registrar/Advisor/Super Admin on a student's behalf. A student-facing endpoint scoped to
  their own record is a near-term follow-up (flagged in code comments).
- **Email delivery.** `POST /users/students` and `/users/lecturers` return a one-time
  temporary password directly in the API response because no email provider is wired up
  yet (docs/00 §20 — provider not chosen). This is a deliberate V1 stopgap, flagged in code,
  not a finished flow.
- **Prerequisite cycle detection.** Only direct self-reference/duplicate is blocked; a
  longer chain (A requires B requires A) is not detected.
- **Attendance, assignments/quizzes, announcements, file uploads, notifications, reports,
  admissions workflow, transcripts.** Modeled in the schema; no service/controller layer
  yet — next in line, not started.
- **Frontend.** See `../frontend/` — a thin login-flow slice only.

## Local development

Requires Node 22+, PostgreSQL 16, npm.

```bash
cp .env.example .env   # then edit DATABASE_URL, JWT_SECRET
npm install
npx prisma migrate dev   # creates/updates the schema
npx prisma db seed       # seeds grade bands + an initial Super Admin account
npm run start:dev
```

The seed script prints the Super Admin's temporary login — it forces a password change
on first use (`mustChangePassword: true`, not yet enforced by an endpoint — flagged).

### Useful scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Dev server with hot reload |
| `npm test` | Unit tests (no database needed) |
| `npm run test:e2e` | End-to-end tests (needs a running database) |
| `npm run lint` | ESLint |
| `npx prisma studio` | Browse the database visually |
| `./smoke-test.sh` | Live scenario test of the registration business rules (needs a running server + seeded DB) |

### Environment variables

See `.env.example`. `DATABASE_URL` and `JWT_SECRET` are required; everything else has a
sensible default.

## Project layout

Each directory under `src/` is a Nest module matching a domain boundary from
[`../docs/01-agent-responsibility-matrix.md`](../docs/01-agent-responsibility-matrix.md) —
`auth`, `users`, `academic-structure` (faculties/departments/programs),
`academic-calendar` (years/semesters), `courses` (courses/prerequisites/curriculum/offerings),
`enrollment` (enrollments/course registrations), `grading` (pure calculation functions,
DB-independent and reused by whichever module needs them), `prisma` (the one shared
database connection), `common` (guards/decorators shared across modules).
