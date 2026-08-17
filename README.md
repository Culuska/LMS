# University Management System + LMS

A combined Student Information System and Learning Management System for a university, built through a coordinated multi-agent engineering process (see `docs/01-agent-responsibility-matrix.md`).

## Status: Requirements & Architecture phase — no application code yet

Per project discipline (`Requirements → Gap Analysis → Architecture → Database Design → UI/UX → Development → Testing → Security → Deployment`), we are at the first stage. Nothing below is optional reading if you're picking this project up — it's the shared source of truth every later phase builds on.

## Documents

1. [`docs/00-requirements-audit.md`](docs/00-requirements-audit.md) — Full requirements audit: missing features, unnecessary/premature features, user roles, RBAC model, corrected academic workflow, conceptual database model, data-integrity rules, examination/grading audit, LMS/attendance/security/privacy audits, reports, and the final gap analysis (Must/Should/Nice/Remove).
2. [`docs/01-agent-responsibility-matrix.md`](docs/01-agent-responsibility-matrix.md) — How development work is divided across specialized agent roles, the communication protocol between them, and the definition of done.
3. [`docs/02-architecture-proposal.md`](docs/02-architecture-proposal.md) — Proposed technical architecture (frontend, backend, database, storage, hosting, security, CI/CD).
4. [`docs/03-open-questions-and-decisions.md`](docs/03-open-questions-and-decisions.md) — Open questions that need the university's (not a developer's) answers before grading, GPA, and progression logic can be finalized, plus the running decision log.

## Next step

Answer the questions in `docs/03-open-questions-and-decisions.md` (§A: academic policy). Architecture-level questions (§B) are being asked directly in chat. Once answered, the audit and architecture documents will be updated and database schema / API contract design begins.
