# CollabRadar 开发文档

> 本文档用于持续记录架构、数据规则、开发决策、验证结果和变更历史。后续每次相关修改都应追加变更记录，不只在聊天中说明。

## 1. 当前产品范围

中国版 ACG 联动情报站 Demo，当前只关注**国内二次元 IP 与餐饮、食品、饮品及相关门店的联动**。

公开页面只保留一条竖向时间线：

- 正在进行的活动排在最前
- 即将开始的活动其次
- 已结束的活动最后
- 各组内部按公告更新时间从新到旧排列
- 只展示 IP、联动对象、联动时间、状态和公告链接
- 暂不展示热度、搜索、分类筛选、地区筛选

`/ingest` 是内部数据解析和官方源同步工作台，不作为公开页面的复杂功能展示。

## 2. 当前技术结构

```text
原神官网 getContentList
        ↓
发现本地未处理或内容变化的 iInfoId
        ↓
标题关键词预筛选：联动 / 联名 / 合作
        ↓
getContent 获取正文与海报
        ↓
长图切块（不单独 OCR）
        ↓
DeepSeek deepseek-flash 多模态解析
        ↓
isCollab 语义复核 + Zod 字段校验
        ↓
JSON 去重入库
        ↓
国内联动时间线 / IP 时间线
```

### 技术栈

- Next.js 16 + React 19 + TypeScript
- DeepSeek `deepseek-flash` 原生多模态
- Firecrawl 作为普通网页的可选抓取 Provider
- Sharp 用于长图切块和 base64 图片输入
- Zod 用于模型输出校验
- JSON 文件作为 Demo 持久化；生产后续可换 PostgreSQL
- Docker / Docker Compose 用于服务器部署

## 3. 关键文件

```text
app/
  page.tsx                         国内单时间线首页
  ip/[id]/page.tsx                 单 IP 时间线
  ingest/page.tsx                  数据解析工作台
  api/ingest/route.ts              单 URL 解析
  api/ingest/confirm/route.ts      人工确认入库
  api/sources/genshin/sync/route.ts 原神官方源手动同步
components/
  collab-timeline.tsx              共享竖向时间线
  domestic-timeline.tsx            国内首页
  simple-ip-detail.tsx             简洁 IP 详情
  ingest-workbench.tsx             URL 解析工作台
  genshin-sync-card.tsx            原神同步卡片
lib/
  data.ts                          静态演示快照与 IP 别名
  collabs.ts                       状态、日期、热度等查询逻辑
  imported-store.ts                确认记录持久化与 URL 去重
  ingest/                          抓取、图片处理、DeepSeek 解析
  sources/genshin.ts               新 ID 扫描、关键词筛选、同步
  sources/genshin-state.ts         原神已处理 ID 状态
data/
  imported-collabs.json            人工/自动确认的真实联动记录
  genshin-source.json              原神已处理和忽略的 ID
Dockerfile / docker-compose.yml    IP:3000 部署配置
```

## 4. 环境配置

真实密钥只放 `.env`，不要写入 `.env.example` 或提交到 Git。

```bash
FIRECRAWL_API_KEY=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash
INGEST_ADMIN_TOKEN=
```

- 原神官网使用公开内容接口，不消耗 Firecrawl credits。
- 普通网页优先 Firecrawl，失败后回退普通 HTTP。
- 生产环境必须配置 `INGEST_ADMIN_TOKEN`，否则解析和同步写入接口会禁用。
- `DATA_FILE` 和 `GENSHIN_STATE_FILE` 可覆盖默认状态文件位置。

## 5. 原神同步规则

### 新公告判定

接口中出现、但本地没有处理过的 `iInfoId`，才算新 ID。已存在但内容哈希变化的公告按更新处理。不要仅通过 ID 大小判断新旧，因为列表顺序可能变化。

### 分页与停止

- 每页 20 条，最多扫描 20 页
- 从最新页面向前扫描
- 非候选公告标记 `ignored`
- 标题命中“联动、联名、合作”后才获取详情和调用模型
- `isCollab=false` 时忽略并继续
- 当前测试模式找到最近一条真实餐饮联动后停止
- 整页都是已处理 ID 时提前结束

### 幂等与失败

- 处理成功后才将 ID 标为 `done`
- 失败公告不会标记完成，可在下一轮重试
- 同一公告 URL 不会重复创建联动记录
- `124755` 已预先关联到原神 × 肯德基记录

### 已验证样例

原神 × 肯德基：

- URL：`https://ys.mihoyo.com/main/news/detail/124755`
- 五张原图切成 12 张图片切片
- 解析为 2024-07-12 至 2024-08-01

原神 × 美团 / 大众点评：

- 首次同步扫描 9 页、165 个新 ID
- 忽略 164 条，命中 `165750`
- 入库时间为 2026-08-16 至 2026-09-10
- 第二次同步只检查 1 页，新 ID 为 0，没有重复调用模型或创建记录

## 6. 时间与展示规则

- `announcedAt` 是公告发布时间，不是活动开始时间
- 未公布结束日期必须保存 `null`，页面显示“结束时间未官宣”
- 官网内容展示有效期不能当作活动结束日期
- 公开时间线按状态分组，再按 `updatedAt`、`startDate` 倒序
- 首页只展示 `region === "中国大陆"` 的记录
- 测试通过 `COLLAB_REFERENCE_NOW=2026-11-04T12:00:00+08:00` 固定参考时间；正常开发和 Pages 构建使用当前时间

## 7. API

- `GET /api/ips/recent-collabs`：早期 IP 热度查询 API，保留作后续参考，公开首页已不使用
- `GET /api/ips/{id}/collabs?timeline=current|history|all`：指定 IP 联动
- `POST /api/ingest`：解析一个公告 URL
- `POST /api/ingest/confirm`：确认解析结果并入库
- `POST /api/sources/genshin/sync`：手动同步原神官方源

## 8. 运行与验证

```bash
npm install
cp .env.example .env
npm run dev
npm test
npm run build
npm run build:pages
npm run sync:genshin
npm audit
```

当前验证结果：

- 14 项测试通过
- Next.js standalone 生产构建通过
- Pages 静态导出通过，生成首页和 17 个 IP 详情
- 静态产物已检查仓库子路径，且不包含工作台和 API
- 依赖安全扫描为 0 漏洞
- 原神首次同步和第二次幂等同步此前已验证；本轮仅无副作用检查 CLI 加载，真实定时同步由 Actions 执行
- 国内公开时间线和 IP 时间线已简化

服务器部署：

```bash
docker compose up --build -d
```

访问 `http://服务器IP:3000`，无需域名。当前开发机没有 Docker，因此 Dockerfile 尚未实际构建验证。

### GitHub Pages 模式

- 默认站点：`https://reyotsed.github.io/acg-collab-radar/`
- `GITHUB_PAGES=true` 时使用 `output: export`、`/acg-collab-radar` base path 和尾部斜杠
- `scripts/build-pages.mjs` 构建期间暂时移出 `app/api`、`app/ingest`，结束后恢复
- Next.js 16 将本次静态导出直接写入 `NEXT_DIST_DIR`，默认产物目录为 `out`
- 活动状态按构建时间计算，每天两次重建可刷新状态
- Actions 定时或手动触发时先同步，再构建，构建成功后提交 JSON 到 `main` 并部署
- 普通代码推送只构建部署，不执行模型同步
- 同步和部署必须在同一工作流中，因为使用 `GITHUB_TOKEN` 推送的数据提交不会再触发另一个 push 工作流
- 后续迁移服务器时复用同一同步核心和 JSON 数据，静态产物可直接交给 Nginx

## 9. 后续开发事项

优先级从高到低：

1. 将“找到第一条即停止”的测试模式改为处理本轮全部新联动，或循环至无新联动
2. 增加单实例定时调度、任务锁、执行日志和连续失败告警
3. 每周额外回填扫描前几页，降低列表重排造成的漏抓风险
4. 用更多真实公告建立解析标准答案集，评估日期与品牌准确率
5. 接入更多国内 IP 官方源和品牌官方源，复用 `SourceConnector` 思路
6. 数据量增长后，将 JSON 持久化迁移到 PostgreSQL

## 10. 变更记录

### 2026-11-04：初始交互 Demo

- 建立 Next.js 项目、IP 热度榜、搜索筛选和 IP 详情页
- 添加静态演示快照与公开来源链接
- 通过 8 项初始测试和生产构建

### 2026-11-05：真实公告解析链路

- 找到原神官网公开内容 API，避免动态页面“数据加载中”问题
- 接入 Firecrawl 通用 Provider、DeepSeek 多模态和长图切块
- 实现原神 × 肯德基公告解析、人工编辑、确认入库和 IP 历史展示
- 增加生产管理令牌、SSRF 防护、图片大小限制和 JSON 去重

### 2026-11-05：原神官方源增量同步

- 实现 `getContentList` 新 ID 检测、分页扫描、关键词预筛选和语义复核
- 首次同步入库原神 × 美团 / 大众点评
- 第二次同步验证不重复调用模型、不重复入库
- 新增 `genshin-source.json` 和 6 项关键词测试，总测试数达到 14

### 2026-11-05：公开页面精简

- 首页改为国内联动单时间线，不再展示日本记录
- 移除热度、搜索、分类筛选和地区筛选
- IP 详情同步改为单时间线并只保留中国大陆记录，移除侧栏、订阅、分享及复杂筛选
- 当前优先、即将开始其次、已结束最后，各组按消息时间倒序
- 新增共享 `CollabTimeline` 组件，保留解析工作台作为后台工具
- 新建本文档，后续修改需继续追加记录

### 2026-11-05：GitHub Pages 与 Actions 自动发布

- 增加 Pages 静态导出、仓库子路径和 17 个 IP 详情的预生成
- 公开构建排除本地工作台和 API，本地完整 standalone 模式继续保留
- 抽取 `npm run sync:genshin` 独立同步命令，供本地与 Actions 复用
- 新增每天两次及手动触发的同步、主分支数据提交和 Pages 部署工作流
- 活动状态改为按正常构建时间计算，测试继续使用固定参考时间
- 验证 Pages 静态构建、完整 standalone 构建、静态产物、TypeScript 和 14 项测试
- 真实 Actions 联网同步尚待仓库 Secret 配置后验证；GitHub 调度不保证精确时间

### 2026-11-05：用户向 README 与自定义域名确认

- README 顶部增加实际可访问的网站、原神档案、问题反馈和部署状态入口
- 按用户视角重组功能、数据来源、路线图、参与方式和本地运行说明，技术细节保留在本文档
- 根据 GitHub 官方文档确认：Actions 发布模式不要求 `CNAME` 文件， apex 域名需要仓库设置与 DNS A/ALIAS/ANAME 记录
- `acg-collab-radar.com` 当前未查到 DNS A、NS 或 www CNAME 记录，但这不能证明域名可注册
- 域名所有权和 DNS 尚未确认，因此不切换 base path，不影响现有 Pages 站点

## 变更记录维护规则

每次修改追加：日期、背景、修改内容、验证结果、遗留问题。涉及数据结构、同步算法、环境变量或部署方式时，必须同步更新对应章节。
