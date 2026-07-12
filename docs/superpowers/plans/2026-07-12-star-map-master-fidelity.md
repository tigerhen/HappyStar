# Star Map Master Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `star-map-skin-v5.html` closer to `docs/prototypes/reference/star-map-target.png` at 1618x980 while preserving the later-approved task count badges and widened right panel.

**Architecture:** Keep the prototype self-contained. Adjust CSS geometry and materials, then update the existing SVG radar and route coordinates so lines remain attached to the repositioned nodes. Validate with a same-size headless-browser screenshot rather than application unit tests because this change affects only a static visual prototype.

**Tech Stack:** HTML, CSS, inline SVG, vanilla JavaScript, Chromium screenshot validation.

## Global Constraints

- Modify only the prototype and this implementation record.
- Keep the 312px right panel and task total badges.
- Do not introduce image assets, UI libraries, or runtime dependencies.
- Use `docs/prototypes/reference/star-map-target.png` as the visual source of truth.

---

### Task 1: Rebalance the star map composition

**Files:**
- Modify: `docs/prototypes/star-map-skin-v5.html`

**Interfaces:**
- Consumes: existing `.star-map`, `.task`, `.reward`, `.energy-core`, `.routes`, and `.radar-rings` elements.
- Produces: a left-shifted, higher energy core with task and reward nodes distributed like the master image.

- [ ] Move the energy core to 45%/45% and increase its visual diameter.
- [ ] Reposition task nodes to 8%, 30%, 52%, and 73% vertically.
- [ ] Reposition reward nodes to 9%, 35%, and 61% vertically and expand them to the right.
- [ ] Update SVG radar centers, curves, beads, and endpoints to match the new node centers.
- [ ] Capture a 1618x980 screenshot and verify that no route floats away from a card or orb.

### Task 2: Match the master image materials

**Files:**
- Modify: `docs/prototypes/star-map-skin-v5.html`

**Interfaces:**
- Consumes: current CSS-only starfield, core, task orb, reward planet, and glass-card layers.
- Produces: darker neutral space, concentrated gold core lighting, and neutral glass cards.

- [ ] Reduce large cyan and purple background washes and add finer star detail.
- [ ] Replace the pale core fill with dark amber glass and a defined left rim highlight.
- [ ] Remove the bright task-orb backing while retaining the card-masking layer.
- [ ] Neutralize reward-card purple slabs while keeping planet-originated purple light.
- [ ] Tighten planet and task-orb glows so edges remain readable.

### Task 3: Restore the bottom command bar hierarchy

**Files:**
- Modify: `docs/prototypes/star-map-skin-v5.html`

**Interfaces:**
- Consumes: `.command`, `.mascot`, and `.send`.
- Produces: an approximately 870px glass command bar with a 96px mascot and 58px send control at desktop size.

- [ ] Increase desktop command width and height without changing compact-height overrides.
- [ ] Enlarge and flatten the mascot glass disc and send-button glass treatment.
- [ ] Increase the parent-management quick action height to recover the master image's vertical breathing room.
- [ ] Verify the command bar does not overlap either side panel at 1618x980.

### Task 4: Visual and source verification

**Files:**
- Verify: `docs/prototypes/star-map-skin-v5.html`

**Interfaces:**
- Consumes: final prototype HTML.
- Produces: clean source and a same-size visual acceptance screenshot.

- [ ] Run `git diff --check` and expect no whitespace errors.
- [ ] Open the prototype through a local static server and capture 1618x980.
- [ ] Check browser console errors and expect none.
- [ ] Compare the screenshot to `star-map-target.png`, correcting any overlap, clipping, or detached route.
