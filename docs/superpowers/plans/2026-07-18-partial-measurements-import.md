# Partial Measurements Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve ten historical child measurements, including rows where weight was not measured and one two-decimal weight value.

**Architecture:** Extend the measurement domain so each record requires at least one metric and stores a missing metric as `null`. Summaries select independent height and weight histories; the existing SVG charts already filter non-numeric values. Deploy before importing through the server's serialized atomic collection updater.

**Tech Stack:** Node ESM, Fastify, JSON atomic storage, React, SVG, node:test, Vitest.

## Global Constraints

- Do not invent values for missing weights.
- Height accepts at most one decimal; weight accepts at most two decimals.
- Keep one record per child and date.
- Import must be idempotent and must not touch `events.json`.

---

### Task 1: Partial measurement domain

**Files:** Modify `server/src/domain/measurements.js`, `server/test/measurements.test.js`, `server/src/routes/parent.routes.js`, and `server/test/routes.test.js`.

- [x] Write failing tests for height-only, weight-only, empty rejection, two-decimal weight, and independent metric summaries.
- [x] Normalize missing values to `null`, reject records where both metrics are absent, and calculate each metric from its own valid history.
- [x] Verify partial records through guarded parent and child routes.

### Task 2: Partial measurement UI

**Files:** Modify `web/src/pages/ParentMeasurements.jsx`, `web/src/components/MeasurementsView.jsx`, and their Vitest files.

- [x] Write failing tests for submitting one metric and rendering missing values as `未测`.
- [x] Remove per-field required constraints, retain the at-least-one check, use `step="0.01"` for weight, and keep blank edits blank.
- [x] Render metric summaries independently and omit missing metric points from charts.

### Task 3: Release and import

**Files:** Modify `README.md` and the design specification; remote `measurements.json` only through `updateCollection`.

- [x] Run all tests, build, and `git diff --check`.
- [x] Deploy with the safe deployment script and verify existing data hashes.
- [x] Back up `measurements.json`, atomically upsert the ten supplied rows, and verify per-child dates and values.
- [x] Commit and push to `origin/main`.
