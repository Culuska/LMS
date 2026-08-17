# University Management System + LMS

A combined Student Information System and Learning Management System for a university, built through a coordinated multi-agent engineering process (see `docs/01-agent-responsibility-matrix.md`).

## Status: Requirements & Architecture phase — no application code yet

Per project discipline (`Requirements → Gap Analysis → Architecture → Database Design → UI/UX → Development → Testing → Security → Deployment`), we are at the first stage. Nothing below is optional reading if you're picking this project up — it's the shared source of truth every later phase builds on.

## Documents

1. [`docs/00-requirements-audit.md`](docs/00-requirements-audit.md) — Full requirements audit: missing features, unnecessary/premature features, user roles, RBAC model, corrected academic workflow, conceptual database model, data-integrity rules, examination/grading audit, LMS/attendance/security/privacy audits, reports, and the final gap analysis (Must/Should/Nice/Remove).
2. [`docs/01-agent-responsibility-matrix.md`](docs/01-agent-responsibility-matrix.md) — How development work is divided across specialized agent roles, the communication protocol between them, and the definition of done.
3. [`docs/02-architecture-proposal.md`](docs/02-architecture-proposal.md) — Proposed technical architecture (frontend, backend, database, storage, hosting, security, CI/CD).
4. [`docs/03-open-questions-and-decisions.md`](docs/03-open-questions-and-decisions.md) — Running decision log. Both the academic-policy questions (§A) and architecture questions (§B) are now answered.
5. [`docs/04-grading-and-academic-policy.md`](docs/04-grading-and-academic-policy.md) — **Authoritative grading & academic policy specification**: grading scale, GPA table, credit/semester structure, assessment weight bands, retakes, withdrawal, Incomplete handling, probation/dismissal, graduation requirements, registration rules, and attendance policy. This is what the grading engine and `GradingScheme` configuration are built from.

## Status

Requirements, roles/RBAC, architecture, privacy/compliance (Somalia DPA Act No. 005/2023), and academic/grading policy are all confirmed. A short list of small residual gaps is tracked at the bottom of `docs/04-grading-and-academic-policy.md` and in `docs/03-open-questions-and-decisions.md` — none of them block starting database schema and API contract design, which is the next phase.
