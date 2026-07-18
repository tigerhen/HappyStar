# Happy Star ⭐ 家庭积分系统 — 设计文档

- 日期：2026-06-14
- 状态：设计已确认，待写实现计划
- slogan：**越努力，越幸运**

## 1. 背景与目标

为一个家庭记录孩子值得奖励的行为，行为积累成积分（"幸运星"），积分可兑换约定好的奖励。
仅本家庭使用、只在家庭内网访问、部署在性能有限的 Linux 虚拟机上，要求**轻量、低维护、界面阳光好看**。

使用者：
- 家长（管理员）
- 王颢霖：10 岁女孩，主题色 **粉色**，头像 👧
- 王仲贤：8 岁男孩，主题色 **蓝色**，头像 👦

## 2. 范围

### 第一版（核心，本设计文档）
- 三角色 PIN 登录；家长可管理所有 PIN
- 家长管理任务、奖励
- 孩子自助完成任务打卡（自动加分，受每日次数上限约束）
- 孩子发起兑换申请；家长审批（通过即扣分 / 拒绝不扣分）
- 家长手动加分（预设之外的好行为）
- 积分日历视图（每日各孩子得分、兑换日标记）
- 全部流水日志

### 暂不做（留待后续）
- 统计分析页（完成率、7/30 天趋势）
- 预设任务/奖励模板库一键导入
- 手机推送通知
- 多家庭 / 公网访问

## 3. 技术方案

- **运行时**：Node.js 单进程。后端用 Fastify 提供 REST API，并直接返回打包好的前端静态文件（同一端口）。
- **前端**：React + Vite 构建为静态资源；样式手写（轻量，不引重型 UI 库），动画用 CSS + 少量 JS。
- **存储**：JSON 文件，无数据库。所有数据放在 `data/` 目录，写入采用**原子写**（唯一临时文件再 `rename`）防止损坏；同一集合的读-改-写在单进程内串行执行，避免并发请求互相覆盖。
- **进程守护**：systemd service（或 pm2）实现开机自启、崩溃重启。
- **访问范围**：仅家庭内网，HTTP 即可，无需 HTTPS / 公网加固。
- **部署**：`npm install && npm run build && npm start`；数据 = `data/` 文件夹，复制即备份。

> 选型理由：单进程 + JSON 文件意味着零外部依赖、零数据库运维，数据就是几个可读文件，最契合"轻量、低性能消耗、好备份"的要求；React 足以实现参考 App 的清新动效界面。

## 4. 数据模型（JSON 文件）

所有文件位于 `data/`。金额/积分均为整数。

### `config.json`
```json
{
  "parentPinHash": "<hash>",
  "sessionTtlMinutes": 120
}
```

### `children.json`
```json
[
  { "id": "haolin", "name": "王颢霖", "emoji": "👧", "color": "pink", "pinHash": "<hash>" },
  { "id": "zhongxian", "name": "王仲贤", "emoji": "👦", "color": "blue", "pinHash": "<hash>" }
]
```

### `tasks.json`（任务定义）
```json
[
  {
    "id": "t_homework",
    "name": "完成作业",
    "emoji": "📚",
    "points": 10,
    "dailyLimit": 1,
    "weeklyDays": 5,             // 每周可做天数（作业类=5）；缺省视为 7
    "core": true,                // 核心任务，计入“基础”产能场景；缺省 false
    "enabled": true
  }
]
```
- `dailyLimit`：每个孩子每天可完成的次数上限（按自然日，00:00 重置）。
- `weeklyDays` / `core`：仅用于家长端「产能总览」估算，不影响打卡/加分逻辑。

### `rewards.json`（奖励定义）
```json
[
  {
    "id": "r_icecream",
    "name": "冰淇淋",
    "emoji": "🍦",
    "category": "material",      // material 物质 | spirit 精神
    "cost": 60,
    "stock": null,               // null = 无限；数字 = 有限库存
    "enabled": true
  }
]
```

### `events.json`（统一流水，积分与日历的唯一数据源）
所有积分变动、兑换都记一条事件。当前积分 = 该孩子所有事件的 `delta` 之和。

```json
[
  {
    "id": "e_...",
    "type": "task",            // task 打卡加分 | adjust 家长手动加分 | redeem 兑换扣分
    "childId": "haolin",
    "delta": 10,               // 加分为正，兑换扣分为负
    "refId": "t_homework",     // task→任务id；redeem→奖励id；adjust→null
    "note": "",
    "createdAt": "2026-06-14T08:30:00+08:00"
  }
]
```

### `redemptions.json`（兑换申请与状态）
```json
[
  {
    "id": "rd_...",
    "childId": "haolin",
    "rewardId": "r_icecream",
    "cost": 60,
    "status": "pending",        // pending 待审批 | approved 已通过 | rejected 已拒绝
    "requestedAt": "2026-06-14T18:00:00+08:00",
    "decidedAt": null,
    "note": ""
  }
]
```
- 申请时**不扣分**；`approved` 时写入一条 `type:"redeem"` 的负向 `events` 记录并扣分；`rejected` 不产生事件。

### `growth-plans.json`（通用成长计划）

成长计划用于暑假作业、寒假作业、阅读计划、运动计划等有起止日期和量化目标的事项。计划进度与积分流水分离，修改进度不产生 `events`。

```json
[
  {
    "id": "gp_summer_2026_haolin",
    "childId": "haolin",
    "name": "2026年暑假成长计划",
    "startDate": "2026-07-01",
    "endDate": "2026-08-31",
    "status": "active",
    "targetPoints": 500,
    "groups": [
      {
        "id": "g_math",
        "name": "数学",
        "emoji": "➗",
        "items": [
          { "id": "i_math_book", "name": "数学暑假作业", "unit": "份", "target": 42, "completed": 0, "weight": 1, "optional": false, "scheduleMode": "uniform", "startDate": "2026-07-01", "endDate": "2026-08-31", "completionDates": [] }
        ]
      }
    ],
    "deliverables": [
      { "id": "d_review", "name": "全部作业家长检查", "done": false }
    ]
  }
]
```

- 必做完成率：`sum(min(completed,target) × weight) / sum(target × weight)`，只计算 `optional:false` 且 `target>0` 的项目；`weight` 表示每个单位的相对工作量。
- 拓展项目不进入必做完成率，但正常显示自身进度。
- `completed` 始终为整数并限制在 `0..target`；清单、计数和里程碑首版统一表达为目标数量。
- 计划达到 100% 后仍需单独显示提交物是否齐全；提交物不改变积分。
- `targetPoints` 仅作预期产能提示，不自动发放。积分仍只能通过任务打卡或家长手动加分进入 `events`。
- 每次增加进度都向项目的 `completionDates` 追加服务器时间，减少进度则移除最后完成的记录；历史数据缺少时间记录的部分按系数 `1.0` 处理，避免升级后无故折损。
- `scheduleMode:"uniform"` 将目标数量均匀分布到项目起止日期；`scheduleMode:"deadline"` 只要求全部数量在截止日期前完成。项目日期缺省时继承计划日期。
- 每个完成单位的时间系数：按时或提前 `1.0`，晚 1～3 天 `0.85`，晚 4～7 天 `0.70`，晚 8 天及以上 `0.50`。
- 计划积分池按 `target × weight` 分配到各必做单位；拓展项目不参与积分池。进行中只显示预计积分，不写 `events`。
- 只有必做进度 100% 且全部提交物确认后，家长才能结算。结算时四舍五入为整数，写一条 `type:"adjust"`、`refId:计划id` 的正向流水，并将计划设为 `settled`；结算时间不影响系数，重复结算返回 409。

### `measurements.json`（身高体重记录）

```json
[
  {
    "id": "m_1234abcd",
    "childId": "zhongxian",
    "date": "2026-07-18",
    "heightCm": 128.5,
    "weightKg": 27.3,
    "note": "",
    "createdAt": "2026-07-18T10:00:00.000Z",
    "updatedAt": "2026-07-18T10:00:00.000Z"
  }
]
```

- 身高单位厘米、体重单位公斤，均保留最多一位小数；日期为服务器本地自然日格式 `YYYY-MM-DD`。
- 同一孩子同一天最多一条记录；家长可新增、编辑、删除，孩子只能读取自己的记录。
- 数据按日期升序返回；最新值与上一次记录计算变化量。
- 下次建议测量日期为最新记录日期加 3 个日历月；该日期只用于提醒，不限制提前或延期记录。
- 趋势图为两张独立SVG折线图（身高/体重），不引入图表库；少于2条记录时仍显示数据点和空态说明。

## 5. 积分与业务规则

1. **积分只增不减**：增加来自 `task` 打卡和 `adjust` 家长手动加分；减少只来自**已通过的兑换**。无"惩罚扣分"。
2. **余额永不为负**：审批通过前校验余额 ≥ `cost`，不足则拒绝通过并提示。
3. **每日上限**：完成任务前，后端统计该孩子当天（本地自然日）该任务的 `task` 事件数量，达到 `dailyLimit` 则拒绝并返回提示；前端同步置灰。
4. **兑换流程**：孩子申请（不扣分）→ 家长通过（校验余额→扣分→若有限库存则减 1）/ 拒绝（不扣分）。
5. **当前积分**实时由 `events` 汇总计算，不单独存储，避免数据不一致。
6. **产能总览（家长端）**：纯估算，不入库。每任务周产能 `= points × dailyLimit × weeklyDays`；三场景周产能：基础 = 仅核心任务之和、现实 = `round(满分 × 0.8)`、满分 = 全部启用任务之和。每个奖励的预计到手周数 `= round(cost / 场景周产能, 1)`；场景产能为 0 时记 `null`（显示「—」）。定价经验值：实物奖励约 `1 元 ≈ 8 积分`。

## 6. 角色、权限与登录

- 首页显示三个头像卡片（参考 App 风格）：👧 颢霖 / 👦 仲贤 / 👪 家长，问候语「Kids are waiting for the stars ⭐」。
- 点任意头像 → 输入对应 **PIN**（数字，4–6 位）→ 进入该角色视图。
- 登录态存浏览器（cookie/localStorage），有效期 `sessionTtlMinutes`，到期重新输 PIN。
- **家长可在管理页重置/修改任意角色（含两个孩子）的 PIN**。
- 权限边界：
  - 孩子：只能操作自己——打卡、发起兑换、看自己的积分/日历/记录。
  - 家长：审批兑换、增删改任务与奖励、手动加分、管理 PIN、查看全部日历与日志。

## 7. 界面规范

### 视觉风格（对齐参考截图 / Child Reward App）
- **整体背景中性**（干净白 / 极浅灰），不大面积铺色。
- **黄色（#FFCC33 系）仅作重点色**，用在两处：
  1. 引导点击的 `Done` 打卡按钮；
  2. **已完成任务整行高亮**（金黄底 + 右侧对勾）。
- 积分用**金色星星 ⭐**，顶部右上角显示总分。
- 每个孩子有主题色：颢霖粉、仲贤蓝；家长绿。
- 圆角卡片、留白充足、阳光积极；可放一个小花笑脸吉祥物点缀。

### 布局
- 顶部三 Tab：**任务 / 奖励 / 已获得（日历）**。
- 顶部条：左=头像+名字，右=积分星星。
- 周日期条：选中日**橙色高亮**。
- 自适应：手机竖屏为主；平板/PC 同一套响应式布局加宽即可（第一版不做单独侧边栏）。

### 任务行（关键交互，已与用户确认）
- 布局：`[emoji] [名称(定宽截断) + 星值/次数] [右侧状态区]`。
- **名称列定宽 + 超长省略**，保证完成前后**行高一致**，状态变化只发生在最右侧。
- 未完成：右侧显示黄色 `Done` 按钮（引导点击）。
- 已完成：整行变金黄 + 右侧白底对勾；达每日上限的任务置灰不可点。

### 奖励页
- 列表式，每项：emoji + 名称 + 类别(精神/物质) + 所需星值。
- 显示"距离可兑换"的进度感（进度条），积分够时高亮并出现**兑换**按钮（孩子点击 = 发起申请，进入待审批）。

### 日历页（已获得）
- 月历，可前后翻月。
- 每个日期格显示当天**各孩子得分合计**（颢霖粉 / 仲贤蓝）。
- **发生兑换的日期**加 🎁 标记，点开看当天兑换详情。
- 可切换"全部 / 单个孩子"。孩子只看自己，家长看全部。

### 家长视图
- **待审批兑换**：卡片列表，显示孩子、奖励、所需分、当前余额（够/不够），可通过/拒绝并写备注。
- **任务管理**：增删改（名称、emoji、分值、每日上限、启用）。
- **奖励管理**：增删改（名称、emoji、类别、所需分、库存、启用）。
- **手动加分**：选孩子 + 分值 + 备注。
- **PIN 管理**：重置家长及两个孩子的 PIN。
- **日志**：任务 / 兑换 / 调整全部流水，可按孩子、时间筛选。

### 动画规范
- 任务完成：右侧状态区对勾**弹入**（scale 缓动），整行渐变为金黄；顶部积分**数字滚动**累加；`+N ⭐` 短暂上浮。（背景扫光等细节实现时再定，不做撑高布局的效果。）
- 兑换申请成功 / 家长审批通过：**星星迸发（confetti）** + 轻提示。
- Tab 切换 / 进入页面：轻微淡入。
- 所有积分变化用数字滚动，不瞬变。

## 8. 后端 API（草案）

REST，JSON。鉴权用登录态判断 `role`（parent / child:id）。

```
POST /api/login                { role, childId?, pin }      → 设置会话
POST /api/logout

GET  /api/children                                          → 列表(含实时积分)
GET  /api/me                                                → 当前角色与积分

GET  /api/tasks                                             → 启用中的任务(含今日完成次数)
POST /api/tasks/:id/complete    (child)                     → 校验上限→加分→返回新积分
GET  /api/rewards                                           → 奖励列表(含是否可兑换)
POST /api/rewards/:id/redeem    (child)                     → 创建 pending 申请

GET  /api/calendar?month=&childId=                          → 按日聚合得分 + 兑换标记
GET  /api/growth-plans                                     → 孩子自己的计划列表和摘要
GET  /api/growth-plans/:id                                 → 孩子自己的计划详情
PATCH /api/growth-plans/:id/items/:itemId/progress         → 增减自己的项目进度
PATCH /api/growth-plans/:id/deliverables/:itemId           → 勾选自己的提交物
GET  /api/measurements                                     → 孩子自己的身高体重记录与摘要

# 家长
GET    /api/redemptions?status=pending  (parent)
POST   /api/redemptions/:id/approve     (parent)            → 校验余额→扣分→减库存
POST   /api/redemptions/:id/reject      (parent)
POST   /api/adjust                      (parent)            → 手动加分
GET/POST/PUT/DELETE /api/admin/tasks    (parent)            → 含 PUT 行内编辑
GET/POST/PUT/DELETE /api/admin/rewards  (parent)            → 含 PUT 行内编辑
GET    /api/admin/capacity              (parent)            → 三场景周产能 + 各奖励预计到手
GET    /api/logs?childId=&from=&to=     (parent)
POST   /api/admin/pin                   (parent)            → 改某角色 PIN
GET/POST/PUT/DELETE /api/admin/growth-plans                → 家长管理全部成长计划
PATCH /api/admin/growth-plans/:id/items/:itemId/progress   → 家长修正项目进度
PATCH /api/admin/growth-plans/:id/deliverables/:itemId     → 家长修正提交物
POST  /api/admin/growth-plans/:id/settle                   → 完成后一次性结算并锁定
GET   /api/admin/measurements?childId=                     → 家长查看指定孩子记录与摘要
POST  /api/admin/measurements                              → 家长新增记录
PUT   /api/admin/measurements/:id                          → 家长编辑记录
DELETE /api/admin/measurements/:id                         → 家长删除记录
```

补充：`/api/me`（child）返回孩子档案（name/emoji/color），供主题化头部；`/api/redemptions` 回填 `childName/childEmoji/rewardName/rewardEmoji`，待审批卡显示真名。

## 9. 项目结构（建议）

```
happy-star/
  server/            Fastify 后端
    index.js         启动 + 静态托管
    store.js         JSON 读写(原子写) + 数据访问
    auth.js          PIN / 会话
    routes/          各资源路由
  web/               React + Vite 前端
    src/
  data/              运行时数据(JSON)，部署时挂出/备份
  deploy/
    happy-star.service   systemd 示例
  package.json
```

## 10. 部署与备份

1. 安装 Node.js（LTS）。
2. `npm install && npm run build`（构建前端到 `web/dist`，由后端托管）。
3. `npm start` 启动；配 `deploy/happy-star.service` 设为开机自启。
4. 浏览器访问 `http://<VM内网IP>:<端口>`。
5. 首次启动**自动种子**：两个孩子（姓名/头像/颜色预填）+ 默认任务/奖励，所有 PIN 默认 `0000`；登录后在家长「PIN」页修改。无交互式向导。
6. 备份：定期复制 `data/` 目录即可。
7. 远端部署用 `deploy/deploy.ps1` + `deploy/remote-install.sh`（部署前自动快照 `data/`、绝不删数据），详见 README。

## 11. 验收要点

- 孩子打卡：自动加分、达每日上限置灰、积分滚动动画。
- 兑换：申请不扣分；家长通过才扣分且余额不足时拦截；拒绝不扣分。
- 积分永不为负，且任何时刻 = 其 `events` 之和。
- 日历正确按日聚合各孩子得分并标记兑换日。
- 三角色 PIN 登录与家长改 PIN 正常。
- 重启进程后数据完整（JSON 持久化 + 原子写）。
