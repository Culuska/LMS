# Frontend — University Management System + LMS

React + TypeScript + Vite. A thin vertical slice proving the auth flow end to end
against the backend — not a built-out application yet.

## What's here

- `src/api/client.ts` — fetch wrapper: attaches the bearer token, parses errors into a
  typed `ApiError`.
- `src/auth/` — `AuthContext`/`AuthProvider` (token + user state, persisted in
  `localStorage`, re-validated against `/auth/me` on load), `useAuth` hook,
  `ProtectedRoute`.
- `src/pages/Login.tsx` — working login form.
- `src/pages/Dashboard.tsx` — **placeholder only**, deliberately labeled as such in the UI.
  Shows the authenticated user's name/email/roles to prove the flow works; the real
  role-specific dashboards (student/lecturer/registrar/admin — see
  `../docs/00-requirements-audit.md` §16) are not built.

Verified with a real browser (Playwright) driving the actual flow against the running
backend: unauthenticated → redirected to `/login` → login → `/dashboard` with correct
user data → session survives a page reload → sign-out → redirected back to `/login`.

## Local development

```bash
cp .env.example .env.local   # point VITE_API_BASE_URL at your backend
npm install
npm run dev
```

Requires the backend (`../backend`) running and seeded (see its README) — there's
nothing to log in with otherwise.

## Not implemented yet

Everything beyond login: role-specific dashboards, every actual academic/LMS feature,
registration/course management UI, error boundaries beyond the basic try/catch in
`Login.tsx`, accessibility audit, responsive design polish, and a generated (rather than
hand-maintained) API type layer once the backend's contract stabilizes.
