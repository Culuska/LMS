# Frontend — BaroTech University Portal

React + TypeScript + Vite. Real screens wired to the backend for the three main roles
(student, lecturer, admin/registrar), with a deliberate design system rather than
unstyled defaults — see **Design system** below for the reasoning.

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
- `src/styles/` — the design system: `tokens.css` (color/type/space/radius/shadow custom
  properties, light + dark), `base.css` (resets, focus states, skip link), `components.css`
  (every shared class: nav shell, buttons, forms, tables, chips, cards, tabs, empty states).
- `src/components/` — `PageHeader` (breadcrumb + title + subtitle + actions, used on
  every page for consistent orientation), `StateViews` (`Loading`/`EmptyState`),
  `icons.tsx` (a small hand-authored line-icon set — not a third-party dependency).
- `src/layout/AppLayout.tsx` + `useTheme.ts` — the shared shell every authenticated page
  renders inside: a persistent, role-grouped sidebar (collapsing to a keyboard-accessible
  drawer under 880px), a light/dark toggle that remembers the user's choice over the OS
  default, a notification badge, and focus-on-navigate so screen readers announce route
  changes in this SPA.
- `src/pages/Login.tsx` — working login form.
- `src/pages/ChangePassword.tsx` — reachable two ways: forced (`AppLayout` redirects
  here whenever `user.mustChangePassword` is true, and the guard re-applies on every
  navigation, so there's no way to route around it while still on a temporary password)
  or voluntary. Lives outside `AppLayout`'s route group specifically so the redirect
  can't loop.
- `src/pages/Dashboard.tsx` — role-aware hub: a live stat row (unread notifications,
  registered courses / offerings / applications-awaiting-review depending on role — real
  counts, not placeholders) plus link cards mirroring `AppLayout`'s nav.
- `src/pages/NotFound.tsx` — a real 404 inside the app shell, not a silent redirect.
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

## Design system

Built against Peter Morville's Honeycomb model rather than "make it pretty" alone —
each facet maps to a concrete decision, not just a vibe:

- **Useful / Valuable** — the dashboard's stat row surfaces real numbers (unread
  notifications, applications awaiting review, etc.) instead of being a pure link list;
  every screen exists because a role in the RBAC table needs it, nothing decorative.
- **Usable** — one shared `PageHeader`/table/form/button/chip vocabulary across every
  page so a pattern learned once (how to read a status chip, where the primary action
  lives) transfers everywhere; native HTML validation is left on (no `noValidate`) so
  required-field errors use the browser's own accessible mechanism.
- **Desirable** — a palette and type system chosen for this institution (see tokens.css's
  header comment for the rationale), not a generic template; restrained motion
  (`prefers-reduced-motion` respected everywhere).
- **Findable** — a persistent, role-grouped sidebar plus breadcrumbs on every interior
  page, so "where am I / where can I go" never depends on memory or the back button.
- **Accessible** — self-hosted fonts (no third-party font requests), a skip-to-content
  link, visible focus rings, `aria-live` error/notice regions, labeled form controls
  (visible or `sr-only`, never placeholder-only), a keyboard-reachable mobile drawer
  close control (not just a scrim click), and route-change focus management for screen
  readers. Text/background pairs used for real copy are checked against WCAG AA — see
  `tokens.css`'s comment for the one deliberate exception and where it's restricted to.
  Both a light and a genuinely-tuned (not naively inverted) dark theme are supported,
  following the OS preference by default with a manual override that persists.
- **Credible** — a real 404 instead of a silent redirect, a footer with a support
  contact and a pointer to the data-protection policy, and no invented capabilities:
  every claim in the UI (stat counts, status labels) reflects a real backend response.

Verified with a real browser (Playwright) driving the actual flow against a running
backend + freshly seeded database: login as super admin/lecturer/student, navigate every
page above, create academic-structure records through the admin console, and run the
**full grading pipeline through the UI** — enter marks as the lecturer, compute, submit,
then approve and publish as an admin, then confirm the student's transcript reflects the
published grade (21 UI-level checks + a 9-check pipeline walkthrough). Separately, the
forced-password-change flow itself: temp-password login redirects to `/change-password`,
direct navigation to any other route bounces back, wrong-current-password and
mismatched-confirmation are both rejected client-and-server-side, and a successful
change unlocks the app immediately without a fresh login (8 checks). 38 live UI checks
total, all passing, plus a manual screenshot pass across light/dark and a 390px mobile
viewport that caught and fixed two real CSS bugs (a stray close-button visible on
desktop from a losing cascade order, and several inline-form fields collapsing to
full-width stacked rows instead of a row layout from an over-broad `width: 100%` rule) —
both documented in `components.css`'s comments at the fix site so they don't regress.

## Local development

```bash
cp .env.example .env.local   # point VITE_API_BASE_URL at your backend
npm install
npm run dev
```

Requires the backend (`../backend`) running and seeded (see its README) — there's
nothing to log in with otherwise.

## Not implemented yet

- **Edit/delete for structural records.** Academic Structure is list+create only;
  changing an already-referenced faculty/course/offering safely needs its own
  cascade-review design, not a quick add-on.
- **Curriculum version management UI.** The backend has full curriculum-version +
  curriculum-course endpoints; there's no admin screen for them yet (the fixture/smoke
  scripts drive it via curl instead).
- **File uploads, assignment/quiz submission UI, transcript PDF export, admin reports** —
  none of these exist on the backend yet either (see `../backend/README.md`), so there's
  nothing for the frontend to call.
- **No automated accessibility audit tool run** (e.g. axe-core) — the accessibility work
  above was done by hand against WCAG AA criteria, not verified by a scanner; a real
  audit before launch would likely find more.
- **Error boundaries** beyond the per-page try/catch pattern, and a generated (rather
  than hand-maintained) API type layer once the backend's contract stabilizes.
