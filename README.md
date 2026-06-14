# Happy Star ⭐ 家庭积分系统

> 越努力，越幸运。

记录孩子值得奖励的行为，积累成积分（"幸运星"），积分可兑换约定好的奖励。仅本家庭使用、只在家庭内网访问、部署在 Linux 上，追求轻量与低维护。

使用者：家长、王颢霖（10岁 👧 粉）、王仲贤（8岁 👦 蓝）。

## 当前状态

✅ **已实现** —— 后端 + 前端 + 部署文件完成，35 后端 + 2 前端单测全过，端到端 17 项验收全过。详见 `docs/superpowers/plans/2026-06-14-happy-star.md`。

## 文档导航

| 文档 | 作用 |
|---|---|
| [设计文档](docs/superpowers/specs/2026-06-14-happy-star-design.md) | 所有决策的唯一事实源（架构、数据模型、规则、UI 规范） |
| [界面原型](docs/prototypes/) | 已确认的界面状态，作为"视觉契约" |
| 本 README | 项目说明与运行/部署方式（随实现完善） |

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

首次启动引导：设置家长 PIN、确认两个孩子、给孩子设 PIN。

### 开机自启（systemd）

1. 把项目放到 `/opt/happy-star`，`npm run install:all && npm run build`。
2. 建用户：`sudo useradd -r -s /bin/false happystar && sudo chown -R happystar /opt/happy-star`。
3. `sudo cp deploy/happy-star.service /etc/systemd/system/`。
4. `sudo systemctl enable --now happy-star`。

默认 PIN 全为 `0000`，首次登录后请在家长「PIN」页修改全部 PIN。

## 备份

定期复制 `data/` 目录即可（数据就是若干 JSON 文件）。
