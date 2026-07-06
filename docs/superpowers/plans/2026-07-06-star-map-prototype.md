# Star Map Skin Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-fidelity, clickable HTML prototype for the Lucky Star Map skin at `docs/prototypes/star-map-skin.html`, before touching production app code.

**Architecture:** One standalone UTF-8 HTML file with embedded CSS and vanilla JavaScript. It uses simulated data only, exposes multiple views through in-page tabs, and acts as a visual contract for the later React implementation.

**Tech Stack:** HTML5, CSS custom properties, CSS animations, inline SVG/DOM nodes, vanilla JavaScript. No build step, no npm dependency, no backend API.

## Global Constraints

- The prototype must be saved at `docs/prototypes/star-map-skin.html`.
- Do not modify production files under `web/src/`, `server/src/`, or `data/`.
- Do not use third-party UI libraries, canvas libraries, Three.js, WebGL, Material UI, Ant Design, Mantine, Chakra, or external CDNs.
- The prototype must be original and must not copy reference brand names, logos, exact layout, or third-party text.
- Preserve Happy Star semantics: tasks, rewards, energy/points, capacity ETA, and parent edit workflows.
- The prototype is a visual contract: implementation may later simplify internals, but should visually match this file.
- Use UTF-8 and keep Chinese text readable.

---

## File Structure

Create:

- `docs/prototypes/star-map-skin.html`  
  Standalone high-fidelity prototype. Contains mock data, layout, CSS variables, star-map visuals, page tabs, and interactions.

No production source files change in this plan.

---

### Task 1: Create the Star Map Prototype Shell

**Files:**
- Create: `docs/prototypes/star-map-skin.html`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-06-star-map-skin-design.md`
- Produces: standalone prototype with view tabs: `登录`, `孩子任务`, `奖励星球`, `家长控制台`

- [ ] **Step 1: Create the file with the base HTML structure**

Replace the file content with:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Happy Star 幸运星图皮肤原型</title>
<style>
  :root {
    --bg0:#030707;
    --bg1:#061516;
    --bg2:#0a2427;
    --glass:rgba(10,28,31,.72);
    --glass-strong:rgba(14,39,43,.88);
    --line:rgba(178,241,233,.18);
    --line-strong:rgba(207,255,244,.38);
    --ink:#eefdfa;
    --muted:rgba(238,253,250,.62);
    --dim:rgba(238,253,250,.38);
    --gold:#f8d995;
    --gold2:#ffcc66;
    --cyan:#8eeaf2;
    --mint:#7ff0c3;
    --pink:#ff88b1;
    --blue:#7db8ff;
    --purple:#b99cff;
    --orange:#ffb86b;
    --danger:#ff7a8a;
    font-family:"PingFang SC","Microsoft YaHei",system-ui,-apple-system,"Segoe UI",sans-serif;
  }
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:
    radial-gradient(circle at 62% 18%, rgba(78,159,165,.26), transparent 34%),
    radial-gradient(circle at 30% 55%, rgba(74,112,118,.18), transparent 30%),
    linear-gradient(135deg,var(--bg0),var(--bg1) 48%,#020405);
    color:var(--ink);overflow-x:hidden}
  body::before{content:"";position:fixed;inset:0;pointer-events:none;background-image:
    radial-gradient(circle,rgba(255,255,255,.55) 0 1px,transparent 1.5px),
    radial-gradient(circle,rgba(142,234,242,.35) 0 1px,transparent 1.5px);
    background-size:110px 110px,170px 170px;background-position:20px 30px,60px 90px;opacity:.23}
  button,input,select{font:inherit}
  button{cursor:pointer}
  .app{position:relative;min-height:100vh;padding:22px clamp(14px,3vw,38px)}
  .topbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 auto 18px;max-width:1180px}
  .brand{display:flex;align-items:center;gap:12px;font-weight:700;letter-spacing:.2px}
  .brand-mark{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#2a1800;background:
    radial-gradient(circle at 35% 30%,#fff7d8,var(--gold) 58%,#b8832a);box-shadow:0 0 24px rgba(248,217,149,.45)}
  .tabs{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
  .tab{border:1px solid var(--line);background:rgba(8,22,24,.66);color:var(--muted);border-radius:999px;padding:8px 13px}
  .tab.active{color:#1d1304;background:linear-gradient(180deg,#ffe8a8,var(--gold2));box-shadow:0 0 22px rgba(248,217,149,.28)}
  .stage{max-width:1180px;margin:0 auto;min-height:690px;border:1px solid rgba(178,241,233,.12);border-radius:28px;position:relative;overflow:hidden;background:
    radial-gradient(circle at 56% 36%, rgba(102,198,203,.16), transparent 30%),
    linear-gradient(135deg,rgba(5,12,13,.9),rgba(9,26,28,.78));box-shadow:0 24px 90px rgba(0,0,0,.45), inset 0 0 80px rgba(125,232,240,.05)}
  .view{display:none;position:relative;min-height:690px;padding:24px}
  .view.active{display:block}
  .glass{background:linear-gradient(180deg,rgba(19,48,52,.82),rgba(8,22,24,.72));border:1px solid var(--line);box-shadow:0 10px 36px rgba(0,0,0,.32),inset 0 0 24px rgba(142,234,242,.05);backdrop-filter:blur(12px);border-radius:22px}
  .muted{color:var(--muted)}
  .tiny{font-size:12px;color:var(--dim)}
  .metric-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .metric{padding:12px;border-radius:18px;border:1px solid var(--line);background:rgba(2,8,9,.38)}
  .metric strong{display:block;font-size:24px;color:var(--gold);margin-top:4px}
  .cta{border:0;border-radius:999px;padding:10px 17px;color:#201405;font-weight:700;background:linear-gradient(180deg,#ffe8ad,var(--gold2));box-shadow:0 0 20px rgba(255,204,102,.32)}
  .ghost{border:1px solid var(--line);border-radius:999px;padding:9px 14px;color:var(--ink);background:rgba(255,255,255,.04)}
  .constellation{position:absolute;inset:0;pointer-events:none}
  .core{position:absolute;width:118px;height:118px;border-radius:50%;display:grid;place-items:center;text-align:center;color:#2c1b05;background:radial-gradient(circle at 38% 32%,#fff9dc,var(--gold) 55%,#8f6425);box-shadow:0 0 35px rgba(248,217,149,.75),0 0 100px rgba(248,217,149,.18);z-index:3}
  .core::after{content:"";position:absolute;inset:-18px;border-radius:50%;border:1px solid rgba(248,217,149,.35);animation:pulse 2.8s ease-in-out infinite}
  .node{position:absolute;width:76px;height:76px;border-radius:50%;display:grid;place-items:center;text-align:center;font-size:12px;line-height:1.25;color:var(--ink);background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.82),var(--node,#7db8ff) 36%,rgba(22,20,45,.88) 72%);border:1px solid rgba(255,255,255,.35);box-shadow:0 0 20px color-mix(in srgb,var(--node,#7db8ff),transparent 45%);pointer-events:auto}
  .node.done{--node:var(--gold);color:#261704}
  .node.reward{--node:var(--purple)}
  .node.small{width:52px;height:52px;font-size:10px}
  .spark{position:absolute;width:8px;height:8px;border-radius:50%;background:var(--mint);box-shadow:0 0 18px var(--mint);animation:twinkle 1.8s ease-in-out infinite}
  .screen-title{font-size:24px;font-weight:800;margin:0 0 4px}
  @keyframes pulse{0%,100%{transform:scale(.92);opacity:.42}50%{transform:scale(1.12);opacity:.9}}
  @keyframes twinkle{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.35)}}
  @keyframes flow{0%{stroke-dashoffset:180;opacity:.1}35%{opacity:.95}100%{stroke-dashoffset:0;opacity:.2}}
  @keyframes floatup{0%{opacity:0;transform:translateY(8px) scale(.9)}30%{opacity:1}100%{opacity:0;transform:translateY(-32px) scale(1.05)}}
  .flow-line{stroke-dasharray:10 170;animation:flow .9s ease-out}
  .float{position:absolute;color:var(--gold);font-weight:800;text-shadow:0 0 16px rgba(248,217,149,.7);animation:floatup 1s ease-out forwards;z-index:10}
  .command{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);width:min(620px,calc(100% - 48px));padding:10px 12px;border-radius:24px;display:flex;align-items:center;gap:10px;background:linear-gradient(180deg,rgba(236,255,252,.94),rgba(204,238,235,.9));color:#153335;box-shadow:0 0 35px rgba(142,234,242,.25)}
  .command input{flex:1;border:0;background:transparent;outline:none;color:#153335}
  .command button{border:0;background:#12383a;color:white;border-radius:50%;width:34px;height:34px}
  @media (max-width:760px){
    .stage,.view{min-height:820px}
    .topbar{align-items:flex-start;flex-direction:column}
    .metric-row{grid-template-columns:1fr}
    .command{position:relative;left:auto;bottom:auto;transform:none;width:100%;margin-top:18px}
  }
</style>
</head>
<body>
<main class="app">
  <header class="topbar">
    <div class="brand"><span class="brand-mark">★</span><div>Happy Star<br><span class="tiny">Lucky Star Map Prototype</span></div></div>
    <nav class="tabs" aria-label="原型视图">
      <button class="tab active" data-view="login">登录</button>
      <button class="tab" data-view="tasks">孩子任务</button>
      <button class="tab" data-view="rewards">奖励星球</button>
      <button class="tab" data-view="parent">家长控制台</button>
    </nav>
  </header>
  <section class="stage">
    <section id="login" class="view active"></section>
    <section id="tasks" class="view"></section>
    <section id="rewards" class="view"></section>
    <section id="parent" class="view"></section>
  </section>
</main>
<script>
const mock = {
  children: [
    { id:"haolin", name:"王颢霖", emoji:"👧", points:248, color:"#ff88b1" },
    { id:"zhongxian", name:"王仲贤", emoji:"👦", points:136, color:"#7db8ff" }
  ],
  tasks: [
    { id:"homework", name:"完成作业", emoji:"📚", points:10, done:0, limit:1, x:45, y:35, color:"#f8d995" },
    { id:"read", name:"主动阅读", emoji:"📖", points:2, done:1, limit:2, x:30, y:56, color:"#7db8ff" },
    { id:"clean", name:"打扫卫生", emoji:"🧹", points:6, done:0, limit:1, x:63, y:58, color:"#7ff0c3" },
    { id:"help", name:"帮助他人", emoji:"💗", points:3, done:2, limit:2, x:70, y:31, color:"#ff88b1" }
  ],
  rewards: [
    { id:"coins", name:"蛋币", emoji:"🪙", cost:480, etaBase:"6.2周", etaReal:"3.7周", etaMax:"3.0周", progress:52, x:72, y:34 },
    { id:"book", name:"书籍", emoji:"📘", cost:120, etaBase:"1.5周", etaReal:"0.9周", etaMax:"0.7周", progress:100, x:60, y:58 },
    { id:"day", name:"自由活动日", emoji:"🧭", cost:300, etaBase:"3.8周", etaReal:"2.3周", etaMax:"1.9周", progress:83, x:78, y:63 }
  ]
};
const views = ["login","tasks","rewards","parent"];
document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
function showView(id){ document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===id)); views.forEach(v=>document.getElementById(v).classList.toggle("active",v===id)); }
function lineSvg(points, core={x:50,y:49}) {
  return `<svg class="constellation" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <defs><filter id="glow"><feGaussianBlur stdDeviation=".6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${points.map(p=>`<line class="link-${p.id}" x1="${core.x}" y1="${core.y}" x2="${p.x}" y2="${p.y}" stroke="rgba(158,232,242,.42)" stroke-width=".18" filter="url(#glow)"/>`).join("")}
    ${points.map(p=>`<line class="flow-target-${p.id}" x1="${core.x}" y1="${core.y}" x2="${p.x}" y2="${p.y}" stroke="rgba(248,217,149,.9)" stroke-width=".26" opacity="0"/>`).join("")}
  </svg>`;
}
function nodeHtml(p, cls="") {
  const done = p.done >= p.limit;
  return `<button class="node ${cls} ${done ? "done" : ""}" data-task="${p.id}" style="left:${p.x}%;top:${p.y}%;--node:${p.color || "#b99cff"};transform:translate(-50%,-50%)">
    <span>${p.emoji}</span><strong>${p.name}</strong><small>${p.points ? `+${p.points}★` : ""}</small>
  </button>`;
}
function render(){ renderLogin(); renderTasks(); renderRewards(); renderParent(); bindInteractions(); }
</script>
</body>
</html>
```

- [ ] **Step 2: Verify the shell renders**

Run:

```powershell
Start-Process "$PWD\docs\prototypes\star-map-skin.html"
```

Expected:

- Browser opens a dark prototype page.
- Four tabs are visible.
- The stage is empty except for background styling, because view renderers are created in later tasks.

- [ ] **Step 3: Commit**

```bash
git add docs/prototypes/star-map-skin.html
git commit -m "proto: 星图皮肤原型基础壳"
```

---

### Task 2: Implement Login and Child Task Star Map Views

**Files:**
- Modify: `docs/prototypes/star-map-skin.html`

**Interfaces:**
- Consumes: `mock.children`, `mock.tasks`, `lineSvg(points)`, `nodeHtml(point, cls)`
- Produces: `renderLogin()`, `renderTasks()`, and task completion visual states

- [ ] **Step 1: Add the login and task renderers**

Insert this script before `function render(){...}`:

```html
<script>
function renderLogin(){
  document.getElementById("login").innerHTML = `
    ${lineSvg([{id:"haolin",x:36,y:46},{id:"zhongxian",x:50,y:58},{id:"parent",x:64,y:46}],{x:50,y:30})}
    <div class="core" style="left:50%;top:22%;transform:translate(-50%,-50%)"><div><strong>Happy Star</strong><br><span class="tiny">幸运入口</span></div></div>
    <div style="position:absolute;left:50%;top:9%;transform:translateX(-50%);text-align:center">
      <h1 class="screen-title">越努力，越幸运</h1>
      <p class="muted">选择一颗星球进入你的幸运星图</p>
    </div>
    <div class="glass" style="position:absolute;left:50%;bottom:86px;transform:translateX(-50%);width:min(760px,calc(100% - 44px));padding:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
      ${mock.children.map(c=>`<button class="ghost login-card" data-go="tasks" style="padding:18px;border-radius:20px"><div style="font-size:34px">${c.emoji}</div><strong>${c.name}</strong><div class="tiny">${c.points} 幸运星能量</div></button>`).join("")}
      <button class="ghost login-card" data-go="parent" style="padding:18px;border-radius:20px"><div style="font-size:34px">👪</div><strong>家长</strong><div class="tiny">Mission Control</div></button>
    </div>
    <div class="command"><span>✦</span><input value="输入 PIN 后进入星图..." readonly><button>➜</button></div>
  `;
}
function renderTasks(){
  const child = mock.children[0];
  document.getElementById("tasks").innerHTML = `
    ${lineSvg(mock.tasks)}
    <div class="core" style="left:50%;top:49%;transform:translate(-50%,-50%)"><div><strong>${child.points}</strong><br><span class="tiny">幸运星能量</span></div></div>
    ${mock.tasks.map(t=>nodeHtml(t)).join("")}
    <aside class="glass" style="position:absolute;right:24px;top:24px;width:310px;padding:18px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px"><span style="font-size:32px">${child.emoji}</span><div><h2 class="screen-title" style="font-size:20px">${child.name}</h2><div class="tiny">今日任务星图</div></div></div>
      ${mock.tasks.map(t=>`
        <div class="task-row" data-task-row="${t.id}" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)">
          <span>${t.emoji}</span><div style="flex:1"><strong>${t.name}</strong><div class="tiny">${t.done}/${t.limit} · +${t.points}⭐</div></div>
          ${t.done >= t.limit ? `<span style="color:var(--mint)">已点亮</span>` : `<button class="cta complete" data-task="${t.id}">打卡</button>`}
        </div>`).join("")}
    </aside>
    <div class="command"><span>✦</span><input value="完成一个任务，就点亮一条星轨。" readonly><button>★</button></div>
  `;
}
</script>
```

Because the file already has one `<script>` block, remove the extra `<script>` and `</script>` wrapper if you insert inside the existing block. The final HTML must have valid script nesting.

- [ ] **Step 2: Update the final render call**

At the end of the script, after `function render(){...}`, add:

```js
render();
```

- [ ] **Step 3: Verify the views**

Run:

```powershell
Start-Process "$PWD\docs\prototypes\star-map-skin.html"
```

Expected:

- `登录` tab shows three identity cards over a star map.
- `孩子任务` tab shows a central energy core, four task nodes, and a right task list.
- Completed task nodes are visibly brighter.

- [ ] **Step 4: Commit**

```bash
git add docs/prototypes/star-map-skin.html
git commit -m "proto: 星图登录与孩子任务视图"
```

---

### Task 3: Implement Rewards and Parent Mission Control Views

**Files:**
- Modify: `docs/prototypes/star-map-skin.html`

**Interfaces:**
- Consumes: `mock.rewards`, `mock.tasks`, `mock.children`
- Produces: `renderRewards()`, `renderParent()`

- [ ] **Step 1: Add reward and parent renderers**

Insert inside the existing script, before `function render(){...}`:

```js
function ring(progress){
  return `conic-gradient(var(--gold) ${progress}%, rgba(255,255,255,.08) 0)`;
}
function rewardCard(r){
  return `<article class="glass reward-card" style="padding:14px;border-radius:22px;display:grid;grid-template-columns:64px 1fr auto;gap:12px;align-items:center">
    <div style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:${ring(r.progress)};box-shadow:0 0 24px rgba(185,156,255,.25)"><span style="width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#111f22;font-size:24px">${r.emoji}</span></div>
    <div><strong>${r.name}</strong><div class="tiny">需要 ${r.cost} ⭐ · 基础 ${r.etaBase} · 现实 ${r.etaReal} · 满分 ${r.etaMax}</div></div>
    ${r.progress >= 100 ? `<button class="cta claim" data-reward="${r.id}">申请兑换</button>` : `<span class="muted">${r.progress}%</span>`}
  </article>`;
}
function renderRewards(){
  document.getElementById("rewards").innerHTML = `
    ${lineSvg(mock.rewards.map(r=>({id:r.id,x:r.x,y:r.y})),{x:32,y:50})}
    <div class="core" style="left:32%;top:50%;transform:translate(-50%,-50%)"><div><strong>248</strong><br><span class="tiny">可用星能</span></div></div>
    ${mock.rewards.map(r=>`<div class="node reward" style="left:${r.x}%;top:${r.y}%;transform:translate(-50%,-50%)"><span>${r.emoji}</span><strong>${r.name}</strong><small>${r.progress}%</small></div>`).join("")}
    <section class="glass" style="position:absolute;right:24px;top:24px;bottom:92px;width:430px;padding:18px;overflow:auto">
      <h2 class="screen-title">奖励星球</h2>
      <p class="muted">调好积分价，就能看见孩子抵达奖励的时间。</p>
      <div style="display:grid;gap:12px;margin-top:16px">${mock.rewards.map(rewardCard).join("")}</div>
    </section>
    <div class="command"><span>✦</span><input value="奖励不是终点，是努力航线上的一颗星球。" readonly><button>➜</button></div>
  `;
}
function renderParent(){
  document.getElementById("parent").innerHTML = `
    <section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,.9fr);gap:18px;height:100%">
      <div class="glass" style="padding:18px;min-height:620px">
        <h2 class="screen-title">Mission Control 家长控制台</h2>
        <p class="muted">左侧编辑任务和奖励，右侧立即观察预计到手变化。</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px">
          <div class="glass" style="padding:14px">
            <strong>任务编辑</strong>
            ${mock.tasks.map(t=>`<div style="display:flex;gap:8px;align-items:center;border-top:1px solid var(--line);padding:10px 0"><span>${t.emoji}</span><span style="flex:1">${t.name}</span><span class="tiny">+${t.points} · ${t.limit}/天</span><button class="ghost">编辑</button></div>`).join("")}
          </div>
          <div class="glass" style="padding:14px">
            <strong>奖励编辑</strong>
            ${mock.rewards.map(r=>`<div style="display:flex;gap:8px;align-items:center;border-top:1px solid var(--line);padding:10px 0"><span>${r.emoji}</span><span style="flex:1">${r.name}</span><span class="tiny">${r.cost}⭐</span><button class="ghost">编辑</button></div>`).join("")}
          </div>
        </div>
      </div>
      <aside class="glass" style="padding:18px;min-height:620px">
        <h2 class="screen-title">星图导航仪</h2>
        <p class="muted">每周产能与奖励抵达时间</p>
        <div class="metric-row" style="margin:16px 0">
          <div class="metric">基础<strong>78</strong><span class="tiny">分/周</span></div>
          <div class="metric">现实 80%<strong>130</strong><span class="tiny">分/周</span></div>
          <div class="metric">满分 100%<strong>162</strong><span class="tiny">分/周</span></div>
        </div>
        <div style="display:grid;gap:10px">${mock.rewards.map(r=>`<div style="display:grid;grid-template-columns:1fr repeat(3,64px);gap:8px;align-items:center;border-top:1px solid var(--line);padding:10px 0"><strong>${r.emoji} ${r.name}</strong><span class="tiny">${r.etaBase}</span><span class="tiny">${r.etaReal}</span><span class="tiny">${r.etaMax}</span></div>`).join("")}</div>
      </aside>
    </section>
  `;
}
```

- [ ] **Step 2: Add mobile CSS for parent/reward layouts**

Add this inside the existing `@media (max-width:760px)` block:

```css
    #parent section{grid-template-columns:1fr!important}
    #rewards .glass[style*="right:24px"]{position:relative!important;right:auto!important;top:auto!important;bottom:auto!important;width:100%!important;margin-top:430px}
```

- [ ] **Step 3: Verify the views**

Run:

```powershell
Start-Process "$PWD\docs\prototypes\star-map-skin.html"
```

Expected:

- `奖励星球` tab shows reward nodes, reward cards, progress rings, and ETA text.
- `家长控制台` tab shows task/reward editing mock panels and the capacity/navigation panel.
- At 430px wide, parent panels stack vertically.

- [ ] **Step 4: Commit**

```bash
git add docs/prototypes/star-map-skin.html
git commit -m "proto: 星图奖励与家长控制台视图"
```

---

### Task 4: Add Prototype Interactions and Visual Acceptance Notes

**Files:**
- Modify: `docs/prototypes/star-map-skin.html`

**Interfaces:**
- Consumes: existing `.complete`, `.claim`, `.flow-target-*`, `.node[data-task]`
- Produces: `bindInteractions()`, task completion animation, reward claim animation, visible acceptance notes

- [ ] **Step 1: Add interaction helpers**

Replace the empty `bindInteractions()` call expectation by inserting this function before `function render(){...}`:

```js
function burst(label, x=50, y=50){
  const el = document.createElement("div");
  el.className = "float";
  el.style.left = x + "%";
  el.style.top = y + "%";
  el.textContent = label;
  document.querySelector(".view.active").appendChild(el);
  setTimeout(()=>el.remove(), 1100);
}
function triggerFlow(id){
  const line = document.querySelector(`.view.active .flow-target-${id}`);
  if (!line) return;
  line.classList.remove("flow-line");
  void line.getBoundingClientRect();
  line.style.opacity = "1";
  line.classList.add("flow-line");
}
function bindInteractions(){
  document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.go)));
  document.querySelectorAll(".complete").forEach(btn=>btn.addEventListener("click",()=>{
    const id = btn.dataset.task;
    const task = mock.tasks.find(t=>t.id===id);
    if (!task || task.done >= task.limit) return;
    task.done += 1;
    renderTasks();
    showView("tasks");
    triggerFlow(id);
    const node = document.querySelector(`.node[data-task="${id}"]`);
    if (node) node.classList.add("done");
    burst(`+${task.points} ⭐`, task.x + 4, task.y - 3);
  }));
  document.querySelectorAll(".claim").forEach(btn=>btn.addEventListener("click",()=>{
    const reward = mock.rewards.find(r=>r.id===btn.dataset.reward);
    btn.textContent = "已发送审批";
    btn.disabled = true;
    burst(`已申请 ${reward.emoji} ${reward.name}`, 66, 24);
  }));
}
```

- [ ] **Step 2: Add acceptance note inside the prototype**

Inside `.stage`, after the four `.view` sections, add:

```html
<div style="position:absolute;left:18px;bottom:14px;font-size:11px;color:rgba(238,253,250,.35)">
  视觉契约：深色星图、玻璃面板、能量核心、任务星点、奖励星球、产能导航。未通过用户验收前不改生产 UI。
</div>
```

- [ ] **Step 3: Verify interactions**

Run:

```powershell
Start-Process "$PWD\docs\prototypes\star-map-skin.html"
```

Manual checks:

- Click `登录` page child card, it switches to `孩子任务`.
- Click a `打卡` button; the task count increments, a node lights, a line flashes, and `+N ⭐` floats up.
- Click `奖励星球` -> `申请兑换`; button changes to `已发送审批` and a floating message appears.
- Switch between tabs repeatedly; views remain stable.

- [ ] **Step 4: Commit**

```bash
git add docs/prototypes/star-map-skin.html
git commit -m "proto: 星图原型交互与验收说明"
```

---

### Task 5: Final Prototype Review

**Files:**
- Read: `docs/prototypes/star-map-skin.html`
- Read: `docs/superpowers/specs/2026-07-06-star-map-skin-design.md`

**Interfaces:**
- Consumes: completed prototype
- Produces: review notes in final response; no code changes unless a check fails

- [ ] **Step 1: Run static checks**

Run:

```powershell
Select-String -Path docs\prototypes\star-map-skin.html -Pattern "Control AI|Fuselab|TODO|TBD|lorem|http"
```

Expected:

- No output.

- [ ] **Step 2: Verify UTF-8 Chinese text visually**

Run:

```powershell
Start-Process "$PWD\docs\prototypes\star-map-skin.html"
```

Expected:

- Chinese text is readable, not mojibake.
- The prototype title reads `Happy Star 幸运星图皮肤原型`.

- [ ] **Step 3: Visual acceptance checklist**

Check:

- The prototype looks like a star-map interface, not a plain dark admin UI.
- The task action is still obvious.
- Parent editing mock panels remain readable.
- Reward ETA and capacity information are visible.
- Mobile width stacks content vertically without horizontal overflow.

- [ ] **Step 4: Commit only if fixes were needed**

If no fixes were needed:

```bash
git status --short
```

Expected:

- Clean working tree.

If fixes were needed:

```bash
git add docs/prototypes/star-map-skin.html
git commit -m "fix(proto): 星图原型验收修正"
```

---

## Self-Review

Spec coverage:

- High-fidelity HTML prototype: Tasks 1-5.
- Login, child tasks, rewards, parent control panel: Tasks 2-3.
- Clickable task and reward interactions: Task 4.
- Dark star map, glass panels, energy core, reward planets, capacity navigation: Tasks 1-3.
- No production code before prototype approval: Global constraints.
- Original design, no copied brand/reference text: Global constraints + Task 5 static check.

Placeholder scan:

- The plan intentionally contains no `TODO`, `TBD`, or unspecified implementation steps.

Type consistency:

- Shared functions: `renderLogin`, `renderTasks`, `renderRewards`, `renderParent`, `bindInteractions`, `showView`, `lineSvg`, `nodeHtml`.
- Shared mock fields: `id`, `name`, `emoji`, `points`, `done`, `limit`, `x`, `y`, `cost`, `etaBase`, `etaReal`, `etaMax`, `progress`.

