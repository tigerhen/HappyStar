# AGENTS.md — Happy Star

家庭积分系统（"幸运星"）。Node + Fastify + React，JSON 文件存储，仅家庭内网。
当前状态：✅ **已实现**——含 UI 精修、家长端产能总览、任务/奖励行内编辑、通用成长计划、按完成时间折算的一次性计划结算、身高体重趋势与三个月测量提醒、部署数据安全加固。所有决策的事实源在 `docs/superpowers/specs/2026-06-14-happy-star-design.md`。

## 关键约束（红线——违反就是事故）

- **每日上限与积分滚动**用**服务器本地自然日**判定。部署机时区设为中国时间（`TZ=Asia/Shanghai`）；开发机若不在同一时区会让"今天的次数"算错。
- **积分只能通过 `events.json` 流水增加/扣减**。当前余额 = 该孩子所有 `delta` 之和，**不**单独持久化余额字段（会与流水不一致）。
- **兑换流程**：孩子申请 → `pending`（**不扣分**）→ 家长通过才扣分并减库存；拒绝不扣分。审批通过前**必须**校验余额 ≥ `cost`，不足则返 409。
- **没有任何"惩罚扣分"**。所有 `delta` 为负的事件只能是 `type: "redeem"`。
- **JSON 写入用原子写**（唯一临时文件再 `rename`）。读-改-写业务必须使用 `updateCollection` 按集合串行化，避免并发丢写；**不要**直接 `fs.writeFile` 覆盖现役数据文件。
- **后端按 `role` 鉴权**——孩子路由（`/api/tasks`、`/api/rewards`）**不**对家长开放；家长有自己的 admin 端点（`GET/POST/PUT/DELETE /api/admin/{tasks,rewards}`）。**不要**在前端"隐藏"——必须在后端路由层 `requireChild` / `requireParent` 守卫。
- **Node ESM everywhere**（`"type": "module"`），不要引入 CommonJS。
- 整型积分，short-string id（`crypto.randomUUID().slice(0, 8)` 切片，或稳定 slug）。

## 仓库结构

```
happy-star/
  package.json              # 根 scripts：编排 server + web
  AGENTS.md                 # 本文件——给 AI 协作者的工程规则
  README.md                 # 给人看的项目说明 + 部署步骤
  server/
    package.json            # Fastify + @fastify/static + @fastify/cookie
    src/
      paths.js store.js time.js auth.js seed.js app.js index.js
      domain/               # 纯函数：points / tasks / redeem / calendar / capacity / growth-plans / measurements（先于 route 写 TDD）
      routes/               # auth / child / parent + guard.js
    test/                   # node:test，与 src/ 同形
  web/
    package.json            # React + Vite + react-router-dom + vitest
    src/{pages,components}/  # 含 CapacityPanel / GrowthPlanDetail / MeasurementChart；家长管理页响应式分栏
  deploy/
    deploy.ps1              # Windows 开发机一键部署（打包→scp→远端 remote-install.sh）
    remote-install.sh       # 远端安装/构建/重启；部署前快照 data，trap 兜底，绝不删数据
    happy-star.service      # systemd 守护（/home/wh/apps/happy-star，User=wh）
  data/                     # 运行时 JSON，gitignore，由部署备份/快照
  docs/
    prototypes/             # 视觉契约：task-list-states.html
    superpowers/
      specs/                # 唯一事实源：2026-06-14-happy-star-design.md
      plans/                # 已完成实施计划（保留作回溯参考）：10 份（2026-06-14 ~ 07-18）
```

## 常用命令

```bash
# 测试（数量会随功能增加，以命令实时输出为准）
npm --prefix server test       # 后端 node:test
npm --prefix web test          # 前端 Vitest
npm test                       # 两者都跑（根 scripts）

# 装依赖 + 构建 + 启动
npm run install:all            # server + web 一起装
npm run build                  # 构建 web/dist（由后端 @fastify/static 托管）
npm start                      # 默认 0.0.0.0:8080

# 部署（从 Windows 开发机一键推到 Linux VM；详见 README）
# .\deploy\deploy.ps1 -RemoteDir /home/wh/apps/happy-star -DataDir /home/wh/apps/happy-star/data
# 远端 remote-install.sh：先构建→交换前移出 data→交换后移回，trap 兜底，部署前快照 hs-data-backup.<时间戳>
# 开机自启可选装 systemd：sudo cp deploy/happy-star.service /etc/systemd/system/ && sudo systemctl enable --now happy-star

# 隔离数据启动（开发时避免污染仓库 data/）
$env:HAPPY_STAR_DATA = "C:\Users\ADMINI~1\AppData\Local\Temp\hs-test"   # PowerShell
HAPPY_STAR_DATA=/tmp/hs-test node server/src/index.js                 # bash
```

## 视觉契约（不要擅自改——已被设计文档与用户视觉验收锁定）

来源：`docs/prototypes/task-list-states.html` + `docs/superpowers/specs/2026-06-14-happy-star-design.md` §7 + UI 精修后用户视觉验收。

- **整体背景中性**（`--bg: #f3f3f0`，**不**大面积铺色）。UI 精修曾误改为暖奶油 `#fff8ee`，被 commit `a112482` 推回中性。
- **黄色 `#FFCC33`** 只用于两处：① `打卡` 引导按钮（按钮文字**已中文化**——不写 "Done"）；② 已完成任务整行高亮（金黄底 + 右侧白底对勾 + 弹入动画 `hs-pop`）。
- **完成任务**有 `+N ⭐` 上浮动画（`hs-float`，1s 上浮 -28px 渐隐）。
- **兑换可兑换奖励**触发 confetti 撒花（40 个彩碎片，3.2s 清空）。
- **任务行布局**：`[emoji] [名称(定宽截断) + 星值/次数] [右侧状态区]`。名称列定宽省略，**完成前后行高一致**，状态变化只发生在最右侧。
- **每孩子主题色**：颢霖粉（`#ffe3ec` header / `#b14a6b` ink）、仲贤蓝（`#e6f1fb` header / `#185fa5` ink）、家长绿（admin 区）。
- **积分用金色星星 ⭐**，所有积分变化走 600ms 数字滚动动画（StarCount），不瞬变。
- **日历**今日金边高亮（`#fff3c4` 底 + 2px `var(--accent-strong)` 边），孩子得分散成圆角彩底 chip。
- **身体趋势**：身高用颢霖粉、体重用仲贤蓝；竖屏两图上下、横屏左右，页面背景继续使用中性底色。

## 修改前自问

- 这是不是已经在 `docs/superpowers/specs/2026-06-14-happy-star-design.md` 决定了？改了要先回 spec，**不要**在 plan 或 commit message 里偷偷改。
- 这个领域逻辑是否应该放在 `server/src/domain/`（纯函数，便于 `node:test` 测）而不是直接写进 route？新业务规则**必须**先 domain 再 route。
- 新增的 API endpoint 是否覆盖 spec §8 的列表？没覆盖就在 spec 里加完再写代码。
- 测试是否先写？`server/src/domain/` 与 `server/src/routes/` 用 `node:test`，`web/src/components/` 用 `vitest`（注意：vitest 不会自动 cleanup DOM，**测试文件**必须显式 `import { afterEach } from "vitest"; import { cleanup } from "@testing-library/react"; afterEach(cleanup);`）。
- 新增或改动 UI 之前，看一遍 `docs/prototypes/task-list-states.html` 与 commit `a112482`（中性底色裁决）——别再把 `--bg` 改暖了。

## 千万别做

- **不要**把 `data/` 提交进 git（已在 `.gitignore`，含 PIN 哈希）。
- **不要**引入数据库（MongoDB/SQLite 等）。设计明确选了 JSON 文件 + 原子写。
- **不要**引入重型 UI 库（Material-UI、Ant Design、Mantine、Chakra 等）。手写 CSS + 少量 JS + 3 个 `hs-*` keyframes 已够。
- **不要**改 `web/vite.config.js`（保持 verbatim——`test.environment: "jsdom"`；globals 不开，测试文件自管 cleanup）。
- **不要**把 `.claude/settings.local.json` 提交（已在 `.gitignore`，含个人权限）。
- **不要**让 `/api/tasks` 或 `/api/rewards` 接受家长会话（用 `requireChild` 守卫）；家长列任务/奖励走 `/api/admin/{tasks,rewards}`（commit `532bc73` 补的 GET 端点）。
- **不要**在 `events.json` 里直接改 `delta` 字段去"修复"余额——所有余额变动走完整流水。
