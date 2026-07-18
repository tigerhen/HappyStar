# Parent Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the approved illustrated couple portrait as the parent identity on both stages of the login flow.

**Architecture:** Add one optimized static PNG under the existing avatar directory and pass its public path through the existing `Avatar` component. Keep the emoji fallback and avoid changes outside `Login.jsx`.

**Tech Stack:** React, Vite public assets, Vitest, Testing Library, PNG.

## Global Constraints

- The final asset is `web/public/avatars/parents.png` at 512px square.
- Only the parent login selection card and PIN entry screen change.
- `👪` remains the fallback.
- Existing child avatars and the parent administration header remain unchanged.

---

### Task 1: Parent Login Avatar

**Files:**
- Create: `web/public/avatars/parents.png`
- Create: `web/test/Login.test.jsx`
- Modify: `web/src/pages/Login.jsx`

**Interfaces:**
- Consumes: `Avatar({ avatar, emoji, size })` and the Vite public path `/avatars/parents.png`.
- Produces: a parent selection object with `avatar: "/avatars/parents.png"` and `emoji: "👪"`.

- [x] Add a failing component test that clicks the parent card and verifies `/avatars/parents.png` appears before and after selection.
- [x] Resize the approved source portrait to a 512px square PNG under `web/public/avatars/parents.png`.
- [x] Pass the parent avatar path through the existing parent selection object and render it with `Avatar` on the card.
- [x] Run `npm --prefix web test`, `npm run build`, and `git diff --check`.
- [x] Inspect desktop and mobile login screenshots for crop, spacing, and image loading.
- [x] Deploy, verify the service, commit, and push to `origin/main`.
