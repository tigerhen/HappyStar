# Body Measurements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add parent-managed height and weight records with child-scoped read-only trend pages and a three-month measurement reminder.

**Architecture:** Store records in one atomically-written JSON collection. Put validation, sorting, summary, and calendar-month recommendation logic in pure domain functions; expose guarded Fastify routes; render two dependency-free responsive SVG charts in React.

**Tech Stack:** Node ESM, Fastify, JSON atomic storage, React 18, SVG, node:test, Vitest.

## Global Constraints

- Children can only read records whose `childId` matches their session.
- Only parents can create, update, or delete measurements.
- Dates use `YYYY-MM-DD`; height and weight are positive numbers with at most one decimal place.
- Same child and date must be unique.
- Existing data and point events are never modified by this feature.
- Keep the neutral page background and existing child theme colors.

---

### Task 1: Measurement domain

**Files:** Create `server/src/domain/measurements.js`; test `server/test/measurements.test.js`.

**Interfaces:** Produces `validateMeasurement(input)`, `measurementSummary(records,today)`, and `sortMeasurements(records)`.

- [x] Write failing tests for value precision, date validation, sorting, latest deltas, empty state, and adding three calendar months.
- [x] Run the focused test and confirm the missing module failure.
- [x] Implement pure functions and rerun until all focused tests pass.

### Task 2: Guarded APIs and storage

**Files:** Modify `server/src/paths.js`, `server/src/seed.js`, `server/src/routes/child.routes.js`, `server/src/routes/parent.routes.js`, and `server/test/routes.test.js`.

**Interfaces:** Child GET `/api/measurements`; parent GET/POST/PUT/DELETE `/api/admin/measurements`.

- [x] Add failing route tests for child scoping, parent CRUD, duplicate date rejection, and child write rejection.
- [x] Seed an empty collection only when the file is absent and implement guarded routes using atomic writes.
- [x] Run the full backend suite.

### Task 3: Trend UI

**Files:** Create `web/src/components/MeasurementChart.jsx`, `web/src/components/MeasurementChart.test.jsx`, `web/src/pages/MeasurementsPage.jsx`, and `web/src/pages/ParentMeasurements.jsx`; modify `web/src/api.js`, `web/src/pages/ChildHome.jsx`, `web/src/pages/ParentHome.jsx`, and `web/src/theme.css`.

**Interfaces:** Reusable chart consumes sorted `{date,value}` points; child page is read-only; parent page adds inline CRUD controls.

- [x] Write failing component tests for empty, one-point, and multi-point SVG output.
- [x] Implement stable SVG dimensions, point labels, height/weight cards, reminder, and responsive vertical/horizontal layout.
- [x] Implement parent child-switch, form validation, edit and delete confirmation.
- [x] Run web tests and production build.

### Task 4: Acceptance and release

**Files:** Modify `README.md` and `AGENTS.md`.

- [x] Document the new collection, permissions, units, and reminder rule.
- [x] Run the full server and web test suites, `npm run build`, and `git diff --check`.
- [x] Verify child and parent flows at mobile and landscape widths using isolated data.
- [x] Deploy with the safe deployment script and verify the remote service, data file, and pre-deploy data hashes.
