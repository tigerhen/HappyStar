# Happy Star ⭐ 家庭积分系统

> 越努力，越幸运。

记录孩子值得奖励的行为，积累成积分（"幸运星"），积分可兑换约定好的奖励。仅本家庭使用、只在家庭内网访问、部署在 Linux 上，追求轻量与低维护。

使用者：家长、王颢霖（10岁 👧 粉）、王仲贤（8岁 👦 蓝）。

## 当前状态

✅ **已实现并完成 UI 精修** —— 后端 + 前端 + 部署文件完成，35 后端 + 2 前端单测全过，端到端 17 项验收全过；UI 精修 10 任务全部落地。详见 `docs/superpowers/plans/2026-06-14-happy-star.md` 与 `2026-06-15-happy-star-ui-polish.md`。

## 文档导航

| 文档 | 作用 |
|---|---|
| [设计文档](docs/superpowers/specs/2026-06-14-happy-star-design.md) | 所有决策的唯一事实源（架构、数据模型、规则、UI 规范） |
| [实现计划 v1](docs/superpowers/plans/2026-06-14-happy-star.md) | 24 任务的后端 + 前端 + 部署实施步骤（已完成） |
| [UI 精修计划 v2](docs/superpowers/plans/2026-06-15-happy-star-ui-polish.md) | 10 任务的视觉精修（暖色、动效、confetti、per-child 主题）已完成 |
| [界面原型](docs/prototypes/) | 已确认的界面状态，作为"视觉契约" |
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

首次启动会自动生成数据并写入 `data/`：两个孩子（颢霖、仲贤）与一组默认任务/奖励，**所有 PIN 默认为 `0000`**。登录后请在家长「PIN」页修改全部 PIN。

### 开机自启（systemd）

1. 把项目放到 `/opt/happy-star`，`npm run install:all && npm run build`。
2. 建用户：`sudo useradd -r -s /bin/false happystar && sudo chown -R happystar /opt/happy-star`。
3. `sudo cp deploy/happy-star.service /etc/systemd/system/`。
4. `sudo systemctl enable --now happy-star`。

默认 PIN 全为 `0000`，首次登录后请在家长「PIN」页修改全部 PIN。

## 备份

定期复制 `data/` 目录即可（数据就是若干 JSON 文件）。
