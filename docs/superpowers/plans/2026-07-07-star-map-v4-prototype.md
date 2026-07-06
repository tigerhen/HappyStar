# Star Map V4 Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a V4 star-map HTML prototype that follows `docs/prototypes/reference/star-map-target.png` as the visual mother image and improves material detail beyond V3.

**Architecture:** Keep V4 as one standalone prototype file with embedded CSS, inline SVG icons, and vanilla JavaScript interactions. Do not modify production React/Fastify code. Preserve V3 for comparison and create V4 beside it.

**Tech Stack:** HTML5, CSS custom properties, CSS gradients, inline SVG, vanilla JavaScript, local static browser verification.

## Global Constraints

- Do not modify `web/src/`, `server/src/`, `data/`, or deployment files.
- Do not submit `data/`.
- Do not use Docker, databases, WebGL, Three.js, external CDNs, or heavy UI libraries.
- Do not use the target PNG as a page background; it is a reference only.
- V4 must preserve Happy Star semantics: tasks, rewards, points, ETA, parent capacity and admin controls.
- V4 must work at 1280x720 without right-panel or command-bar clipping.
- V4 interactions must include task completion and reward click feedback.

---

## File Structure

- Create: `docs/prototypes/reference/star-map-target.png`
  - Visual mother image used for review only.
- Create: `docs/superpowers/specs/2026-07-07-star-map-v4-visual-contract.md`
  - V4 visual contract and acceptance checklist.
- Create: `docs/prototypes/star-map-skin-v4.html`
  - Standalone high-fidelity prototype.
- Read-only comparison: `docs/prototypes/star-map-skin-v3.html`

---

### Task 1: Reference and Visual Contract

**Files:**
- Create: `docs/prototypes/reference/star-map-target.png`
- Create: `docs/superpowers/specs/2026-07-07-star-map-v4-visual-contract.md`

**Interfaces:**
- Consumes: generated image at `C:\Users\Administrator\.codex\generated_images\019f378b-9052-7950-99ac-592d2c29184a\ig_04bf0438e0937f3e016a4bb0868e0c8191a707f5df23c7866f.png`
- Produces: stable repository reference image and visual acceptance contract

- [x] **Step 1: Copy the generated target image**

Run:

```powershell
New-Item -ItemType Directory -Force docs\prototypes\reference | Out-Null
Copy-Item -LiteralPath 'C:\Users\Administrator\.codex\generated_images\019f378b-9052-7950-99ac-592d2c29184a\ig_04bf0438e0937f3e016a4bb0868e0c8191a707f5df23c7866f.png' -Destination 'docs\prototypes\reference\star-map-target.png' -Force
```

Expected:

- `docs/prototypes/reference/star-map-target.png` exists.
- Image dimensions are `1610 x 977`.

- [x] **Step 2: Write the visual contract**

Write `docs/superpowers/specs/2026-07-07-star-map-v4-visual-contract.md` with sections for:

- Background
- Task orb material
- Reward planet material
- Energy core
- Panels and navigation
- Required interactions
- Verification commands

- [ ] **Step 3: Verify reference and contract**

Run:

```powershell
Get-Item docs\prototypes\reference\star-map-target.png
Select-String -Path docs\superpowers\specs\2026-07-07-star-map-v4-visual-contract.md -Pattern 'TODO|TBD'
```

Expected:

- Image exists.
- `Select-String` returns no output.

---

### Task 2: Build the V4 Prototype Shell

**Files:**
- Create: `docs/prototypes/star-map-skin-v4.html`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-07-star-map-v4-visual-contract.md`
- Produces: static V4 prototype with top nav, left panels, central star map, right panels, command bar

- [ ] **Step 1: Create standalone HTML**

Create `docs/prototypes/star-map-skin-v4.html` with:

- `<title>Happy Star 幸运星图皮肤 V4</title>`
- CSS variables for gold, pink, blue, mint, purple, panel glass and background
- `.screen`, `.top-nav`, `.brand`, `.left-panel`, `.right-panel`, `.main`, `.command`
- Inline SVG star logo
- Static Happy Star mock data in HTML

- [ ] **Step 2: Add starfield material layers**

Add CSS layers:

- `body` dark gradient
- `.space-dust` for dense tiny stars
- `.constellation-bg` for low-opacity decorative star lines
- `.nebula` for central teal mist
- `.radar-rings` for gold rings around the energy core

- [ ] **Step 3: Add responsive short-height rules**

Add `@media (max-height: 760px) and (min-width: 1201px)` to reduce card padding, orb sizes and hide nonessential footer decorations.

Expected:

- 1280x720 viewport does not clip the right panel or command bar.

---

### Task 3: Add Custom SVG Orbs and Planets

**Files:**
- Modify: `docs/prototypes/star-map-skin-v4.html`

**Interfaces:**
- Consumes: shell from Task 2
- Produces: `.task-orb`, `.reward-planet`, `.energy-core`, inline SVG icons

- [ ] **Step 1: Add task orb structure**

Each task must use:

```html
<button class="task-orb" aria-label="完成作业">
  <span class="orb-ring"></span>
  <span class="orb-glass">
    <svg class="orb-icon" viewBox="0 0 64 64" aria-hidden="true">...</svg>
  </span>
  <span class="done-badge">✓</span>
</button>
```

Expected task classes:

- `.homework` uses pink
- `.read` uses blue
- `.clean` uses mint
- `.help` uses purple

- [ ] **Step 2: Add reward planet structure**

Each reward must use:

```html
<div class="reward-planet" aria-hidden="true">
  <span class="ring ring-back"></span>
  <span class="planet-body">
    <svg class="planet-icon" viewBox="0 0 64 64">...</svg>
  </span>
  <span class="ring ring-front"></span>
</div>
```

Expected rewards:

- 蛋币 uses coin/dollar-like icon
- 书籍 uses book icon
- 自由活动日 uses star icon

- [ ] **Step 3: Replace emoji-driven main visuals**

Use SVG icons for primary task and reward visuals. Emoji may remain only for minor decorative labels such as `🔥` or `✨`.

---

### Task 4: Add Interactions

**Files:**
- Modify: `docs/prototypes/star-map-skin-v4.html`

**Interfaces:**
- Consumes: `#score`, `.task.help`, `.reward.coins`, `#line-help`, toast container behavior
- Produces: task completion animation and reward toast behavior

- [ ] **Step 1: Implement toast and floating score**

Add functions:

```js
function toast(text) { ... }
function floatText(text, target) { ... }
function pulseLine(id) { ... }
```

- [ ] **Step 2: Implement help task click**

Clicking `.task.help` must:

- increase score from `380` to `383`
- add `.done` class
- add a `.done-badge` if missing
- trigger `#line-help` animation
- show `+3 ⭐`
- show toast `帮助他人 已点亮`

- [ ] **Step 3: Implement reward click**

Clicking `.reward.coins` must:

- add `.pulse` class to the planet
- show toast `蛋币：480 ⭐，预计到手 3.7 周`

---

### Task 5: Verify and Commit

**Files:**
- Read: `docs/prototypes/star-map-skin-v4.html`
- Read: `docs/prototypes/reference/star-map-target.png`

**Interfaces:**
- Consumes: complete V4 prototype
- Produces: committed V4 prototype and verification notes

- [ ] **Step 1: Static checks**

Run:

```powershell
Select-String -Path docs\prototypes\star-map-skin-v4.html -Pattern 'Control AI|Fuselab|TODO|TBD|lorem|http'
git diff --check
```

Expected:

- No `Select-String` output.
- `git diff --check` exits 0.

- [ ] **Step 2: Browser checks**

Serve the repo locally, open `docs/prototypes/star-map-skin-v4.html`, and verify:

- console error count is 0
- screenshot at 1280x720 shows no clipped right panel or command bar
- help task click updates score and shows floating text
- coins reward click shows ETA toast

- [ ] **Step 3: Project tests**

Run:

```powershell
npm test
```

Expected:

- Backend node tests pass.
- Web vitest tests pass.

- [ ] **Step 4: Commit**

Run:

```powershell
git add docs/prototypes/reference/star-map-target.png docs/superpowers/specs/2026-07-07-star-map-v4-visual-contract.md docs/superpowers/plans/2026-07-07-star-map-v4-prototype.md docs/prototypes/star-map-skin-v4.html
git commit -m "proto: 星图皮肤 V4 视觉母版原型"
```

---

## Self-Review

Spec coverage:

- Reference mother image: Task 1.
- Background material: Task 2.
- Task orb material: Task 3.
- Reward planet material: Task 3.
- Center energy core and rings: Task 2 and Task 3.
- Required interactions: Task 4.
- Static, browser and project verification: Task 5.

Placeholder scan:

- No `TODO`, `TBD`, or unspecified implementation step is intentionally left.

Type consistency:

- JS functions are `toast(text)`, `floatText(text, target)`, `pulseLine(id)`.
- Required selectors are `#score`, `.task.help`, `.reward.coins`, `#line-help`.
