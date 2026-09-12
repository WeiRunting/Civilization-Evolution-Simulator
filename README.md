# 文明进化模拟器 · Civilization Evolution Simulator

**简体中文** | [English](./README.en.md)

**在线演示：<https://civilization-evolution-simulator.vercel.app/>** —— 无需安装，打开即玩。

上帝视角的文明推演控制台。纪元自 **公元 2026 年** 的当代信息社会起算，多个文明体在**德、智、体、美、劳**五维驱动下自行演化；
你可以随时以「神谕」调整五维与人口，查看并改写演化过程中自行涌现的法律体系与道德约束。

文明**没有上限，也不存在通关条件**：从信息时代一路推演到行星文明、恒星系文明、星系文明，直至银河帝国式的统一政体，
再进入由公式继续外推出的「超越层 · Ω-n」，K 值（卡尔达肖夫指数）与单步年限都会随之继续增长。

## 特性速览

| 特性 | 说明 |
| --- | --- |
| 无限演化 | 文明指数 `civIndex` 是连续、不封顶的浮点数，阶段只是它的分档映射，超出预设阶梯后按公式继续外推 |
| 自发涌现 | 法律与道德随「年份 + 阶段 + 文明指数 + 各族群五维 + 科技 + 幸福 + 已发生事件」自行涌现并分阶段升级 |
| 纯函数制度层 | `projectEffects(world, tribe)` 是纯函数，界面预估与引擎执行复用同一份逻辑，**面板上的预估就是下一 tick 真实发生的变化** |
| 确定性可复现 | `mulberry32 + 种子`，同种子 + 同干预序列 + 同编辑序列可完全复现 |
| 数值稳定 | 量级型指标统一在 log10 域运算，从根上杜绝 `Infinity` 与 `NaN` |
| 零后端 | 纯前端 SPA，状态在内存 + `localStorage`，无网络请求、无账号、无遥测 |

## 前置要求

- **Node.js ≥ 18**（Vite 5 的要求；推荐 Node 20 或 22 LTS）
- npm（随 Node 一同安装）

自检：

```bash
node -v
npm -v
```

## 快速开始

```bash
git clone https://github.com/WeiRunting/Civilization-Evolution-Simulator.git
cd Civilization-Evolution-Simulator
npm ci          # 按 package-lock.json 精确安装（也可用 npm install）
npm run dev     # 启动开发服务器
```

打开终端提示的地址（默认 <http://localhost:5173>）即可开始推演。

也可以在仓库页选择 `Code → Download ZIP` 下载解压，再从上一步 `npm ci` 开始执行。

## 全部脚本

| 命令 | 作用 | 输出 / 地址 |
| --- | --- | --- |
| `npm run dev` | 启动开发服务器（热更新） | <http://localhost:5173> |
| `npm run build` | `tsc -b` 类型检查 + `vite build` 生产构建 | `dist/` |
| `npm run preview` | 本地预览生产构建结果 | <http://localhost:4173> |
| `npm test` | 运行 Vitest 引擎单测（一次性） | 测试结果 |
| `npm run test:watch` | 单测 watch 模式 | 改代码自动重跑 |
| `npm run lint` | ESLint 检查 | 问题列表 |

> `vite.config.ts` 已设置 `host: '0.0.0.0'` 与 `allowedHosts: true`，启动后终端会额外打印 `Network:` 地址，
> 同一局域网内的手机、平板可直接访问（Windows 防火墙首次会弹窗，选择「允许」）。

## 常见问题

| 症状 | 原因 | 解决 |
| --- | --- | --- |
| `ETARGET ... No matching version found for zustand@^5.0.15` | 部分国内镜像源同步滞后 | `npm config set registry https://registry.npmjs.org` 后重新安装 |
| `npm ci` 报 lock 文件与 `package.json` 不一致 | 依赖变更后未同步更新 lock | 改用 `npm install`，并提交更新后的 `package-lock.json` |
| 5173 端口被占用 | 已有一个 dev server 在运行 | `npm run dev -- --port 5174` |
| `npm run dev` 正常但 `npm run build` 报类型错误 | dev 模式不做类型检查，`build` 中的 `tsc -b` 才检查 | 按报错修复类型，不影响开发预览 |
| PowerShell 提示「无法加载文件 …npm.ps1」 | 脚本执行策略限制 | 用 `npm.cmd run dev`，或执行 `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| 安装后 `node_modules` 约 230 MB | React + Vite + Vitest + ESLint 全量依赖 | 属正常现象；可用 `npm cache clean --force` 清理 npm 下载缓存 |

## 部署

`npm run build` 产出的 `dist/` 是**纯静态文件**，可托管在任何静态服务器上。

- **Vercel**：导入本仓库，自动识别 Vite，Build Command `npm run build`，Output Directory `dist`，零配置。
  本项目已部署于此：<https://civilization-evolution-simulator.vercel.app/>，推送到 `main` 分支后会自动重新构建上线。
  提示：`*.vercel.app` 在大陆地区访问可能不稳定，如需长期稳定访问建议绑定自定义域名。
- **Netlify**：同上，发布目录填 `dist`。
- **GitHub Pages**：需在 `vite.config.ts` 补充 `base: '/Civilization-Evolution-Simulator/'`（否则 `/assets/*` 会 404），再通过 Pages 分支或 Actions 工作流发布。
- **自有服务器 / Nginx**：将 `dist/` 内容放到站点根目录即可；单页应用建议配置 fallback 到 `index.html`。

## 五维含义

| 键名 | 维度 | 在方程中的作用 |
| --- | --- | --- |
| `de` | 德 | 抑制犯罪率与起义风险，提高道德内化效率，降低族群冲突倾向 |
| `zhi` | 智 | 驱动科技与创新指数，缩短制度涌现所需的认知门槛 |
| `ti` | 体 | 提升人口承载力与粮食产出，降低死亡率 |
| `mei` | 美 | 提升幸福指数与文化认同，缓解分裂张力 |
| `lao` | 劳 | 提升组织效率、殖民成功率与执行率上限 |

五维取值范围为 **0–100**。当某一维达到 100 且满足阶段与科技条件时会触发**升维（超脱）**：
该维以「遗产加成」的形式永久保留，整体乘数指数级放大一次，数值回落至基准区，于是 0–100 的手感良好的滑块在无限发展中始终有效。

## 文明阶段与时间尺度

文明指数 `civIndex` 是**连续且不封顶**的浮点数，由科技、人口量级、殖民地量级、疆域量级、五维综合分、升维层数与制度存量加权合成，
阶段只是它的分档映射。超出预设阶梯后，`deriveStage(index)` 会按公式继续生成阶段名与效果参数。

| 阶段 | 名称 | K 值 | 单步年限 | 文明指数门槛 |
| --- | --- | --- | --- | --- |
| 0 | 当代 · 信息纪元 | 0.73 | 1 年 | 0 |
| 1 | 近未来 · 智能纪元 | 0.79 | 2 年 | 44 |
| 2 | 行星文明 | 1.02 | 5 年 | 56 |
| 3 | 恒星系文明 | 1.86 | 15 年 | 68 |
| 4 | 星际文明 | 2.31 | 40 年 | 78 |
| 5 | 星系文明 | 2.94 | 150 年 | 88 |
| 6 | 银河帝国 | 3.05 | 600 年 | 97 |
| 7 | 超越层 | 3.28 | 2500 年 | 112 |
| 8+ | 超越层 · Ω-n | 3.28 + 0.36n | 2500 × 5ⁿ（上限 5×10⁸） | 按公式递增 |

**时间尺度自适应**：界面顶部与底部时间控制台会明确显示「单步 = N 年」。引擎内部所有速率（出生、死亡、寿命、科技、殖民）
均按 `yearsPerTick` 折算，因此跨尺度推进不会导致数值错乱。`1x / 2x / 5x` 只作用于「每秒 tick 数」，与单步年限正交；
「单步」按钮的语义始终是「前进 1 tick」。

## 玩法

- **俯瞰**：世界总览指标卡、文明等级阶梯与到下一阶段的进度、五维雷达图、个体点阵图、历史趋势折线图。
- **疆域**：Canvas 星图展示殖民地分布、疆域半径、贸易线与冲突热区；势力卡对比各文明体规模；
  扩张操作台提供「加速殖民 / 收缩防线 / 建立中继」三类神迹，并给出成功率与反噬风险预估。
- **天条**：法律体系与道德约束双 Tab，支持按阶段与类别筛选、搜索、启停、改写与删除；
  进入星系纪元后会开启鎏金描边的「银河法典」专区；「演化时间线」抽屉可查看每条制度何时因何涌现、何时被神谕修订，并支持两条制度并列对比。
- **编年史**：按类型筛选的事件瀑布，支持输入年份（可用「12万」这类大数单位）快速滚动定位。

**神谕干预**只影响未来：历史数组仅追加，已经写下的曲线不会因为一次调参而回溯变形。

## 制度参数说明

制度是一等公民，通过**效果投影**进入演化方程。`projectEffects(world, tribe)` 是纯函数，输出
`crimeRate / revoltRisk / innovation / fertility / happiness / dimDrift / conflictDelta / divergenceTension` 等系数，
由 `equations.ts` 在每 tick 消费；界面上的「预估影响力」复用同一个纯函数（`compareEffects`），
因此**面板上写着的预估就是下一 tick 真实发生的变化**。

- **律法（LawItem）**
  - `category`：刑法 / 民法 / 经济 / 宗教 / 军事 / 习俗，决定条文的基础作用面。
  - `strictness`（严苛度）：压制犯罪与动乱的力度。超过该类别可承受范围后会**推高起义风险**——严刑能压低犯罪率，但代价是稳定性。
  - `enforcement`（执行率）：条文是否真的落地。执行率过低时，再严苛的法条也只是纸面文字。
  - `scope`：`'all'` 表示全体文明体，或指定文明体 id 数组。
  - `customByGod`：被神谕改写的条文会被标记，并且不会被制度层自动淘汰。
- **道德（MoralItem）**
  - `bindDim`：绑定某一维度（持续产生该维的漂移推力）或 `'conflict'`（抑制族群间冲突）。
  - `strength`（内化强度）：推力大小。
  - `prevalence`（普及率）：普及率不足五成的准则在界面上以虚线弱化，其对五维的实际推力也按比例衰减。

制度随文明等级**自行涌现并分阶段升级**（AI 伦理法、基因编辑条例、地外资源法、殖民宪章、星际战争法、银河法典、机器人法则、心理史学监管等），
涌现条件集中在 `src/sim/emergence.ts` 的规则表中，其维度包括 `year + stage + civIndex + 各族群五维 + 科技 + 幸福 + 已发生事件`。

## 工程结构

「纯函数模拟引擎 / Zustand 桥接层 / React 视图层」三层分离，引擎零 React 依赖，便于单测与回放。

```
src/
├── sim/           # 纯 TS 模拟引擎（22 个 .ts）
│   ├── engine.ts / equations.ts / dims.ts        # 主循环、演化方程、五维动力学
│   ├── expansion.ts / institutions.ts            # 殖民扩张、制度系统
│   ├── institutionStep.ts / emergence.ts         # 制度每步推进、涌现规则表
│   ├── events.ts / stages.ts / world.ts          # 事件、阶段映射、世界状态
│   ├── agents.ts / presets.ts / config.ts        # 个体点阵、初始预设、参数常量
│   ├── num.ts / log.ts / rng.ts / types.ts       # log10 数值工具、格式化、确定性随机、类型
│   ├── pools/                                    # 对象池（减少 GC 压力）
│   └── __tests__/                                # 引擎与制度系统单测
├── store/         # Zustand store 与 localStorage 存档（带 version 字段用于迁移）
├── hooks/         # useSimLoop（rAF 累加器主循环）、useElementSize（ResizeObserver）
├── components/    # 视图层（26 个 .tsx，10 个子目录）
│   └── layout / overview / charts / tribes / controls
│       institutions / chronicle / galaxy / milestones / ui
├── utils/         # 大数格式化、制度纯计算复用、颜色换算
├── App.tsx        # 应用外壳与面板路由
├── main.tsx       # 入口
└── index.css      # Tailwind 入口与全局样式
```

## 技术栈

| 层次 | 选型 |
| --- | --- |
| 视图 | React 18 + TypeScript |
| 状态 | Zustand 5（`localStorage` 持久化 + version 迁移） |
| 构建 | Vite 5 |
| 样式 | Tailwind CSS 3.4、tailwind-merge、tailwindcss-animate |
| 图表 | Recharts 2、原生 Canvas 星图 |
| 图标 | lucide-react、react-icons |
| 测试 | Vitest 2 |
| 规范 | ESLint 9 + typescript-eslint |

## 核心机制

**数值稳定性**：银河帝国级人口可达 10¹⁸ 以上，远超 JS 安全整数上限。因此人口、殖民地、舰队等量级型指标统一在 **log10 域**存储与运算
（加法转对数加法，乘法转指数相加），只在展示时用大数单位格式化（万 / 亿 / 万亿 / 京 / 垓 / 秭…，超出后转 `10^n`）。
所有增长项采用对数饱和形式，从根上杜绝 `Infinity` 与 `NaN`。测试覆盖了「长时段大步长推演十万年不产生 NaN、历史缓冲不超上限」。

**确定性**：`mulberry32 + 种子`，保证「同种子 + 同干预序列 + 同编辑序列」可完全复现；rAF 累加器单帧最多执行 8 个 tick。

**存档**：`localStorage` 本地存档与读档，可随时重置开启新文明；损坏存档会经字段校验与缺省兜底，不会阻断启动。

## 许可

本仓库当前**未附带 LICENSE 文件**。如需转载、二次开发或商用，请先与作者联系。
