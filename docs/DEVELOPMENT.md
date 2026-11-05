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
原神 / 崩铁 / 崩三 / 绝区零 getContentList
明日方舟 /api/news 三分类列表
        ↓
统一为标准公告 ID、标题、内容签名、发布时间和详情 URL
        ↓
发现本地未处理或内容变化的公告
        ↓
标题预筛选：联动 / 联名 / 合作 / 常见餐饮品牌
        ↓
米哈游 getContent 或官方 HTML 获取正文、图片与视频海报
        ↓
长图切块（不单独 OCR）
        ↓
DeepSeek deepseek-flash 多模态解析
        ↓
isCollab 语义复核 + Zod 字段校验 + 日期完整性检查
        ↓
JSON 去重入库，各来源独立保存处理状态
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
src/
  app/
    page.tsx                       国内单时间线首页
    ip/[id]/page.tsx               单 IP 时间线
    ingest/page.tsx                数据解析工作台
    api/ingest/route.ts            单 URL 解析
    api/ingest/confirm/route.ts    人工确认入库
    api/sources/sync/route.ts      全部官方源手动同步
    api/sources/genshin/sync/route.ts 原神兼容同步入口
  components/
    collab-timeline.tsx            共享竖向时间线
    domestic-timeline.tsx          国内首页
    simple-ip-detail.tsx           简洁 IP 详情
    ingest-workbench.tsx           URL 解析工作台
    source-sync-card.tsx           多来源同步卡片
  lib/
    data.ts                        静态演示快照与 IP 别名
    collabs.ts                     状态、日期、热度等查询逻辑
    imported-store.ts              确认记录持久化与 URL 去重
    ingest/                        抓取、图片处理、DeepSeek 解析
    sources/registry.ts            五个官方来源注册表
    sources/mihoyo.ts              米哈游内容接口连接器
    sources/arknights.ts           明日方舟官网连接器
    sources/sync.ts                共享增量扫描、筛选与入库
    sources/state.ts               各来源独立处理状态
data/                              联动记录与官方源处理状态
scripts/                           独立同步与 Pages 构建命令
tests/                             数据规则和来源筛选测试
docs/                              架构、部署与变更记录
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

- 原神、崩铁、崩三、绝区零使用米哈游公开内容接口，明日方舟使用官网公开新闻接口，均不消耗 Firecrawl credits。
- 普通网页优先 Firecrawl，失败后回退普通 HTTP。
- 生产环境必须配置 `INGEST_ADMIN_TOKEN`，否则解析和同步写入接口会禁用。
- `DATA_FILE` 可覆盖联动记录位置，`SOURCE_STATE_DIR` 可覆盖各来源状态目录。
- `GENSHIN_STATE_FILE` 仅用于兼容读取旧原神状态；新状态统一写入 `data/sources/{source}.json`。

## 5. 官方来源同步规则

### 已验证来源

| 来源 | 官方数据入口 | 频道或分类 | 详情方式 |
|---|---|---|---|
| 原神 | `content_v2_user/app/16471662a82d418a` | `iChanId=719` | `getContent` |
| 崩铁 | `content_v2_user/app/1963de8dc19e461c` | `iChanId=255` | `getContent` |
| 崩三 | `content_v2_user/app/b9d5f96cd69047eb` | `iChanId=693` | `getContent` |
| 绝区零 | `content_v2_user/app/706fd13a87294881` | `iChanId=273` | `getContent` |
| 明日方舟 | `ak.hypergryph.com/api/news` | `ANNOUNCEMENT / ACTIVITY / NEWS` | 官方 HTML |

以上参数来自 2026-11-05 对官网新闻页真实网络请求和直接 API 响应的验证。旧米游社 `getNewsList` 当前返回 404，不作为来源。

### 新公告判定

各连接器统一输出公告 ID、标题、内容签名、发布时间和详情 URL。接口中出现、但本地没有处理过的 ID 才算新公告；已存在但内容哈希变化的公告按更新处理。不要仅通过 ID 大小判断新旧，因为列表可能包含置顶或重排。

### 分页与停止

- 每个来源最多扫描 20 页，整页均为已处理 ID 时提前结束
- 标题命中“联动、联名、合作、KFC 或常见餐饮品牌”后才获取详情和调用模型
- 非候选公告标记 `ignored`；非餐饮联动同样忽略并继续
- 缺少开始日期或日期范围无效时记录原因并跳过自动入库，不中断整个来源
- 每个来源找到最近一条可自动入库的真实餐饮联动后停止
- 单个来源失败写入 `report.error`，其他来源继续执行

### 幂等与失败

- 处理成功后才将 ID 标为 `done`，失败公告可在下一轮重试
- 各来源状态分别保存在 `data/sources/{source}.json`
- 同一公告 URL 不会重复创建联动记录
- 米哈游正文同时提取 `<img>` 与 `<video poster>`，支持只有 PV 封面的公告

### 已验证样例

- 原神 `124755`：肯德基联动，五张原图切成 12 张图片切片
- 原神 `165750`：美团 / 大众点评，此前已验证首次与第二次幂等同步
- 崩铁 `165338`：Fate 联动 PV，官方正文和一张视频海报可读取，模型应拒绝非餐饮联动
- 崩三 `126678`：星穹铁道联动版本，正文与十张图片可读取，模型应拒绝非餐饮联动
- 绝区零 `165191`：KFC 联动，官方正文与图片可读取
- 明日方舟 `7352`：官方 HTML 正文与图片可读取；列表时间用于补充公告日期

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
- `POST /api/sources/sync`：手动同步全部官方来源，逐来源返回报告
- `POST /api/sources/genshin/sync`：原神兼容同步入口

## 8. 运行与验证

```bash
npm install
cp .env.example .env
npm run dev
npm test
npm run build
npm run build:pages
npm run sync:sources
npm run sync:sources -- --source=zzz
npm audit
```

当前验证结果：

- 25 项测试通过
- Next.js standalone 生产构建通过，包含全部来源同步 API
- Pages 静态导出通过，生成首页和 20 个 IP 详情
- 静态产物已检查仓库子路径，不包含工作台、API 或 `SIGNAL ARCHIVE` 面板
- 五个来源第一页均已通过项目连接器真实读取
- 原神、崩铁、崩三、绝区零与明日方舟五个官方详情样例均已验证标题、正文和图片来源
- 崩铁视频海报和绝区零 KFC 图片提取通过；本轮真实验收未调用模型、未写入联动数据
- 依赖安全扫描此前为 0 漏洞，本次未新增第三方依赖

服务器部署：

```bash
docker compose up --build -d
```

访问 `http://服务器IP:3000`，无需域名。当前开发机没有 Docker，因此 Dockerfile 尚未实际构建验证。

### GitHub Pages 模式

- 默认站点：`https://reyotsed.github.io/acg-collab-radar/`
- `GITHUB_PAGES=true` 时使用 `output: export`、`/acg-collab-radar` base path 和尾部斜杠
- `scripts/build-pages.mjs` 构建期间暂时移出 `src/app/api`、`src/app/ingest`，结束后恢复
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

### 2026-11-05：工作区整理与公开页面重设计

- 将 `app`、`components`、`lib` 统一迁移到 `src`，开发文档迁移到 `docs`，同步修正别名、测试和构建脚本
- 删除确认无引用的 `ip-poster.tsx` 以及旧榜单、搜索、筛选和海报样式，保留两个公开 IP 查询 API 与完整采集工作台
- 清理约 780MB 可再生 Next/Pages 构建产物和 TypeScript 缓存，不删除数据 JSON、环境配置或依赖目录
- 首页改为雷达概览与 editorial 风格时间线，卡片增加日期轨道、摘要和更明确的状态层级
- IP 详情改为使用 IP 色彩的档案头图，导航和页脚增加开源仓库及信息纠错入口
- 修正取消活动状态文案和 IP 详情页时间线链接，完成 390px 移动端检查，无横向溢出
- 验证完整 standalone 构建、Pages 静态构建、14 项测试、独立同步 CLI、桌面与移动浏览器渲染

### 2026-11-05：五个游戏官方来源

- 根据用户要求移除首页 `SIGNAL ARCHIVE` 面板及全部关联样式，保留单列首屏
- 通过真实浏览器网络请求确认崩铁、崩三、绝区零与原神共用米哈游 `content_v2_user` 体系，记录已验证 app 和频道参数
- 验证明日方舟 `/api/news` 三分类公开接口；旧米游社 `getNewsList` 已返回 404，不予采用
- 新增统一 `OfficialSourceDefinition`、米哈游与明日方舟连接器、注册表和按来源独立状态目录
- 同步核心支持品牌候选词、单源失败隔离、日期不足跳过、视频海报提取和统一官方 HTML 解析
- 新增崩三、绝区零、明日方舟 IP 档案，全部来源同步 API/CLI 与工作台报告
- Actions 改为 `npm run sync:sources`，数据提交覆盖 `data/`；原神旧 API 和 CLI 保留兼容
- 新增 11 项来源与 HTML 测试，总计 25 项；完整构建、Pages 构建和五个真实列表/详情样例通过

## 变更记录维护规则

每次修改追加：日期、背景、修改内容、验证结果、遗留问题。涉及数据结构、同步算法、环境变量或部署方式时，必须同步更新对应章节。
