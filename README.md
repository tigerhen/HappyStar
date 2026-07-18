# Happy Star ⭐ 家庭积分系统

> 越努力，越幸运。

记录孩子值得奖励的行为，积累成积分（"幸运星"），积分可兑换约定好的奖励。仅本家庭使用、只在家庭内网访问、部署在 Linux 上，追求轻量与低维护。

使用者：家长、王颢霖（10岁 👧 粉）、王仲贤（8岁 👦 蓝）。

## 当前状态

✅ **核心功能、成长计划与身体记录已实现** —— 包含积分任务、奖励兑换、日历、产能总览、成长计划、身高体重趋势及安全部署。测试数量以执行 `npm test` 的实时结果为准。

## 文档导航

| 文档 | 作用 |
|---|---|
| [设计文档](docs/superpowers/specs/2026-06-14-happy-star-design.md) | 所有决策的唯一事实源（架构、数据模型、规则、UI 规范） |
| [实现计划 v1](docs/superpowers/plans/2026-06-14-happy-star.md) | 24 任务的后端 + 前端 + 部署实施步骤（已完成） |
| [UI 精修计划 v2](docs/superpowers/plans/2026-06-15-happy-star-ui-polish.md) | 10 任务的视觉精修（暖色、动效、confetti、per-child 主题）已完成 |
| [界面原型](docs/prototypes/) | 已确认的界面状态，作为"视觉契约" |
| [成长计划实施计划](docs/superpowers/plans/2026-07-12-growth-plans.md) | 通用成长计划与首批暑假计划的实施范围 |
| [身高体重实施计划](docs/superpowers/plans/2026-07-18-body-measurements.md) | 身高体重记录、趋势图与三个月提醒的实施范围 |
| 本 README | 项目说明与运行/部署方式 |
| [AGENTS.md](AGENTS.md) | 给 AI 协作者的工程规则（红线、命令、视觉契约） |

## 技术方案

- 后端：Node.js + Fastify（同端口托管前端静态资源 + REST API）
- 前端：React + Vite
- 存储：JSON 文件（无数据库），数据在 `data/`，原子写
- 部署：Node 单进程 + systemd 自启，仅家庭内网

## 运行

```bash
npm run install:all   # 安装 server 与 web 依赖
npm run build         # 构建前端到 web/dist
npm start             # 启动（默认 0.0.0.0:8080）
# 浏览器访问 http://<内网IP>:8080
```

首次启动会自动生成数据并写入 `data/`：两个孩子（颢霖、仲贤）、默认任务/奖励和各自的2026暑假成长计划，**所有 PIN 默认为 `0000`**。登录后请在家长「PIN」页修改全部 PIN。

成长计划保存在 `data/growth-plans.json`。已有部署升级时，仅在该文件不存在时写入首批暑假计划，不覆盖现有任务、奖励、积分流水或后续编辑的计划数据。孩子只能查看和更新自己的计划；家长可在「计划」页创建、编辑、删除计划并修正进度。

计划进度本身不直接增加或扣减积分。系统记录每次进度完成时间，并按项目的均匀推进或截止日期规则计算预计积分：按时100%、晚1～3天85%、晚4～7天70%、晚8天以上50%。必做项目和提交物全部完成后，由家长一次性确认结算；结算只产生一条正向积分流水，已结算计划会锁定且不能重复结算。升级前已经记录但没有完成时间的进度按100%计算。

身高体重记录保存在 `data/measurements.json`，单位分别为厘米和公斤，最多保留一位小数。同一孩子同一天只能有一条记录：家长可在「身高体重」页新增、编辑、删除并切换孩子，孩子可在「身体」页只读查看自己的身高、体重趋势。系统按最新测量日期加 3 个日历月给出下次测量建议；提醒不限制提前或延期测量。

### 一键部署（从 Windows 开发机）

仓库自带 `deploy/deploy.ps1`：打包源码 → scp 上传 → 远端 `remote-install.sh` 安装/构建/重启。

```powershell
.\deploy\deploy.ps1 -RemoteDir /home/wh/apps/happy-star -DataDir /home/wh/apps/happy-star/data
# 可选参数：-SshHost 192.168.31.222 -User wh -Port 8080
```

部署的数据安全保证（`remote-install.sh`）：

- 部署前先把 `DataDir` 快照到 `hs-data-backup.<时间戳>`（保留最近 3 份）。
- 先在 `.new` 目录安装+构建（不碰数据），仅在交换代码前一刻把数据移出、交换后立即移回。
- 任何步骤失败都会通过 `trap` 把数据还原，**绝不删除数据目录**。
- 重启：若已安装 systemd 单元且配了免密 sudo，则用 `systemctl restart`，否则回退 `nohup`。

### 开机自启（systemd，推荐）

不装 systemd 时 `remote-install.sh` 用 `nohup` 启动——重启服务器后不会自动拉起。装上单元即可开机自启 + 崩溃重启，并让部署走 `systemctl`：

1. 项目放到 `/home/wh/apps/happy-star`，`npm run install:all && npm run build`。
2. 按需核对 `deploy/happy-star.service` 的 `WorkingDirectory`/`HAPPY_STAR_DATA`/`User`/`ExecStart`（用 nvm 时把 `ExecStart` 的 node 换成 `which node` 的绝对路径）。
3. `sudo cp deploy/happy-star.service /etc/systemd/system/`
4. `sudo systemctl enable --now happy-star`
5. （可选）给部署用户配置免密 `systemctl restart happy-star`，部署脚本即会自动改用 systemd 重启。

默认 PIN 全为 `0000`，首次登录后请在家长「PIN」页修改全部 PIN。

## 备份与恢复

- 数据就是 `data/` 下若干 JSON 文件（包括 `growth-plans.json`、`measurements.json`），复制即备份。
- 每次远端部署会自动在 `DataDir` 上层留快照 `hs-data-backup.<时间戳>`（最近 3 份）。
- 恢复：停服务 → 用某份快照覆盖 `data/` → 重启。
