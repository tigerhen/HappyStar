# Star Map V5 Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `docs/prototypes/star-map-skin-v5.html` from V4 and fix the specific visual review points: line anchors, center brightness, task count rings, bottom mascot/button glass, and primary orb icons.

**Architecture:** V5 remains a standalone HTML prototype beside V4. It reuses V4 layout and existing child avatars, then improves CSS/SVG material detail and geometry without touching production React/Fastify code.

**Tech Stack:** HTML5, CSS gradients, inline SVG, vanilla JavaScript, local browser screenshot verification.

## Global Constraints

- Do not modify `web/src/`, `server/src/`, `data/`, or deployment files.
- Do not submit `data/`.
- Keep the existing child avatar style; do not generate or replace child avatars in this pass.
- Do not use the target PNG as a page background.
- Do not introduce WebGL, Three.js, external CDNs, or heavy UI libraries.
- Keep V4 unchanged for comparison.
- V5 must work at 1280x720 without panel or command-bar clipping.

---

## File Structure

- Create: `docs/prototypes/star-map-skin-v5.html`
  - Copy of V4 with targeted visual polish.
- Modify: none outside V5 and this plan.

---

### Task 1: Create V5 From V4

**Files:**
- Create: `docs/prototypes/star-map-skin-v5.html`

**Interfaces:**
- Consumes: `docs/prototypes/star-map-skin-v4.html`
- Produces: V5 prototype preserving V4 interactions

- [ ] **Step 1: Copy V4 to V5**

Run:

```powershell
Copy-Item docs\prototypes\star-map-skin-v4.html docs\prototypes\star-map-skin-v5.html
```

Expected:

- `docs/prototypes/star-map-skin-v5.html` exists.

- [ ] **Step 2: Rename title**

Change the title text and any visible version comments from `V4` to `V5`.

---

### Task 2: Fix Geometry and Center Core

**Files:**
- Modify: `docs/prototypes/star-map-skin-v5.html`

**Interfaces:**
- Consumes: `.routes`, `.energy-core`, `#line-help`
- Produces: centered route anchors and calmer center brightness

- [ ] **Step 1: Align route paths**

All primary route paths must start from the same visual anchor at `M500 310`, matching the center of the energy core in the SVG coordinate system.

Expected:

- Task and reward lines visually meet the center core, not card edges or off-center points.

- [ ] **Step 2: Lower center brightness**

Tune `.energy-core`, `.core-star`, `.core-title`, and `.core-score` so text remains readable and the center is warm gold rather than a white flare.

Expected:

- `幸运星能量` and `380 ⭐` are clearly readable in the screenshot.

---

### Task 3: Improve Task Orbs and Reward Icons

**Files:**
- Modify: `docs/prototypes/star-map-skin-v5.html`

**Interfaces:**
- Consumes: `.task-orb`, `.orb-icon`, `.reward-planet`, `.planet-icon`
- Produces: count ring display and richer filled icons

- [ ] **Step 1: Add task count chips on task orb rings**

Each `.task-orb` must include:

```html
<span class="orb-count">1/1</span>
```

or matching counts (`2/2`, `1/2`).

- [ ] **Step 2: Style `.orb-count`**

The count chip must sit on the outside ring, not inside the task text card. It should be small, glassy, and readable.

- [ ] **Step 3: Replace primary task and reward SVG details**

Improve icon SVGs with filled surfaces, highlights, and shadows:

- homework: open book with pink page shadows
- read: blue book with bookmark
- clean: broom with warm bristles
- help: glossy heart
- coins: coin with embossed symbol
- book reward: purple-blue book with page shine
- day reward: golden filled star

---

### Task 4: Polish Bottom Command Bar

**Files:**
- Modify: `docs/prototypes/star-map-skin-v5.html`

**Interfaces:**
- Consumes: `.command`, `.mascot`, `.send`
- Produces: mascot and send button closer to the visual mother image

- [ ] **Step 1: Improve mascot star**

The mascot should be a cute gold star with face, highlights, and small spark marks, not a plain star glyph.

- [ ] **Step 2: Improve send button glass**

`.send` must have layered glass: translucent lavender fill, white rim highlight, inner shadow, and blue-purple outer glow.

- [ ] **Step 3: Improve slogan spark**

Add one small decorative sparkle at the left of the slogan text and keep `越努力，越幸运 ✨` readable.

---

### Task 5: Verify and Commit

**Files:**
- Read: `docs/prototypes/star-map-skin-v5.html`

**Interfaces:**
- Consumes: complete V5 prototype
- Produces: committed V5 prototype and verification notes

- [ ] **Step 1: Static checks**

Run:

```powershell
Select-String -Path docs\prototypes\star-map-skin-v5.html -Pattern 'Control AI|Fuselab|TODO|TBD|lorem|http'
git diff --check
```

Expected:

- No `Select-String` output.
- `git diff --check` exits 0.

- [ ] **Step 2: Browser checks**

Serve the repo locally and open `docs/prototypes/star-map-skin-v5.html`.

Verify:

- console error count is 0
- 1280x720 screenshot has no clipping
- center text is readable
- route lines connect to the energy core center
- task orb count chips are visible
- help task click updates score to `383`, shows `+3 ⭐`, and toast
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
git add docs/prototypes/star-map-skin-v5.html docs/superpowers/plans/2026-07-07-star-map-v5-polish.md
git commit -m "proto: 星图皮肤 V5 视觉精修"
```
