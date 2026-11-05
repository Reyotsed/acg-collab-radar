# CollabRadar 联动雷达

中国版 ACG 联动情报站 Demo。公开页面只展示国内联动的单条竖向时间线：正在进行优先、即将开始其次、已结束最后，各组按消息时间倒序。后台支持“公告 URL → 多模态解析 → 人工确认入库”和原神官方源增量同步。

架构、数据规则、部署和持续变更记录见 [DEVELOPMENT.md](./DEVELOPMENT.md)。

## 本地运行

```bash
npm install
cp .env.example .env
# 在 .env 中填写 Firecrawl、DeepSeek 配置；真实密钥不要写入 .env.example
npm run dev
```

打开 http://localhost:3000，公告解析工作台位于 http://localhost:3000/ingest。

```bash
npm test
npm run build
```

## GitHub Pages 自动发布

默认公开地址：`https://reyotsed.github.io/acg-collab-radar/`。

### 一次性设置

1. 在仓库 `Settings → Pages → Build and deployment` 中，将 Source 设为 **GitHub Actions**。
2. 在 `Settings → Actions → General → Workflow permissions` 中选择 **Read and write permissions**，允许工作流把数据更新提交到 `main`。
3. 在 `Settings → Secrets and variables → Actions` 添加 `DEEPSEEK_API_KEY`。`FIRECRAWL_API_KEY` 可选，原神官方接口不依赖它。
4. 如果 `main` 设置了分支保护，需要允许 GitHub Actions 直接提交；否则自动数据发布会被拒绝。

### 发布与同步

`.github/workflows/sync-and-deploy.yml` 提供三种触发方式：

- 推送代码到 `main`：构建并发布当前数据。
- 北京时间每天 09:17、21:17：同步原神公告、提交变化到 `main` 并发布。
- 在 Actions 页面手动运行 **Sync and deploy GitHub Pages**：立即执行同步和发布。

定时同步和部署放在同一个工作流中，因此不需要个人访问令牌。即使数据没有变化，定时构建也会刷新活动状态。GitHub 的定时任务可能延迟，不保证精确实时。

公开站只包含时间线和 IP 详情；`app/ingest` 与 `app/api` 保留给本地工作台，Pages 构建时自动排除并在结束后恢复。数据仍保存在 `data/imported-collabs.json` 和 `data/genshin-source.json`，所有访客看到同一个已发布版本。

本地可分别验证：

```bash
npm run sync:genshin
npm run build:pages
```

### 自定义域名

自定义域名是用自己的域名替代默认的 `github.io` 地址，Demo 阶段不是必需项。建议使用独立子域名，例如 `radar.gemfanclub.com`，不要改动已有主站记录：

1. 在 DNS 服务商处添加 CNAME：`radar` → `Reyotsed.github.io`。
2. 在仓库 `Settings → Pages → Custom domain` 填入 `radar.gemfanclub.com`，等待 DNS 检查后开启 **Enforce HTTPS**。
3. 在仓库添加只包含该域名的 `public/CNAME`，并将工作流中的 `PAGES_BASE_PATH` 改为空字符串，再重新部署。

## 示例公告

工作台默认使用：

`https://ys.mihoyo.com/main/news/detail/124755`

系统通过米哈游公开内容接口取得正文与五张海报，超长图片切块后发送给 `deepseek-flash`，提取 IP、品牌、活动日期、地点和摘要。确认后保存到 `data/imported-collabs.json`，并出现在原神的历史联动中。相同 URL 不会重复入库。

## 原神官方源增量同步

工作台中的“同步最近联动”会调用 `POST /api/sources/genshin/sync`：从新闻列表最新页面向前检查，只处理本地没有处理过或内容已变化的 ID。标题命中“联动、联名、合作”后才进入多模态解析，非餐饮联动会被忽略，找到最近一条真实餐饮联动即停止。处理状态保存在 `data/genshin-source.json`，重复运行不会重复调用模型或创建记录。

其他网页优先使用 Firecrawl；未配置或抓取失败时回退到普通 HTTP 抓取。生产环境必须为 `INGEST_ADMIN_TOKEN` 设置随机长字符串，工作台通过 `x-admin-token` 发送该令牌。

## 查询 API

- `GET /api/ips/recent-collabs?q=原神&window_days=90`
- `GET /api/ips/genshin/collabs?timeline=current`
- `POST /api/ingest`：公告 URL 解析
- `POST /api/ingest/confirm`：人工确认入库

## 用服务器 IP + 端口部署

准备 `.env`，然后运行：

```bash
docker compose up --build -d
```

访问 `http://服务器IP:3000`，无需域名。云服务器安全组和防火墙需放行 3000 端口。

```bash
docker compose logs -f web
docker compose down
```

确认入库的数据保存在 Docker 的 `collab-data` 卷中，重建容器不会丢失。只暴露 Web 端口，不要暴露内部数据或管理端口。

## 数据说明

`lib/data.ts` 是用于界面演示的静态快照，参考日期为 2026-11-04；`data/imported-collabs.json` 是工作台人工确认后的真实导入记录。两者会明确区分，不应把静态快照当成实时查询结果。
