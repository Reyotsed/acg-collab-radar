import type { Collaboration, Evidence, IpEntity } from "./types";

export const DEMO_REFERENCE_DATE = "2026-11-04";
export const DEMO_REFERENCE_ISO = "2026-11-04T12:00:00+08:00";

export const ips: IpEntity[] = [
  { id: "honor-of-kings", name: "王者荣耀", nativeName: "王者荣耀", englishName: "Honor of Kings", aliases: ["王者", "王者荣耀KPL", "KPL", "Honor of Kings"], kind: "游戏", monogram: "王", colors: ["#172554", "#2563eb", "#fbbf24"] },
  { id: "chiikawa", name: "吉伊卡哇", nativeName: "ちいかわ", englishName: "Chiikawa", aliases: ["Chiikawa", "ちいかわ", "吉伊卡哇", "小可爱"], kind: "角色", monogram: "ち", colors: ["#9f456d", "#f58fb5", "#fde68a"] },
  { id: "demon-slayer", name: "鬼灭之刃", nativeName: "鬼滅の刃", englishName: "Demon Slayer", aliases: ["鬼灭", "鬼滅の刃", "Demon Slayer", "Kimetsu no Yaiba"], kind: "动画", monogram: "鬼", colors: ["#18181b", "#7f1d1d", "#f87171"] },
  { id: "natsume", name: "夏目友人帐", nativeName: "夏目友人帳", englishName: "Natsume's Book of Friends", aliases: ["夏目", "夏目友人帳", "Natsume"], kind: "动画", monogram: "夏", colors: ["#164e63", "#4d7c5b", "#e7d8a6"] },
  { id: "touhou", name: "东方Project", nativeName: "東方Project", englishName: "Touhou Project", aliases: ["东方", "東方Project", "Touhou", "东方project"], kind: "游戏", monogram: "东", colors: ["#4c0519", "#be123c", "#fda4af"] },
  { id: "powerpuff-girls", name: "飞天小女警", nativeName: "The Powerpuff Girls", englishName: "The Powerpuff Girls", aliases: ["飞天小女警", "Powerpuff Girls", "PPG"], kind: "动画", monogram: "P", colors: ["#155e75", "#06b6d4", "#f9a8d4"] },
  { id: "hatsune-miku", name: "初音未来", nativeName: "初音ミク", englishName: "Hatsune Miku", aliases: ["初音", "初音ミク", "Hatsune Miku", "Miku"], kind: "角色", monogram: "ミ", colors: ["#134e4a", "#14b8a6", "#99f6e4"] },
  { id: "genshin", name: "原神", nativeName: "原神", englishName: "Genshin Impact", aliases: ["原神", "Genshin", "Genshin Impact"], kind: "游戏", monogram: "原", colors: ["#312e81", "#6366f1", "#e0c58f"] },
  { id: "hsr", name: "崩坏：星穹铁道", nativeName: "崩坏：星穹铁道", englishName: "Honkai: Star Rail", aliases: ["崩铁", "星穹铁道", "星铁", "Honkai Star Rail", "HSR"], kind: "游戏", monogram: "星", colors: ["#1e1b4b", "#4f46e5", "#67e8f9"] },
  { id: "bh3", name: "崩坏3", nativeName: "崩坏3", englishName: "Honkai Impact 3rd", aliases: ["崩三", "崩坏三", "Honkai Impact 3rd", "HI3"], kind: "游戏", monogram: "崩", colors: ["#164e63", "#06b6d4", "#a5f3fc"] },
  { id: "zzz", name: "绝区零", nativeName: "绝区零", englishName: "Zenless Zone Zero", aliases: ["ZZZ", "Zenless Zone Zero", "绝区零"], kind: "游戏", monogram: "绝", colors: ["#27272a", "#f97316", "#fde047"] },
  { id: "arknights", name: "明日方舟", nativeName: "明日方舟", englishName: "Arknights", aliases: ["方舟", "Arknights", "舟游", "明日方舟"], kind: "游戏", monogram: "舟", colors: ["#1f2937", "#64748b", "#e2e8f0"] },
  { id: "tgcf", name: "天官赐福", nativeName: "天官赐福", englishName: "Heaven Official's Blessing", aliases: ["天官", "天官赐福动画", "TGCF", "Heaven Official"], kind: "动画", monogram: "福", colors: ["#7f1d1d", "#dc5f55", "#f5cf8e"] },
  { id: "cardcaptor-sakura", name: "魔卡少女樱", nativeName: "カードキャプターさくら", englishName: "Cardcaptor Sakura", aliases: ["小樱", "百变小樱", "魔卡少女樱", "Cardcaptor Sakura", "CCS"], kind: "动画", monogram: "樱", colors: ["#9d174d", "#f472b6", "#fbcfe8"] },
  { id: "wind-breaker", name: "防风少年", nativeName: "WIND BREAKER", englishName: "WIND BREAKER", aliases: ["防风铃", "Wind Breaker", "WIND BREAKER", "WB"], kind: "动画", monogram: "风", colors: ["#0f172a", "#0f766e", "#99f6e4"] },
  { id: "bungo-stray-dogs", name: "文豪野犬", nativeName: "文豪ストレイドッグス", englishName: "Bungo Stray Dogs", aliases: ["文野", "文豪野犬", "Bungo Stray Dogs", "BSD"], kind: "动画", monogram: "文", colors: ["#292524", "#78624f", "#e7e5e4"] },
  { id: "tears-of-themis", name: "未定事件簿", nativeName: "未定事件簿", englishName: "Tears of Themis", aliases: ["未定", "未定事件簿", "Tears of Themis"], kind: "游戏", monogram: "未", colors: ["#172554", "#3b82f6", "#f6d58b"] },
  { id: "big-ear-tutu", name: "大耳朵图图", nativeName: "大耳朵图图", englishName: "Big Ear Tutu", aliases: ["图图", "大耳朵图图", "Big Ear Tutu"], kind: "动画", monogram: "图", colors: ["#9a3412", "#fb923c", "#fde68a"] },
  { id: "promise-of-wizard", name: "魔法使的约定", nativeName: "魔法使いの約束", englishName: "Promise of Wizard", aliases: ["魔法药", "魔法使的约定", "魔法师的约定", "魔法使いの約束", "Mahoyaku"], kind: "游戏", monogram: "魔", colors: ["#3b0764", "#8b5cf6", "#ddd6fe"] },
  { id: "promised-neverland", name: "约定的梦幻岛", nativeName: "約束のネバーランド", englishName: "The Promised Neverland", aliases: ["梦幻岛", "约定的梦幻岛", "Promised Neverland"], kind: "动画", monogram: "岛", colors: ["#052e16", "#15803d", "#bbf7d0"] },
];

const media = (title: string, source: string, url: string, publishedAt: string): Evidence => ({ title, source, url, publishedAt, tier: "media" });
const official = (title: string, source: string, url: string, publishedAt: string): Evidence => ({ title, source, url, publishedAt, tier: "official" });

export const collaborations: Collaboration[] = [
  {
    id: "kpl-luckin-2026", ipIds: ["honor-of-kings"], title: "KPL 十周年 × 瑞幸咖啡", brand: "瑞幸咖啡", brandShort: "瑞", category: "coffee", region: "中国大陆", location: "全国参与门店",
    startDate: "2026-10-26", endDate: null, announcedAt: "2026-10-20", updatedAt: "2026-11-03",
    summary: "两弹联名包装与周边陆续上线，包含选手主题杯、纸袋、杯套及水敏小卡。结束时间以官方公告为准。", tags: ["限定包装", "联名周边", "两弹上线"],
    sources: [media("瑞幸 KPL 联名周边发售", "微博", "https://weibo.com/2504770437/5356009434383847", "2026-10-26"), media("瑞幸与王者荣耀 KPL 十周年联动", "新浪科技", "https://finance.sina.com.cn/tech/shenji/2026-11-03/doc-inixmnpz0030839.shtml", "2026-11-03")],
  },
  {
    id: "genshin-baskin-2026", ipIds: ["genshin"], title: "原神 × 31 冰淇淋", brand: "31 冰淇淋", brandShort: "31", category: "food", region: "日本", location: "日本参与门店",
    startDate: "2026-08-28", endDate: null, announcedAt: "2026-08-20", updatedAt: "2026-10-31",
    summary: "推出原神主题冰淇淋、限定包装与周边活动。当前快照未收录明确结束日期。", tags: ["主题冰淇淋", "限定包装", "角色周边"],
    sources: [media("《原神》× 31 冰淇淋", "Collabo Cafe", "https://collabo-cafe.com/zh-hans/events/collabo/genshin-baskinrobbins-2026/", "2026-08-20")],
  },
  {
    id: "chiikawa-potato-2026", ipIds: ["chiikawa"], title: "吉伊卡哇「监狱土豆」主题零食", brand: "万代零食", brandShort: "万", category: "food", region: "日本", location: "日本指定销售渠道",
    startDate: "2026-11-02", endDate: null, announcedAt: "2026-10-25", updatedAt: "2026-11-01",
    summary: "吉伊卡哇主题包装零食与角色周边企划，属于食品类联动示例。", tags: ["主题零食", "角色包装", "新品"],
    sources: [media("Chiikawa 监狱土豆主题零食", "Collabo Cafe", "https://collabo-cafe.com/zh-hans/events/collabo/chiikawa-prison-potato-bandai-snack-2026/", "2026-11-01")],
  },
  {
    id: "demon-ufotable-2026", ipIds: ["demon-slayer"], title: "鬼灭之刃「无限列车篇」第二季主题咖啡", brand: "ufotable Cafe", brandShort: "U", category: "cafe", region: "日本", location: "ufotable Cafe 指定门店",
    startDate: "2026-11-03", endDate: null, announcedAt: "2026-10-20", updatedAt: "2026-11-01",
    summary: "重播纪念主题咖啡，提供角色餐点、饮品与限定特典。结束时间以门店公告为准。", tags: ["主题餐点", "限定特典", "重播纪念"],
    sources: [media("鬼灭之刃重播纪念咖啡厅", "Collabo Cafe", "https://collabo-cafe.com/zh-hans/events/collabo/kimetsu-rerun-mugen-train-vol2-ufotable-cafe-2026/", "2026-11-01")],
  },
  {
    id: "natsume-cafe-2026", ipIds: ["natsume"], title: "夏目友人帐主题咖啡 in 大阪", brand: "Cafe motto", brandShort: "C", category: "cafe", region: "日本", location: "大阪",
    startDate: "2026-09-30", endDate: "2026-11-29", announcedAt: "2026-09-01", updatedAt: "2026-09-30",
    summary: "分两期推出夏目友人帐主题餐点、饮品与限定周边。", tags: ["大阪", "两期活动", "主题咖啡"],
    sources: [media("夏目友人帐大阪主题咖啡厅", "Collabo Cafe", "https://collabo-cafe.com/zh-hans/events/collabo/natsume-cafe-motto-osaka-2026/", "2026-09-01")],
  },
  {
    id: "touhou-curemaid-2026", ipIds: ["touhou"], title: "东方Project 博丽神社秋祭 2026", brand: "Cure Maid Cafe", brandShort: "C", category: "cafe", region: "日本", location: "东京 · 秋叶原",
    startDate: "2026-10-30", endDate: "2026-11-15", announcedAt: "2026-10-10", updatedAt: "2026-10-30",
    summary: "以东方红魔乡角色为灵感的蛋包饭、芭菲等限定菜单，点单附赠主题贴纸。", tags: ["秋叶原", "限定菜单", "点单特典"],
    sources: [media("东方Project × Cure Maid Cafe", "Collabo Cafe", "https://collabo-cafe.com/zh-hans/events/collabo/toho-project-cafe-curemaid-cafe-akihabara-2026/", "2026-10-10")],
  },
  {
    id: "powerpuff-zetteria-2026", ipIds: ["powerpuff-girls"], title: "飞天小女警 × Zetteria", brand: "Zetteria", brandShort: "Z", category: "fastfood", region: "日本", location: "日本参与门店",
    startDate: "2026-10-21", endDate: null, announcedAt: "2026-10-10", updatedAt: "2026-10-21",
    summary: "飞天小女警主题餐饮与门店联动，包含限定包装及角色周边。", tags: ["主题餐饮", "角色包装", "门店联动"],
    sources: [media("飞天小女警 × Zetteria", "Collabo Cafe", "https://collabo-cafe.com/zh-hans/events/collabo/the-powerpuff-girls-shop-tieup-zetteria-wakuwaku-2026/", "2026-10-10")],
  },
  {
    id: "sakura-treevillage-2026", ipIds: ["cardcaptor-sakura"], title: "魔卡少女樱 × TreeVillage Cafe", brand: "TreeVillage Cafe", brandShort: "T", category: "cafe", region: "日本", location: "东京 / 大阪 / 博多",
    startDate: "2026-12-12", endDate: "2027-02-11", announcedAt: "2026-10-31", updatedAt: "2026-10-31",
    summary: "以「居家咖啡厅」为主题的巡回活动，将推出限定菜单与周边。", tags: ["三城巡回", "限定菜单", "即将开始"],
    sources: [media("魔卡少女樱 × 树之村", "Collabo Cafe", "https://collabo-cafe.com/zh-hans/events/collabo/ccsakura-dear-my-heart-tree-village-2026/", "2026-10-31")],
  },
  {
    id: "windbreaker-sweets-2026", ipIds: ["wind-breaker"], title: "WIND BREAKER × 甜点天堂 第二弹", brand: "Sweets Paradise", brandShort: "S", category: "cafe", region: "日本", location: "全国 6 家门店",
    startDate: "2026-12-01", endDate: "2026-12-27", announcedAt: "2026-10-31", updatedAt: "2026-10-31",
    summary: "第二弹主题咖啡活动，联名菜单、赠品与新绘周边信息将陆续公开。", tags: ["第二弹", "六家门店", "新绘周边"],
    sources: [media("WIND BREAKER × SuiPara 第二弹", "Collabo Cafe", "https://collabo-cafe.com/zh-hans/events/collabo/wind-breaker-cafe-sweets-paradise-vol2-2026/", "2026-10-31")],
  },
  {
    id: "bungo-animate-2026", ipIds: ["bungo-stray-dogs"], title: "文豪野犬 × Animate Cafe 巡回店", brand: "Animate Cafe", brandShort: "A", category: "cafe", region: "日本", location: "所泽樱花城",
    startDate: "2026-11-14", endDate: "2026-11-15", announcedAt: "2026-10-31", updatedAt: "2026-10-31",
    summary: "六位角色的和服主题饮品，附赠杯垫与亚克力立牌等特典。", tags: ["限定两天", "和服主题", "点单特典"],
    sources: [media("文豪野犬 × Animate Cafe 巡回店", "Collabo Cafe", "https://collabo-cafe.com/zh-hans/events/collabo/bungo-stray-dogs-animate-cafe-tokorozawa-sakura-town-2026/", "2026-10-31")],
  },
  {
    id: "miku-bullpulu-2026", ipIds: ["hatsune-miku"], title: "初音未来 × Bull Pulu 珍珠奶茶", brand: "Bull Pulu", brandShort: "B", category: "tea", region: "日本", location: "日本参与门店",
    startDate: "2026-05-01", endDate: "2026-05-20", announcedAt: "2026-04-10", updatedAt: "2026-05-01",
    summary: "六款 Vocaloid 角色主题饮品，附赠限定杯垫并推出原创周边。", tags: ["六款饮品", "限定杯垫", "原创周边"],
    sources: [media("初音未来 × Bull Pulu", "Have a Good Holiday", "https://haveagood-holiday.com/zh-CN/articles/hatsune-miku-bull-pulu-collaboration-2026", "2026-04-10")],
  },
  {
    id: "mahoyaku-bullpulu-2026", ipIds: ["promise-of-wizard"], title: "魔法使的约定 × Bull Pulu", brand: "Bull Pulu", brandShort: "B", category: "tea", region: "日本", location: "Bull Pulu 各门店",
    startDate: "2026-09-25", endDate: "2026-10-18", announcedAt: "2026-09-16", updatedAt: "2026-09-25",
    summary: "以各国魔法使为灵感的主题饮品与台湾古早味蛋糕，附随机角色杯垫。", tags: ["主题饮品", "随机杯垫", "限定周边"],
    sources: [media("魔法使的约定 × Bull Pulu", "Collabo Cafe", "https://collabo-cafe.com/zh-hans/events/collabo/gkmarketing-4ub68mlp", "2026-09-16")],
  },
  {
    id: "neverland-princess-2026", ipIds: ["promised-neverland"], title: "约定的梦幻岛十周年 × 公主咖啡", brand: "Princess Cafe", brandShort: "P", category: "cafe", region: "日本", location: "东京 / 大阪",
    startDate: "2026-08-25", endDate: "2026-09-11", announcedAt: "2026-08-01", updatedAt: "2026-08-25",
    summary: "十周年纪念主题咖啡，呈现角色菜单、限定特典与纪念周边。", tags: ["十周年", "双城活动", "纪念周边"],
    sources: [media("约定的梦幻岛十周年 × 公主咖啡厅", "Collabo Cafe", "https://collabo-cafe.com/zh-hans/events/collabo/dorama-ceza65ox/", "2026-08-01")],
  },
  {
    id: "tutu-shuyi-2026", ipIds: ["big-ear-tutu"], title: "大耳朵图图 × 书亦烧仙草", brand: "书亦烧仙草", brandShort: "书", category: "tea", region: "中国大陆", location: "全国参与门店",
    startDate: "2026-09-30", endDate: "2026-10-07", announcedAt: "2026-09-25", updatedAt: "2026-09-30",
    summary: "「一起快乐秋游」主题饮品、主题门店与图图周边。", tags: ["快乐秋游", "主题门店", "童年动画"],
    sources: [media("Drink IP Collab Timeline", "Chinese Food Wiki", "https://www.chinesefoodwiki.org/index.php?title=Drink_IP_Collab_Timeline", "2026-09-30")],
  },
  {
    id: "tears-chapanda-2025", ipIds: ["tears-of-themis"], title: "未定事件簿 × 茶百道", brand: "茶百道", brandShort: "茶", category: "tea", region: "中国大陆", location: "全国参与门店及主题商场",
    startDate: "2025-11-27", endDate: "2025-12-31", announcedAt: "2025-11-20", updatedAt: "2025-11-27", statusOverride: "ended",
    summary: "联名饮品与周边，并设置主题商场、城市大屏及主题公交等线下打卡点。", tags: ["线下打卡", "主题商场", "角色周边"],
    sources: [media("茶百道未定事件簿联名活动", "233 乐园", "https://www.233leyuan.com/post-detail/2059144057662578688", "2025-11-27")],
  },
];

export const getIp = (id: string) => ips.find((ip) => ip.id === id);
