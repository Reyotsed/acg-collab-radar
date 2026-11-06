# CollabRadar 联动雷达

发现二次元 IP 与茶饮、咖啡、快餐、食品及主题餐厅的联动消息。

## 在线访问

**[https://reyotsed.github.io/acg-collab-radar/](https://reyotsed.github.io/acg-collab-radar/)**

无需注册，打开网站即可浏览。所有访客看到的是同一份最新发布数据。

[查看原神联动档案](https://reyotsed.github.io/acg-collab-radar/ip/genshin/) · [反馈问题](https://github.com/Reyotsed/acg-collab-radar/issues) · [自动部署状态](https://github.com/Reyotsed/acg-collab-radar/actions/workflows/sync-and-deploy.yml)

[![Sync and deploy GitHub Pages](https://github.com/Reyotsed/acg-collab-radar/actions/workflows/sync-and-deploy.yml/badge.svg)](https://github.com/Reyotsed/acg-collab-radar/actions/workflows/sync-and-deploy.yml)

## 现在可以做什么

- **浏览国内联动时间线**：正在进行优先，即将开始其次，历史联动最后。
- **查看活动状态和时间**：明确区分开始日期、结束日期与公告更新时间。
- **进入单个 IP 档案**：集中查看该 IP 的当前与历史餐饮联动。
- **追溯公告来源**：每条记录保留官方或媒体来源链接，不只展示模型摘要。
- **定时发现新消息**：已接入原神、崩铁、崩三、绝区零和明日方舟官方公告源，自动解析、去重并更新网站。

当前是早期 Demo，聚焦**中国大陆的二次元餐饮联动**。它不是全网实时监控，也不保证所有品牌与活动均已收录。

## 数据从哪里来

网站目前包含两类内容：

| 数据 | 用途 |
|---|---|
| 静态演示快照 | 展示产品界面和时间线交互，参考日期为 2026-11-04 |
| 官方源同步记录 | 从原神、崩铁、崩三、绝区零和明日方舟公开公告中提取的真实餐饮联动，保留原始公告链接 |

自动同步流程：

```text
官方公告 → 新公告检测 → 联动候选筛选 → DeepSeek 多模态解析
→ 字段校验与 URL 去重 → JSON 数据 → 静态网站
```

每个游戏从最新公告开始向后查找，只保留最近一年内的最新一条有效餐饮联动；遇到已同步的最新联动或一年时间边界立即停止，不建立多年历史存档。

GitHub Actions 每天定时运行两次，也可以在仓库中手动触发。即使公告没有变化，重新构建也会刷新活动状态。GitHub 调度可能延迟，因此页面不承诺秒级更新。

未官宣的日期保存为 `null`，页面显示“结束时间未官宣”或“日期待定”，不会让模型猜测。官方明确“售完/领完即止”的活动默认从开始日期起一个月后截止，页面标注“默认截止”，到期自动进入历史联动。静态演示记录会明确标记“演示快照”，不与真实入库记录混同。

## 接下来计划做什么

- 接入更多二次元 IP 与餐饮品牌官方信息源
- 增加活动修订、延期、取消和来源健康状态
- 扩展更多地区与联动类型
- 提供关键词订阅、定时摘要和主动推送
- 将 JSON 数据平滑迁移到服务器数据库与查询 API

## 参与建设

你可以通过 [GitHub Issues](https://github.com/Reyotsed/acg-collab-radar/issues) 提交：

- 联动信息纠错：请附官方公告或可靠来源
- 新 IP 或品牌信息源：请说明官网、官方账号或公开 API
- 功能建议与重复记录报告
- 网页解析、别名和来源适配器贡献

开发前请阅读 [DEVELOPMENT.md](./docs/DEVELOPMENT.md)，其中记录了数据规则、同步算法、环境配置、部署方式和变更历史。

## 本地运行

访客不需要安装任何依赖。以下命令只用于开发：

```bash
npm ci
cp .env.example .env
npm run dev
```

打开 `http://localhost:3000`。本地公告解析工作台位于 `http://localhost:3000/ingest`。

只浏览页面不需要密钥；执行真实公告解析前，需要在 `.env` 中配置 `DEEPSEEK_API_KEY`。`FIRECRAWL_API_KEY` 仅作为普通网页的可选抓取服务，已接入的游戏官方接口不依赖它。

```bash
# 运行测试
npm test

# 验证完整网站构建
npm run build

# 验证 GitHub Pages 静态构建
npm run build:pages

# 手动同步全部官方公告
npm run sync:sources

# 只同步一个来源（可选 genshin / hsr / bh3 / zzz / arknights）
npm run sync:sources -- --source=zzz
```

## 部署方式

当前使用 **GitHub Actions + GitHub Pages**，不需要常驻服务器：

- 推送代码到 `main`：构建并发布当前数据。
- 定时或手动运行工作流：同步公告、提交数据变化并发布。
- 公开站只包含时间线和 IP 详情；本地解析工作台与管理 API 不会部署到 Pages。

自托管所需的 Pages 权限、Secret、工作流和服务器迁移说明见 [DEVELOPMENT.md](./docs/DEVELOPMENT.md)。

## 信息说明

本项目与所收录 IP、游戏公司及餐饮品牌没有隶属或官方合作关系。相关名称与商标归各自权利人所有，活动信息请以原始公告和门店实际规则为准。
