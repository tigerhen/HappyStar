# Growth Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable growth plans with the two 2026 summer plans as the first data set.

**Architecture:** Store plans in one atomically-written JSON collection. Keep progress calculations and mutations in pure domain functions, expose child-scoped and parent-scoped Fastify routes, then add lightweight React list/detail and administration views.

**Tech Stack:** Node ESM, Fastify, JSON atomic storage, React 18, Vite, node:test, Vitest.

## Global Constraints

- Progress changes never write point events.
- Child APIs are scoped to the authenticated child; parent APIs require `requireParent`.
- Required completion excludes optional items and clamps progress to each target.
- Existing `data/` is never replaced; seed only when `growth-plans.json` is absent.
- Keep `--bg: #f3f3f0`; yellow is an action/completion accent only.

---

### Task 1: Growth-plan domain

**Files:** Create `server/src/domain/growth-plans.js`; test `server/test/growth-plans.test.js`.

**Interfaces:** Produces `summarizePlan(plan)`, `changeItemProgress(plan,itemId,delta)`, and `setDeliverable(plan,itemId,done)`.

- [ ] Write failing tests for weighted required completion, optional exclusion, clamping, missing items, and immutable updates.
- [ ] Run `node --test server/test/growth-plans.test.js` and confirm missing-module failure.
- [ ] Implement the three pure functions with integer validation.
- [ ] Run the focused test and confirm all cases pass.

### Task 2: Storage seed and APIs

**Files:** Modify `server/src/seed.js`, `server/src/routes/child.routes.js`, `server/src/routes/parent.routes.js`; modify `server/test/routes.test.js`.

**Interfaces:** Child GET list/detail and PATCH progress/deliverable; parent CRUD plus PATCH progress/deliverable.

- [ ] Add route tests proving child scoping, parent access, progress persistence, bounds, and no point-event creation.
- [ ] Run `npm --prefix server test` and confirm the new route assertions fail.
- [ ] Seed both summer plans only when the collection is missing and implement guarded routes.
- [ ] Run `npm --prefix server test` and confirm the complete backend suite passes.

### Task 3: Child plan experience

**Files:** Create `web/src/pages/GrowthPlansTab.jsx`, `web/src/components/GrowthPlanDetail.jsx`, `web/src/components/GrowthPlanDetail.test.jsx`; modify `web/src/pages/ChildHome.jsx`, `web/src/api.js`, `web/src/theme.css`.

**Interfaces:** Consumes child plan APIs; renders plan summary, grouped items, counters and deliverables.

- [ ] Add failing component tests for percentage, optional label, increment callback, and deliverable toggle.
- [ ] Run `npm --prefix web test` and confirm the component test fails.
- [ ] Implement the Plan tab and responsive detail UI based on `docs/prototypes/growth-plan-progress.html`.
- [ ] Run focused and full web tests, then `npm run build`.

### Task 4: Parent plan management

**Files:** Create `web/src/pages/ParentGrowthPlans.jsx`; modify `web/src/pages/ParentHome.jsx`, `web/src/api.js`, `web/src/theme.css`.

**Interfaces:** Consumes parent list/create/update/delete and progress APIs.

- [ ] Add a parent section for selecting a child/plan, editing plan metadata, adjusting progress and toggling deliverables.
- [ ] Support creating a blank reusable plan and deleting only after browser confirmation.
- [ ] Run `npm --prefix web test` and `npm run build`.

### Task 5: Documentation and acceptance

**Files:** Modify `README.md`; verify all files above.

- [ ] Document `growth-plans.json`, backup behavior, permissions and the summer-plan seed behavior.
- [ ] Run `npm test`, `npm run build`, and `git diff --check`.
- [ ] Start with isolated `HAPPY_STAR_DATA`, inspect both child and parent views at mobile and landscape widths, and verify progress persists after restart.

### Task 6: Time-weighted final settlement

**Files:** Modify `server/src/domain/growth-plans.js`, `server/src/routes/parent.routes.js`, `server/src/routes/child.routes.js`, `server/src/summer-plans.js`, `server/test/growth-plans.test.js`, `server/test/routes.test.js`, `web/src/components/GrowthPlanDetail.jsx`, `web/src/pages/ParentGrowthPlans.jsx`, `web/src/theme.css`, and `README.md`.

**Interfaces:** Produces `settlementPreview(plan)` and parent `POST /api/admin/growth-plans/:id/settle`.

- [ ] Write failing domain tests for unit-weighted completion, uniform/deadline schedules, the four coefficients, legacy undated progress, completion timestamps and integer settlement.
- [ ] Implement timestamped progress and pure settlement preview calculation.
- [ ] Write failing route tests for incomplete rejection, one positive event, balance increase, settled locking and duplicate rejection.
- [ ] Implement parent-only settlement with one atomic write per affected collection and child read-only settlement status.
- [ ] Show current estimated points in both views and the confirmation breakdown/button only to parents when complete.
- [ ] Run `npm test`, `npm run build`, `git diff --check`, then verify settlement in an isolated browser session.
