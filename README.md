# University Management System + LMS

A combined Student Information System and Learning Management System for a university, built through a coordinated multi-agent engineering process (see `docs/01-agent-responsibility-matrix.md`).

## Status: In development

Requirements, architecture, and academic/grading policy are settled (see Documents
below). The backend now has a working end-to-end academic core: auth/RBAC, academic
structure, course registration with its data-integrity rules, attendance, the full
grading pipeline (marks → compute → submit → approve → publish → academic record → GPA
→ academic standing), and grade-change requests for corrections after publication —
with role separation, an anti-self-approval check, and (for grade changes specifically)
a deliberate exclusion of even Super Admin from approval authority, matching the audit's
RBAC table exactly rather than a generic admin-override shortcut. A thin frontend
vertical slice (login → dashboard) exists and is verified working. See `backend/README.md`
and `frontend/README.md` for exactly what's built vs. not yet.

## Documents

1. [`docs/00-requirements-audit.md`](docs/00-requirements-audit.md) — Full requirements audit: missing features, unnecessary/premature features, user roles, RBAC model, corrected academic workflow, conceptual database model, data-integrity rules, examination/grading audit, LMS/attendance/security/privacy audits, reports, and the final gap analysis (Must/Should/Nice/Remove).
2. [`docs/01-agent-responsibility-matrix.md`](docs/01-agent-responsibility-matrix.md) — How development work is divided across specialized agent roles, the communication protocol between them, and the definition of done.
3. [`docs/02-architecture-proposal.md`](docs/02-architecture-proposal.md) — Technical architecture (frontend, backend, database, storage, hosting, security, CI/CD) — now implemented, not just proposed.
4. [`docs/03-open-questions-and-decisions.md`](docs/03-open-questions-and-decisions.md) — Running decision log. Both the academic-policy questions (§A) and architecture questions (§B) are answered.
5. [`docs/04-grading-and-academic-policy.md`](docs/04-grading-and-academic-policy.md) — **Authoritative grading & academic policy specification**: grading scale, GPA table, credit/semester structure, assessment weight bands, retakes, withdrawal, Incomplete handling, probation/dismissal, graduation requirements, registration rules, and attendance policy. This is what `backend/src/grading/` implements.

## Code

- [`backend/`](backend/) — NestJS + Prisma + PostgreSQL API. See `backend/README.md` for
  what's implemented, what's verified, what's explicitly not built yet, and how to run it.
- [`frontend/`](frontend/) — React + TypeScript + Vite. A working login flow only —
  see `frontend/README.md`.

## Continuous integration

[`.github/workflows/backend-ci.yml`](.github/workflows/backend-ci.yml) — lint,
type-check, migrate, unit tests, build, e2e tests against a real Postgres service
container, on every push/PR touching `backend/`.

## What's next

Per the development sequence in `docs/01-agent-responsibility-matrix.md`
(Requirements → Architecture → Database → API → UI/UX → Development → Testing →
Security → Deployment): role-assignment admin tooling, LMS content delivery
(assignments/quizzes with student-facing submission, file uploads),
announcements/notifications, transcripts, and the admissions workflow are next — see
`backend/README.md`'s "not implemented yet" list for the full picture.
