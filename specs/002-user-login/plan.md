# Implementation Plan: User Login

**Branch**: `002-user-login` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-user-login/spec.md`

## Summary

Add a dedicated, public `/sign-in` page that renders Clerk's `<SignIn/>` component (email +
password only, per Clarifications) alongside the company logo, and redirects an
already-authenticated visitor straight to `/dashboard`. This closes a gap left by
`001-admin-dashboard`: `clerkMiddleware` (`src/proxy.ts`), the root page, and the `(admin)`
layout already call Clerk's `redirectToSignIn()` for unauthenticated visitors, but no
`NEXT_PUBLIC_CLERK_SIGN_IN_URL` is configured, so those calls currently fall through to Clerk's
hosted Account Portal instead of an in-app page. This feature adds the missing page and points
that env var at it, without changing any of the existing route-protection logic.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode (Next.js 16 / React 19 runtime, Node.js LTS)

**Primary Dependencies**: Next.js (App Router), React, Tailwind CSS v4, shadcn/ui, Lucide icons,
`@clerk/nextjs` (`<SignIn/>` UI component and the `auth()` server helper — both already a project
dependency); Zod is not exercised by this feature (no new server mutation or form the app itself
validates — Clerk owns credential input and validation)

**Storage**: N/A — no persistence introduced; the only "entity" is Clerk's own session, read via
`auth()`

**Testing**: Vitest (already configured). No new unit tests are added for this feature — see
research.md #4 for why

**Target Platform**: Web browsers (desktop-first, responsive to tablet and mobile), served by the
Next.js application

**Project Type**: Web application — single Next.js project (App Router), not a separate
frontend/backend split

**Performance Goals**: Sign-in to a fully loaded dashboard in under 10 seconds under normal
network conditions (SC-001)

**Constraints**: No custom password storage, credential handling, or authentication logic
(FR-002); only email + password is offered (FR-013) — this is controlled by the Clerk instance's
"User & Authentication" configuration, not by frontend code, so the sign-in page must not attempt
to hide or restrict strategies in the UI layer; existing `redirectToSignIn()` call sites
(`src/proxy.ts`, `src/app/page.tsx`, `src/app/(admin)/layout.tsx`) and their role-based
route-access logic (`src/lib/auth/route-access.ts`) must remain unchanged

**Scale/Scope**: One new route (`/sign-in`); one environment variable added
(`NEXT_PUBLIC_CLERK_SIGN_IN_URL`); no new entities, tables, or API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| 1. Technology Foundation | Next.js App Router, React, TS strict, `src/`, pnpm, Tailwind, shadcn/ui, Lucide, Clerk, Zod | **Pass** — all used except Prisma/PostgreSQL and Zod, neither of which this feature needs (no persistence, no app-owned form validation) |
| 2. Next.js Architecture | Server Components default; `"use client"` minimized; no server-only logic in client code | **Pass** — `/sign-in/page.tsx` is a Server Component that performs the `auth()` check and conditional `redirect()`; `<SignIn/>` itself is a Clerk-provided Client Component boundary, not authored by this feature |
| 3. Feature-Oriented Architecture | Feature code co-located; shared code only where genuinely reused | **Pass** — the entire feature is one route file; no extraction into `src/features/` is warranted for a single, non-reused page (see research.md #5) |
| 4. UI Design System | Reproduce reference screenshots; reuse shadcn/ui; Lucide icons only | **Pass with note** — no `docs/ui/sign-in.png` reference exists yet (this page doesn't exist in the current app), so the page follows the same design tokens (colors, radii, typography) and shadcn/ui `Card` primitive used elsewhere, rather than reproducing a specific screenshot |
| 5. Responsive Design | Usable at tablet/mobile, not just shrunk | **Pass** — FR-010/SC-005 require full responsiveness; a single centered card layout reflows naturally |
| 6. TypeScript Standards | Strict mode; no unjustified `any` | **Pass** — no new types beyond what Clerk's SDK already exports |
| 7. Data and Persistence | No tenant IDs/org-scoping; DB access server-side only | **Pass** — no persistence in this feature |
| 8. Validation and Data Integrity | Untrusted input validated server-side with Zod | **N/A this feature** — Clerk owns credential capture and validation end-to-end (FR-002, FR-007); the app never receives raw credentials to validate |
| 9. Authentication, Authorization, Security | Authn/authz separate; server-enforced checks; no secrets in client code | **Pass** — Clerk remains the sole authentication provider; the already-authenticated redirect is a server-side `auth()` check, not a client flag; `CLERK_SECRET_KEY` stays server-only (unchanged) |
| 10. Component and Code Quality | Reuse over duplication; no unrelated refactors | **Pass** — reuses shadcn/ui `Card`, existing logo asset, and Clerk's own `<SignIn/>`; does not touch `route-access.ts`, `proxy.ts`, or the `(admin)` layout |
| 11. Dependency Discipline | New deps only for meaningful value; pnpm only | **Pass** — no new dependency; `@clerk/nextjs` already installed |
| 12. User Experience States | Loading/empty/error/validation/success states present | **Pass** — Clerk's `<SignIn/>` supplies its own loading, validation, and error states (FR-006, FR-007); SC-004 verified via quickstart |
| 13. Accessibility | Semantic HTML, keyboard access, labels, focus, contrast | **Pass** — FR-011; Clerk's `<SignIn/>` is accessible by default, and the surrounding page markup (logo, heading, landmarks) uses semantic elements |
| 14. Testing Strategy | Risk-based; required for business logic/calculations/authz/validation | **Pass** — no new branching business logic is introduced (see research.md #4); existing `route-access.test.ts` is untouched and still covers the one authorization decision function in the app |
| 15. Quality Gates | Lint, typecheck, tests, build must pass via pnpm scripts | **Pass** — no changes to scripts; existing `lint`/`typecheck`/`test`/`build` gates apply unchanged |
| 16. AI Agent Discipline | Smallest coherent change; no speculative infra | **Pass** — one new route, one env var; no role-based branching added to the sign-in page itself (explicitly out of scope per FR-012 and Clarifications) |

No violations requiring justification. Complexity Tracking table intentionally omitted.

**Post-Phase 1 re-check**: research.md and contracts/ introduce no new dependencies,
persistence, or role-based logic beyond what is listed above. The route contract keeps the
already-authenticated redirect role-agnostic (always `/dashboard`), consistent with the
Clarifications and Principle 16 (no speculative role-based infra). `data-model.md` confirms no
new entities. Gate remains **Pass**.

## Project Structure

### Documentation (this feature)

```text
specs/002-user-login/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── sign-in/
│   │   └── page.tsx          # New: public route. Server Component — redirects to /dashboard
│   │                         # if already signed in, otherwise renders the logo + <SignIn/>
│   ├── page.tsx               # Unchanged — already calls redirectToSignIn() for visitors
│   ├── (admin)/layout.tsx     # Unchanged — already calls redirectToSignIn() for visitors
│   └── layout.tsx             # Unchanged — ClerkProvider already wraps the whole app
├── proxy.ts                   # Unchanged — isAdminRoute matcher and redirectToSignIn() call untouched
└── lib/auth/
    ├── route-access.ts        # Unchanged
    └── get-session-access.ts  # Unchanged

.env.local.example              # Updated: document NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
```

**Structure Decision**: Single Next.js App Router project under `src/`, unchanged from
`001-admin-dashboard`. This feature adds exactly one new route file
(`src/app/sign-in/page.tsx`), matching the existing convention of a plain top-level route for a
page that isn't part of the `(admin)` shell (the same pattern `src/app/driver/page.tsx` already
uses). No `src/features/` subfolder is introduced because there is no feature-specific business
logic, data, or multi-component composition to separate from presentation — the whole feature is
one small Server Component page (Principle 3: avoid unnecessary abstraction for a single-file
feature). Everything else in the codebase (`proxy.ts`, `route-access.ts`, `get-session-access.ts`,
the root page, and the `(admin)` layout) is reused exactly as-is.
