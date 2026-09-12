import type {
  DimKey,
  EventType,
  ExpansionMode,
  FiveDims,
  InstCategory,
  InstStageTag,
} from './types'

/** 文明起点：公元 2026 年的当代人类社会 */
export const START_YEAR = 2026

/** 每个文明体维护的代表个体数量（分层混合：个体级行为 + 群体统计汇总） */
export const AGENTS_PER_TRIBE = 200

/** 单帧最多执行的 tick 数，防止切后台回来时卡死 */
export const MAX_TICKS_PER_FRAME = 8

/** 历史环形缓冲上限 */
export const HISTORY_LIMIT = 2000

/** 存档结构版本，用于迁移与字段兜底 */
export const SAVE_VERSION = 2

export const DIM_KEYS: DimKey[] = ['de', 'zhi', 'ti', 'mei', 'lao']

export interface DimMeta {
  key: DimKey
  label: string
  short: string
  color: string
  glow: string
  /** 该维度的自述 */
  desc: string
  /** 该维度主导的文明侧写 */
  influence: string
}

export const DIM_META: Record<DimKey, DimMeta> = {
  de: {
    key: 'de',
    label: '德',
    short: '德',
    color: '#4ADE80',
    glow: 'rgba(74,222,128,0.55)',
    desc: '道德协作：社会信任、公共精神、对弱者的照护与契约自觉',
    influence: '决定内部冲突与犯罪率，德行越高，制度执行成本越低',
  },
  zhi: {
    key: 'zhi',
    label: '智',
    short: '智',
    color: '#22D3EE',
    glow: 'rgba(34,211,238,0.55)',
    desc: '认知科技：教育水平、研究能力、抽象思维与工程实现力',
    influence: '直接驱动科技进步，进而解锁更高文明阶段',
  },
  ti: {
    key: 'ti',
    label: '体',
    short: '体',
    color: '#FF6B5B',
    glow: 'rgba(255,107,91,0.55)',
    desc: '体质武力：健康水平、寿命、劳动耐受与军事动员潜力',
    influence: '决定寿命与人口自然增长，也决定战争胜负',
  },
  mei: {
    key: 'mei',
    label: '美',
    short: '美',
    color: '#A855F7',
    glow: 'rgba(168,85,247,0.55)',
    desc: '艺术幸福：审美创造、文化认同、意义感与生活满意度',
    influence: '抬升幸福指数并反向滋养德行，是长期稳定的压舱石',
  },
  lao: {
    key: 'lao',
    label: '劳',
    short: '劳',
    color: '#F2B84B',
    glow: 'rgba(242,184,75,0.55)',
    desc: '生产劳动：组织效率、产能规模、基础设施与物流能力',
    influence: '决定粮食与物资产出，是人口与扩张的物质基础',
  },
}

export const DIM_DEFAULT: FiveDims = { de: 62, zhi: 66, ti: 68, mei: 68, lao: 70 }

/** 时间常数（特征年限），用于各子系统的收敛速度 */
export const TAU = {
  dim: 55,
  happiness: 12,
  food: 8,
  tech: 45,
  military: 22,
  relations: 34,
  expansion: 140,
  enforcement: 26,
  moral: 65,
  agent: 40,
}

/** 人口推演参数（对数域） */
export const POP = {
  birthBase: 0.0165,
  deathBase: 0.0115,
  /** 承载上限附近一个数量级内增长线性衰减 */
  roomSpan: 1.1,
  /** 人口压力参考点（2026 年全球约 10^9.9） */
  pressureRef: 9.9,
  logFloor: 5.5,
  logCeiling: 24,
}

/** 承载上限 log10 = 基准 + 殖民地项 + 疆域项 + 科技项 + 升维项 */
export const CARRY = {
  base: 9.9,
  colony: 0.55,
  reach: 0.35,
  tech: 0.02,
  techRef: 70,
  ascension: 1.2,
}

/** 文明指数：连续、不封顶，阶段只是它的分档映射 */
export const CIV = {
  weightTech: 0.4,
  weightPop: 0.22,
  weightColony: 0.16,
  weightReach: 0.12,
  weightDim: 0.1,
  popRef: 9.9,
  popSpan: 9,
  colonySpan: 10,
  reachRef: -3.5,
  reachSpan: 9,
  ascensionWeight: 6,
}

/** 科技推演参数 */
export const TECH = {
  growth: 2.4,
  /** 超过 100 后边际递减 */
  retreat: 130,
  colonyBonus: 0.012,
  reachBonus: 0.008,
  militaryCost: 0.006,
}

/** 疆域与扩张参数 */
export const EXPANSION = {
  /** 单次扩张行动的科技门槛 */
  techGate: 88,
  baseSuccess: 0.18,
  colonyGain: 0.06,
  reachGain: 0.05,
  fleetGain: 0.07,
  /** 殖民地规模超过该值且制度差异过大时分裂出子文明 */
  splitColonyLog: 7.5,
  splitTension: 0.55,
}

/**
 * 疆域操作台的三类神迹。
 * 成功率公式同时被引擎（world.ts 的 pushExpansion）与 UI 的预估标签消费，
 * 保证面板上写着的概率就是下一次点击真实生效的概率。
 */
export interface ExpansionModeMeta {
  key: ExpansionMode
  label: string
  desc: string
  /** 反噬描述，供操作台展示风险 */
  risk: string
}

export const EXPANSION_MODES: ExpansionModeMeta[] = [
  {
    key: 'colonize',
    label: '加速殖民',
    desc: '集中资源外拓，成功则定居星系与疆域半径同时抬升，并小幅增强舰队。',
    risk: '船队失联将扣除粮食、士气与军事储备。',
  },
  {
    key: 'fortify',
    label: '收缩防线',
    desc: '放弃最外层据点，疆域半径回落，换取更高的军事动员与内部安定。',
    risk: '不承担失败风险，但疆域半径不可逆地退让一档。',
  },
  {
    key: 'relay',
    label: '建立中继',
    desc: '在中继节点上点亮航标，舰队当量与科技同步受益，扩张阻力下降。',
    risk: '不承担失败风险，收益幅度小于一次成功的殖民。',
  },
]

/** 加速殖民的成功率：科技越高压制门槛，劳维提供组织效率，殖民地越多边际收益越低 */
export function colonizeChance(tech: number, lao: number, logColonies: number): number {
  const gate = Math.max(0, (tech - EXPANSION.techGate) / 120)
  const raw = EXPANSION.baseSuccess + gate * 0.5 + (lao / 100) * 0.22 - logColonies * 0.02
  return Math.min(0.85, Math.max(0.05, raw))
}

/** 战争与冲突参数 */
export const CONFLICT = {
  warThreshold: -52,
  warChance: 0.055,
  peaceThreshold: 34,
  relationFloor: -100,
  relationCeil: 100,
}

/** 个体与突变参数 */
export const AGENT = {
  lifespanBase: 74,
  lifespanTech: 0.28,
  lifespanAscension: 6,
  driftToMean: 0.06,
  noise: 0.9,
  talentMutateChance: 0.012,
  geniusThreshold: 0.82,
}

/**
 * 展示层标签元数据。
 * 法典卡片、筛选胶囊、编年史事件流与时间线都从这里取标签与配色，
 * 保证同一类制度/事件在任何面板里都以同一种颜色出现。
 */
export interface InstCategoryMeta {
  key: InstCategory
  label: string
  color: string
  desc: string
}

export const INST_CATEGORY_ORDER: InstCategory[] = [
  'criminal',
  'civil',
  'economic',
  'religious',
  'military',
  'custom',
]

export const INST_CATEGORY_META: Record<InstCategory, InstCategoryMeta> = {
  criminal: { key: 'criminal', label: '刑法', color: '#F87171', desc: '界定罪行与刑罚，直接压制暴力与欺诈' },
  civil: { key: 'civil', label: '民法', color: '#22D3EE', desc: '调整个体间的权利、身份与契约关系' },
  economic: { key: 'economic', label: '经济', color: '#F2B84B', desc: '规定产权、税收、贸易与资源分配' },
  religious: { key: 'religious', label: '宗教', color: '#A855F7', desc: '处理信仰、仪式与神圣秩序的边界' },
  military: { key: 'military', label: '军事', color: '#FF6B5B', desc: '授权武力使用并约束战争行为' },
  custom: { key: 'custom', label: '习俗', color: '#4ADE80', desc: '不成文的惯例被写入条文的过渡形态' },
}

export interface InstStageMeta {
  key: InstStageTag
  label: string
  color: string
}

export const INST_STAGE_ORDER: InstStageTag[] = [
  'info',
  'ai',
  'planetary',
  'stellar',
  'interstellar',
  'galactic',
  'transcendent',
]

export const INST_STAGE_META: Record<InstStageTag, InstStageMeta> = {
  info: { key: 'info', label: '当代', color: '#6E8BFF' },
  ai: { key: 'ai', label: '智能', color: '#22D3EE' },
  planetary: { key: 'planetary', label: '行星', color: '#34D399' },
  stellar: { key: 'stellar', label: '恒星系', color: '#6E8BFF' },
  interstellar: { key: 'interstellar', label: '星际', color: '#FF6B5B' },
  galactic: { key: 'galactic', label: '银河', color: '#F2B84B' },
  transcendent: { key: 'transcendent', label: '超越', color: '#A855F7' },
}

/** 进入该阶段索引后，「银河法典」专区开始收纳跨星系律法 */
export const GALACTIC_STAGE_INDEX = 5

export interface EventMeta {
  key: EventType
  label: string
  color: string
}

export const EVENT_ORDER: EventType[] = [
  'tech',
  'disaster',
  'war',
  'culture',
  'divine',
  'law',
  'moral',
  'expansion',
  'stage',
]

export const EVENT_META: Record<EventType, EventMeta> = {
  tech: { key: 'tech', label: '科技', color: '#22D3EE' },
  disaster: { key: 'disaster', label: '灾难', color: '#F87171' },
  war: { key: 'war', label: '战争', color: '#FF6B5B' },
  culture: { key: 'culture', label: '文化', color: '#A855F7' },
  divine: { key: 'divine', label: '神谕', color: '#F2B84B' },
  law: { key: 'law', label: '立法', color: '#6E8BFF' },
  moral: { key: 'moral', label: '道德', color: '#A78BFA' },
  expansion: { key: 'expansion', label: '疆域', color: '#34D399' },
  stage: { key: 'stage', label: '跃迁', color: '#FBBF24' },
}

/** 制度推演的基准值 */
export const INST = {
  enforcementBase: 30,
  enforcementTechBonus: 0.35,
  enforcementDimBonus: 0.25,
  prevalenceBase: 18,
  prevalenceDimBonus: 0.42,
  strictnessLimit: 100,
  /** 严苛度过高开始反噬幸福与创新的阈值 */
  harshThreshold: 62,
  /** 制度差异张力累积速度 */
  divergenceRate: 0.55,
}
