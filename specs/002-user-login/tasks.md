---

description: "Task list template for feature implementation"
---

# Tasks: User Login

**Input**: Design documents from `/specs/002-user-login/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not included. Per research.md #4, this feature introduces no branching business logic worth unit-testing in isolation (a single non-branching `auth()` check that cannot be meaningfully tested outside Next.js's request lifecycle), and the feature specification does not request a TDD approach. Verification is via the manual scenarios in `quickstart.md` (Phase 3 checkpoint and Polish phase below).

**Organization**: This feature has a single user story (US1, P1), so all implementation tasks live in one phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

## Path Conventions

Single Next.js project under `src/`, per plan.md's Project Structure.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configure the environment so Clerk's existing `redirectToSignIn()` call sites (from `001-admin-dashboard`) land on this feature's new page instead of Clerk's hosted Account Portal (research.md #1).

- [X] T001 [P] Document `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` with an explanatory comment in `.env.local.example`, following the existing comment style used for `publicMetadata.role` (FR-001, FR-004, FR-005)
- [X] T002 [P] Set `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` in the local `.env` file so `redirectToSignIn()` and manual testing (quickstart.md) resolve to this feature's page (FR-001, FR-004, FR-005)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

No new foundational work is required. `ClerkProvider` (`src/app/layout.tsx`), Clerk-based route protection (`src/proxy.ts`), and the role-access helpers (`src/lib/auth/route-access.ts`, `src/lib/auth/get-session-access.ts`) already exist from `001-admin-dashboard` and are reused unchanged (plan.md Project Structure; Constitution Principle 16 — no unrelated refactors).

**Checkpoint**: Foundation already in place — proceed directly to User Story 1.

---

## Phase 3: User Story 1 - Secure Sign-In (Priority: P1) 🎯 MVP

**Goal**: A registered user can reach `/sign-in`, authenticate with Clerk (email + password), and land on `/dashboard`; unauthenticated visitors are kept off protected pages; an already-authenticated visitor who navigates to `/sign-in` is bounced straight to `/dashboard`.

**Independent Test**: Follow `quickstart.md` Scenarios 1–5 end-to-end: successful login → `/dashboard`; invalid credentials → stays on `/sign-in` with an error; unauthenticated deep link → redirected to `/sign-in`; already-authenticated visit to `/sign-in` → redirected to `/dashboard`; page remains usable at desktop/tablet/mobile widths.

### Implementation for User Story 1

- [X] T003 [US1] Create `src/app/sign-in/page.tsx` as an async Server Component: call Clerk's `auth()` from `@clerk/nextjs/server`, and if `userId` is present, `redirect("/dashboard")` before rendering anything else (FR-003, FR-005, FR-012; research.md #2 — do not use `resolveRouteAccess`/`getSessionAccess` here, since this redirect must be role-agnostic)
- [X] T004 [US1] In `src/app/sign-in/page.tsx`, render the company logo via `next/image` pointing at `/images/logo.png` with descriptive alt text, above a heading, inside a centered page layout (FR-008)
- [X] T005 [US1] In `src/app/sign-in/page.tsx`, render Clerk's `<SignIn/>` component below the logo/heading, passing its redirect prop (e.g. `fallbackRedirectUrl="/dashboard"`) so successful authentication always lands on `/dashboard`; which sign-in strategies appear is controlled by the Clerk instance's Dashboard configuration (research.md #3), not by props on this component, so no code-level restriction is needed here (FR-002, FR-003, FR-006, FR-007, FR-013)
- [X] T006 [US1] Wrap the logo, heading, and `<SignIn/>` in a shadcn/ui `Card` (`@/components/ui/card`) styled with the project's existing Tailwind design tokens (colors, radii, typography from `src/app/globals.css`), centered vertically and horizontally, matching the app's simple/modern/professional visual language (FR-009)
- [X] T007 [US1] Adjust the sign-in page layout (`src/app/sign-in/page.tsx`) so the card, logo, and form reflow correctly at common desktop, tablet, and mobile widths with no clipping, overflow, or horizontal scrolling (FR-010, SC-005)
- [X] T008 [US1] Verify keyboard tab order and visible focus states through the logo/heading and into the `<SignIn/>` form fields, and confirm the logo image has non-empty, descriptive alt text (FR-011)
- [X] T009 [US1] Add a comment to `.env.local.example` documenting that the Clerk instance must have the Email address + Password strategy enabled for this environment, matching the existing `publicMetadata.role` comment pattern (FR-013; research.md #3 — this is Clerk Dashboard configuration, not application code)

**Checkpoint**: At this point, User Story 1 is fully functional and independently testable — every acceptance scenario and success criterion in `spec.md` is verifiable via `quickstart.md`.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across the whole feature

- [ ] T010 Run every scenario in `quickstart.md` (Scenarios 1–5, the accessibility spot-check, and the unreachable-provider edge case) end-to-end against a local dev server
- [X] T011 [P] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`, and fix any issues introduced by this feature (Constitution Principle 15 — Quality Gates)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: No tasks; already satisfied by `001-admin-dashboard`
- **User Story 1 (Phase 3)**: Depends on Setup (T001–T002) being done first so the sign-in URL resolves correctly during manual verification; T003 must land before T004–T009 since they all edit the same file sequentially
- **Polish (Phase 4)**: Depends on Phase 3 being complete

### Within User Story 1

- T003 (the redirect-if-signed-in check) should exist before T004–T007 build out the rendered markup, so the page's early-return guard is in place first
- T004 → T005 → T006 → T007 → T008 all edit `src/app/sign-in/page.tsx` and must be done sequentially (no `[P]`)
- T009 (env file comment) can be done any time after T005, since it documents a requirement T005's `<SignIn/>` usage depends on

### Parallel Opportunities

- T001 and T002 (Setup) touch different files and can run in parallel
- T011 (quality gates) can run in parallel with nothing else in this feature — it's the last task and depends on everything before it

---

## Parallel Example: Setup

```bash
# Launch both Setup tasks together:
Task: "Document NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in in .env.local.example"
Task: "Set NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in in local .env"
```

---

## Implementation Strategy

### MVP First (and Only) Scope

This feature has one user story, so the MVP **is** the full feature:

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational — nothing to do, already satisfied
3. Complete Phase 3: User Story 1 (T003–T009)
4. **STOP and VALIDATE**: Run Phase 4 (T010–T011)
5. Deploy/demo

### Incremental Delivery

Not applicable beyond the single story above — there is no P2/P3 story to layer on for this feature.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test tasks are included — see the **Tests** note at the top of this file and research.md #4
- Commit after each task or logical group
- Stop at the Phase 3 checkpoint to validate the story independently before Polish
- Avoid: vague tasks, same-file conflicts (T004–T008 are intentionally sequential, not parallel)
