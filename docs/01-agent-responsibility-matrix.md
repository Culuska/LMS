# Sub-Agent Responsibility Matrix & Working Protocol
**University Management System + LMS**

This document operationalizes the multi-agent structure for this project: who (which specialized agent role) owns which part of the system, how conflicts get resolved, and what "done" means. It's the working protocol every future development session should follow, whether one agent handles several roles sequentially or several agents work in parallel.

## Why planning happened as one pass, not 22 parallel agents

This first phase — requirements audit, architecture, database model, role/permission design — is a single coherent analytical document with dependencies running in every direction (roles affect permissions affect database affect security affect UI). Splitting *that* across parallel agents would mean each one re-deriving the same context and risking exactly the inconsistency this protocol exists to prevent. The Master Orchestrator produced `00-requirements-audit.md` and `02-architecture-proposal.md` directly for that reason.

**Parallel sub-agents earn their keep once there is parallel, independent implementation work** — e.g., once architecture is approved, the Frontend and Backend agents can build against the agreed API contract simultaneously; QA can write test plans while Backend is mid-implementation; DevOps can provision environments while UI/UX is still finalizing screens. That's the point at which this project will actually fan out.

## Master Orchestrator / Lead Architect

Owns: overall architecture, module breakdown, cross-agent coordination, conflict resolution, roadmap, final integration approval. Maintains this document and the shared source of truth (§ "Shared project memory" below). No sub-agent overrides an architectural decision recorded here without flagging it back to the Orchestrator first.

## Sub-agent responsibility matrix

| Agent | Owns | Primary outputs | Depends on |
|---|---|---|---|
| **Requirements & Business Analysis** | Turning university policy into software requirements | `00-requirements-audit.md`, business rules (§8), open-questions log | Lecturer's answers to policy questions |
| **UI/UX Design** | Screens, flows, information architecture per role | Wireframes/flows for each dashboard (§16), design system | Requirements, role/permission model |
| **Frontend Development** | Web application implementation | Components, pages, forms, client-side validation | API contract from Backend — never invents endpoints |
| **Backend Development** | Business logic, API implementation | REST/GraphQL API matching the contract, service layer | Database schema, Auth model, Requirements |
| **Database Architect** | Schema, relationships, constraints, migrations, indexing | Physical schema derived from `00-requirements-audit.md` §7, migration scripts | Conceptual model (§7), business rules (§8) |
| **Authentication & Authorization** | Login, sessions, RBAC enforcement | Auth service, permission-check middleware/policies | Role/permission model (§5) |
| **Cybersecurity** | Continuous security review | Findings against `00-requirements-audit.md` §12, fixes verified pre-merge | Every other agent's output, continuously |
| **LMS / E-Learning** | Course content, assignments, quizzes, forums | LMS modules per §10 | Database schema, File & Storage agent |
| **Academic Management** | Faculties/departments/programs/curriculum/registration/progression | Academic-structure modules per §7/§8 | **Lecturer's policy answers — never assumes rules** |
| **Examination & Grading** | Marks, approval workflow, GPA/CGPA, transcripts | Grading engine, deterministic + unit-tested calculations | Grading policy (§9), Academic Management agent |
| **Attendance** | Attendance recording & reporting | Attendance module per §11 | Database schema |
| **File & Storage** | Upload/download, validation, storage architecture | File service used by LMS, Submissions, Documents | Security agent (upload validation rules) |
| **Notification & Communication** | In-app + email notifications | Notification dispatch service | Every agent producing an event that should notify someone |
| **Reporting & Analytics** | Reports and exports | Report definitions per §17 | RBAC model (reports must respect it) |
| **API / Integration** | API standards, versioning, external integrations | API documentation, integration adapters (SSO, email provider) | Backend agent |
| **DevOps / Infrastructure** | Environments, CI/CD, deployment, monitoring, backups | Working dev/staging/prod pipeline | Architecture decisions (§02) |
| **QA / Testing** | Test plans and automated tests | Test suites per module, especially grading (§9) and RBAC (§5) | Feature implementations |
| **Debugging / Troubleshooting** | Root-cause diagnosis of reported issues | Bug reports with root cause + smallest safe fix | Whichever agent owns the affected module |
| **Performance Optimization** | Load-time, query, and scaling issues | Optimization only where measured need exists | Real usage/load data — not speculative |
| **Documentation** | Architecture/API/DB/user/admin docs kept current | This doc set, kept synchronized with implementation | All agents |
| **Data Migration** | Importing any existing university data, if applicable | Mapping, cleaning, validated import scripts | A real existing data source — not started speculatively |

## Agent communication protocol

Every agent, when it hands off work (to the Orchestrator or to another agent), reports:

1. **Task** — what was asked.
2. **Work completed** — what was actually done.
3. **Files/components changed.**
4. **Dependencies** — what other agents need to know or adjust for.
5. **Problems found.**
6. **Decisions made** — recorded in the shared decision log (`03-open-questions-and-decisions.md`).
7. **Testing performed.**
8. **Remaining work.**

## Shared project memory

Single source of truth, all agents read from and write to the same set:

- `docs/00-requirements-audit.md` — requirements, business rules, gap analysis
- `docs/01-agent-responsibility-matrix.md` — this file
- `docs/02-architecture-proposal.md` — architecture, API contract (once implementation starts, this expands into a living API spec)
- `docs/03-open-questions-and-decisions.md` — open questions and the decision log
- (once implementation starts) `docs/04-database-schema.md`, `docs/05-api-contract.md`, a coding-standards doc, and a known-issues log

No agent maintains a private/forked copy of requirements. If a requirement changes, the audit document is updated first, and that update is what every agent works from next.

## Conflict resolution

If two agents' outputs disagree (e.g. Frontend expects an API shape Backend didn't build), the Orchestrator resolves it and records the decision in the shared memory — no dual/parallel implementations are allowed to persist.

## Change management

Before any requirement change is implemented: identify affected modules → affected agents → database impact → API impact → frontend impact → security impact → testing impact → update documentation → *then* implement.

## Definition of done

A feature is done only when: requirements are satisfied, UI + backend + database are all implemented, the API matches the documented contract, permissions are verified correct (not just "the button is hidden"), security has been reviewed, automated tests pass, errors are handled, documentation is updated, it integrates correctly with related modules, and no known critical regression exists.

## Development workflow (sequence)

```
Requirements → Gap Analysis → System Architecture → Database Architecture → API Architecture
→ UI/UX → Frontend + Backend Development → Integration → Security Review → Testing
→ Debugging → Performance Testing → Deployment → Production Monitoring
```

We are currently at the start of this sequence: **Requirements & Gap Analysis, drafted, pending your review and answers in `03-open-questions-and-decisions.md`.**
