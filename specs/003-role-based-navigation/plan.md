# Implementation Plan: Role-Based Dashboard Navigation

**Branch**: `003-role-based-navigation` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-role-based-navigation/spec.md`

## Summary

Collapse the separate driver-area redirect into a single shared `/dashboard` destination for
every signed-in user, and make the sidebar navigation role-aware: Administrators keep the full
nav and dashboard content unchanged; Drivers land on `/dashboard` with a minimal placeholder
body and a navigation containing only Dashboard. The five Administrator-only pages
(Timesheets, Containers, Drivers, Reports, Settings) move under a nested route group with their
own server-side role guard, so a Driver hitting those URLs directly is redirected to `/dashboard`
— navigation hiding is a UX convenience, not the access control.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode (Next.js 16 / React 19 runtime, Node.js LTS)

**Primary Dependencies**: Next.js (App Router route groups + nested layouts), React,
`@clerk/nextjs` (existing session/role read), Tailwind CSS v4, shadcn/ui, Lucide icons — no new
dependencies

**Storage**: N/A — role continues to come from Clerk's `publicMetadata.role`, already read by
`get-session-access.ts`; no persistence changes

**Testing**: Vitest — extend the existing `tests/unit/route-access.test.ts` for the two
access-resolution functions, and add a unit test for the new role → navigation-items filtering
function, per the constitution's risk-based testing strategy (authorization-adjacent logic)

**Target Platform**: Web browsers (desktop-first, responsive), served by the existing Next.js
application

**Project Type**: Web application — single Next.js project (App Router), no structural change

**Performance Goals**: No new performance requirements; role check and nav filtering are
synchronous, in-memory operations on data already fetched for the existing auth check

**Constraints**: Administrator-only pages MUST stay protected server-side even when linked
directly by URL (FR-006); no tenant/organization abstractions; Administrator's existing
navigation and dashboard content MUST NOT regress (FR-004, FR-008)

**Scale/Scope**: Same two roles, same six navigation destinations; no new routes are introduced
beyond reorganizing five existing ones under a nested route group

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| 1. Technology Foundation | Next.js App Router, React, TS strict, `src/`, pnpm, Tailwind, shadcn/ui, Lucide, Clerk, Zod | **Pass** — no new dependencies; reuses existing stack |
| 2. Next.js Architecture | Server Components default; `"use client"` minimized | **Pass** — both layouts and the dashboard page stay Server Components; only `Sidebar` (already a Client Component for `usePathname`) gains a `navItems` prop, no new client boundary |
| 3. Feature-Oriented Architecture | Business logic out of presentation components | **Pass** — role → nav-item filtering is a pure function in `src/components/app-shell/nav-items.ts`, not inlined in `Sidebar` |
| 4. UI Design System | Reproduce `docs/ui/` screenshots; reuse shadcn/ui; Lucide icons | **Pass** — no visual redesign; Administrator screens are pixel-unchanged; Driver's placeholder dashboard reuses the existing driver-area placeholder copy/style (same pattern as `docs/ui/drive-dashboard.png`'s shell, minus the personal-timesheets body which stays out of scope) |
| 5. Responsive Design | Usable at tablet/mobile | **Pass** — no layout structure changes beyond nav item count; existing responsive sidebar behavior is untouched |
| 6. TypeScript Standards | Strict mode; no unjustified `any` | **Pass** — `SessionRole` type reused; new `NavItem.roles` field typed as `SessionRole[]` |
| 7. Data and Persistence | No tenant abstractions; server-side DB access only | **Pass** — no persistence involved |
| 8. Validation and Data Integrity | Server-side validation for untrusted input | **N/A this feature** — no form/mutation input introduced |
| 9. Authentication, Authorization, Security | Server-enforced role checks, not just hidden UI | **Pass** — the core point of FR-006/US3: the nested `(restricted)` layout re-checks role server-side regardless of what the sidebar shows |
| 10. Component and Code Quality | Reuse over duplication; no unrelated refactors | **Pass** — reuses existing `Sidebar`, `TopNav`, `getSessionAccess`; renames/splits only the two functions this feature's spec explicitly requires changing |
| 11. Dependency Discipline | No unnecessary new packages | **Pass** — zero new dependencies |
| 12. User Experience States | Loading/empty/error states present | **Pass** — Driver's minimal dashboard state is itself the defined "empty/placeholder" state (FR-009); no new async loading states introduced |
| 13. Accessibility | Semantic HTML, keyboard access, labels, focus | **Pass** — no new interactive elements beyond existing nav links, which already meet this bar |
| 14. Testing Strategy | Risk-based; required for authz/validation logic | **Pass** — unit tests cover both access-resolution functions and the nav-filtering function (authorization-adjacent) |
| 15. Quality Gates | Lint, typecheck, tests, build must pass | **Pass** — plan includes running `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` before completion |
| 16. AI Agent Discipline | Smallest coherent change; no speculative infra | **Pass** — reorganizes existing routes into one additional nested route group rather than introducing a new abstraction layer; removes the now-dead `/driver` route instead of leaving unreferenced dead code |

No violations requiring justification. Complexity Tracking table intentionally omitted.

**Post-Phase 1 re-check**: research.md and data-model.md introduce no new dependencies or
abstractions beyond the route-group split and the pure nav-filtering function already accounted
for above. The revised `route-access.md` contract keeps both access functions pure and
server-enforced, consistent with Principles 7 and 9. Gate remains **Pass**.

## Project Structure

### Documentation (this feature)

```text
specs/003-role-based-navigation/
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
│   ├── (admin)/
│   │   ├── layout.tsx                 # CHANGED: shared shell for any signed-in role;
│   │   │                              #   role-based nav via getNavItemsForRole; no longer
│   │   │                              #   admin-only
│   │   ├── dashboard/
│   │   │   └── page.tsx               # CHANGED: branches on role — Administrator content
│   │   │                              #   unchanged; Driver gets a minimal placeholder body
│   │   └── (restricted)/              # NEW route group: Administrator-only pages
│   │       ├── layout.tsx             # NEW: re-checks role server-side; redirects
│   │       │                          #   non-Administrators to /dashboard
│   │       ├── timesheets/page.tsx    # MOVED (unchanged content)
│   │       ├── containers/page.tsx    # MOVED (unchanged content)
│   │       ├── drivers/page.tsx       # MOVED (unchanged content)
│   │       ├── reports/page.tsx       # MOVED (unchanged content)
│   │       └── settings/page.tsx      # MOVED (unchanged content)
│   ├── driver/page.tsx                # REMOVED — superseded by /dashboard for all roles
│   ├── layout.tsx                     # Unchanged
│   ├── page.tsx                       # CHANGED: any signed-in user → /dashboard (no role branch)
│   └── sign-in/[[...rest]]/page.tsx   # Unchanged
├── components/
│   └── app-shell/
│       ├── sidebar.tsx                # CHANGED: accepts a `navItems` prop instead of importing
│       │                              #   the static list directly
│       ├── top-nav.tsx                # Unchanged
│       └── nav-items.ts               # CHANGED: adds `roles` per item + getNavItemsForRole()
├── proxy.ts                           # CHANGED: uses resolveDashboardAccess (sign-in check
│                                      #   only) for the shared matcher; role narrowing moves to
│                                      #   the (restricted) layout
└── lib/
    └── auth/
        ├── route-access.ts            # CHANGED: split into resolveDashboardAccess (signed-in
        │                              #   check, used by proxy.ts + the shared shell layout) and
        │                              #   resolveAdminOnlyAccess (role check, used by the
        │                              #   (restricted) layout); removes "driver-area" outcome
        └── get-session-access.ts      # CHANGED: returns raw session data (isSignedIn, role,
                                       #   user, redirectToSignIn) instead of a pre-resolved
                                       #   outcome, so each layout can call the access function
                                       #   appropriate to what it guards

tests/
└── unit/
    ├── route-access.test.ts           # CHANGED: tests both resolveDashboardAccess and
    │                                  #   resolveAdminOnlyAccess
    └── nav-items.test.ts              # NEW: tests getNavItemsForRole for both roles and the
                                       #   fail-closed (missing/unrecognized role) case
```

**Structure Decision**: Single Next.js App Router project, no new top-level structure. The
Administrator-only pages move one level deeper into a nested `(restricted)` route group inside
the existing `(admin)` group — Next.js route groups don't affect URLs, so `/timesheets`,
`/containers`, `/drivers`, `/reports`, and `/settings` keep their existing paths. This keeps the
"shared authenticated shell" (sidebar/top nav, any role) and "Administrator-only content" guards
as two independent, composable layout checks — exactly the "defense in depth, two layers"
pattern the existing `route-access.md` contract already established for sign-in vs. role checks,
just applied one level further down for the narrower admin-only case. The now-unreachable
`src/app/driver/page.tsx` is deleted rather than left as dead code, per the constitution's
AI Agent Discipline principle.
