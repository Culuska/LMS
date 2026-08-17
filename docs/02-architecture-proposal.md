# Initial System Architecture Proposal
**University Management System + LMS — v0.2 (scale/hosting/mobile confirmed; database/grading details pending §A in `03-open-questions-and-decisions.md`)**

**Confirmed (2026-08-17):** medium scale (~2,000–15,000 students, full university from V1), cloud-managed hosting, responsive web only for V1 (no native app). This proposal reflects those decisions. Data-protection jurisdiction is still pending (country not yet specified) — retention/erasure specifics in `00-requirements-audit.md` §13 will be finalized once that's answered.

## Shape of the system

- **One responsive web application**, server-rendered or hybrid, serving students, lecturers, and all administrative roles through role-based views of the same app — not separate apps per role. (One codebase to secure, test, and maintain.)
- **A single backend API** the frontend consumes — no direct database access from the frontend, ever.
- **One relational database** as the system of record. A university's data is fundamentally relational (students↔courses↔results↔departments, with strict integrity rules like §8) — a relational database is the correct fit, not a NoSQL document store, which would make enforcing rules like "prerequisites must be met" and "grades can't be edited after publication" much harder.
- **Object storage** for files (course materials, submissions, documents) — never stored in the database, never on local disk on an app server that could be redeployed.
- **Background job processing** for anything that shouldn't block a user's request: sending emails, generating a transcript PDF, recomputing GPA after a bulk grade change.

## Layers

| Layer | Recommendation | Why |
|---|---|---|
| **Frontend** | A modern component-based framework (e.g. React or Vue) with server-side rendering or a static build served behind the same domain as the API | Component reuse across the many role-based dashboards; SSR helps first-load performance for students on weaker connections/devices |
| **Backend / API** | A mainstream, well-supported server framework with strong ORM support (e.g. Node.js/NestJS, or Python/Django — see comparison below) | Both have mature RBAC, validation, and testing ecosystems; either is a defensible, maintainable choice for a university system expected to be maintained by future developers who didn't build it |
| **Database** | PostgreSQL | Strong relational integrity (foreign keys, constraints — needed for §8's rules), mature, free, widely known so future developers/DBAs can maintain it, good JSON support for the few genuinely flexible fields without giving up relational guarantees everywhere else |
| **File storage** | S3-compatible object storage (AWS S3, or a compatible self-hosted option like MinIO if on-prem is required) | Scales independently of the app, supports signed/expiring URLs for secure access (§9, §14) |
| **Authentication** | Backend-issued session or short-lived JWT + refresh token, argon2/bcrypt password hashing, server-side RBAC enforcement on every endpoint | Never trust client-side role checks alone (§5 conflict #2) |
| **Background jobs** | A queue (e.g. Redis-backed job queue) for email sending, PDF/transcript generation, scheduled GPA recalculation | Keeps user-facing requests fast; makes retries/failures visible instead of silent |
| **Search (if needed)** | Database full-text search initially (Postgres has this built in); a dedicated search engine only if catalog/course search proves too slow at real scale | Avoid adding infrastructure (e.g. Elasticsearch) before there's a measured need |

### Framework comparison (backend)

| Option | Strength for this project | Consideration |
|---|---|---|
| **Node.js + NestJS + TypeScript** | Same language (TypeScript) as a React/Vue frontend simplifies the team's mental model; NestJS has structured, testable architecture out of the box (good fit for the multi-agent/multi-module structure here) | Slightly more setup ceremony than a minimal framework |
| **Python + Django (+ DRF)** | Batteries-included admin interface is genuinely useful for a university system's internal data-fixing needs; huge ecosystem; easy for future developers/ops staff to find | Different language from a JS frontend (not a real downside, just a team-composition consideration) |

**Recommendation: NestJS (TypeScript) backend + React frontend**, both TypeScript, for one shared type/validation layer between client and server and a project structure that naturally matches the module boundaries in `01-agent-responsibility-matrix.md`. This is a recommendation, not a locked decision — reasonable to swap for Django if you/your future dev team have a strong existing preference (flag in open questions if so).

## API architecture

- REST API, versioned (`/api/v1/...`), documented (OpenAPI/Swagger generated from code so docs can't drift from the real contract).
- Every endpoint enforces authorization server-side based on the RBAC model in `00-requirements-audit.md` §5 — role checks live in one shared policy layer, not scattered per-endpoint, so a rule change (e.g. "Exam Officers can now also do X") is a one-place edit.
- Input validation on every write endpoint (defense against injection and malformed data alike).

## Hosting & deployment (confirmed: cloud-managed)

- A managed Postgres instance, containerized app deployment (e.g. on a platform like Render/Fly/AWS ECS), managed object storage (S3), managed email delivery (e.g. SES/Postmark/SendGrid). Lower operational burden — no one on a small university IT team needs to patch database servers at 2am.
- Separate **development**, **staging**, and **production** environments, with production changes only going out through the staging environment first.

**Cross-border transfer note (Somalia DPA Act No. 005/2023 — see `00-requirements-audit.md` §13):** Somalia has no major hyperscaler region, so cloud-managed hosting means personal data leaves the country. This is legally workable under the Act (adequate safeguards, e.g. a data-processing agreement with contractual clauses), but it is a **procurement/legal step the university must take with the chosen cloud vendor before go-live**, not something engineering resolves by itself. Practical candidates worth evaluating for proximity/latency and vendor data-protection terms: AWS Africa (Cape Town), Microsoft Azure UAE regions, or another provider your university's counsel is comfortable signing transfer safeguards with. Flagged in the open-questions log — needs your compliance/legal contact, not a technical decision.

## Backups & recovery

- Automated daily database backups, retained per your data-retention decision, tested by periodic restore drills (an untested backup is not a real backup).
- File storage: versioned/redundant object storage (standard with S3-compatible providers).
- Documented recovery point objective (how much data loss is acceptable — should be near-zero for grades/records) and recovery time objective (how long restoring service can take).

## Monitoring & logging

- Application error tracking (e.g. Sentry-style) so failures are caught, not discovered by a student reporting "the site is broken."
- Infrastructure/uptime monitoring on the production environment.
- The `AuditLog` entity (requirements §7/§8) is a separate, application-level concern from infrastructure logging — both are needed.

## Testing & CI/CD

- Automated tests run on every change before merge: unit tests (especially the grading engine — §9, which must be deterministic and heavily tested), integration tests for API endpoints, and permission tests specifically verifying that, e.g., a lecturer really cannot edit another lecturer's course marks via a direct API call.
- CI pipeline blocks merge on failing tests; deployment to production only from a passing, reviewed build.

## What this architecture deliberately avoids (for now)

- Microservices — a single well-modularized backend is easier to build, secure, and maintain at this scale than a distributed system, and nothing in the requirements needs independent scaling of individual modules yet.
- A native mobile app / separate mobile backend (see requirements §19).
- Multi-region/multi-datacenter deployment — not justified until real usage and hosting-location requirements are known.

---
*This proposal will be finalized once you've answered the architecture-relevant questions raised in the accompanying question set (data-protection jurisdiction, expected scale, hosting preference, mobile strategy).*
