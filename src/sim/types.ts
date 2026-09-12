/** 五维键名：德 / 智 / 体 / 美 / 劳 */
export type DimKey = 'de' | 'zhi' | 'ti' | 'mei' | 'lao'

export type FiveDims = Record<DimKey, number>

/** 各维度已完成的升维（超脱）层数，使 0-100 的手感在无限发展中依然有效 */
export type Ascension = Record<DimKey, number>

/** 代表个体：每个文明体维护固定数量的个体，承载出生、死亡、天赋突变等个体级行为 */
export interface Individual {
  id: number
  age: number
  alive: boolean
  /** 天赋偏置 -1..1，驱动「天才 / 圣人 / 暴君」类个体事件 */
  talent: number
  dims: FiveDims
}

export type InstCategory = 'criminal' | 'civil' | 'economic' | 'religious' | 'military' | 'custom'

export type InstStageTag =
  | 'info'
  | 'ai'
  | 'planetary'
  | 'stellar'
  | 'interstellar'
  | 'galactic'
  | 'transcendent'

/** 法律条文：文明演化中自行涌现，也可被玩家（神谕）增删改 */
export interface LawItem {
  id: string
  title: string
  category: InstCategory
  stageTag: InstStageTag
  /** 'all' 表示适用于全体文明体，否则为指定文明体 id 列表 */
  scope: 'all' | string[]
  /** 严苛度 0-100 */
  strictness: number
  /** 执行率 0-100 */
  enforcement: number
  enactedYear: number
  originReason: string
  isActive: boolean
  customByGod: boolean
}

/** 道德约束：软性社会规范，与法律互为因果 */
export interface MoralItem {
  id: string
  title: string
  bindDim: DimKey | 'conflict'
  stageTag: InstStageTag
  /** 内化强度 0-100 */
  strength: number
  /** 普及率 0-100 */
  prevalence: number
  originYear: number
  originReason: string
  isActive: boolean
  customByGod: boolean
}

/** 制度效果投影：由制度层输出、被演化方程消费的系数集合 */
export interface InstitutionEffects {
  crimeRate: number
  revoltRisk: number
  innovation: number
  fertility: number
  happiness: number
  conflictDelta: number
  divergenceTension: number
  dimDrift: FiveDims
  longevity: number
  expansion: number
}

/**
 * 文明体（族群）。人口、殖民地、疆域、舰队等量级型指标一律以 log10 域存储，
 * 以支撑银河帝国级（10^18 以上）的数值规模而不溢出。
 */
export interface Tribe {
  id: string
  name: string
  color: string
  parentId: string | null
  foundingYear: number
  logPopulation: number
  tech: number
  happiness: number
  food: number
  military: number
  /** log10(定居星系数量)，2026 年为 0（仅一颗行星） */
  logColonies: number
  /** log10(疆域半径 / 光年)，2026 年约为 -3.5 */
  logReach: number
  /** log10(舰队与星际影响力当量) */
  logFleets: number
  dims: FiveDims
  ascension: Ascension
  agents: Individual[]
  alive: boolean
}

export type EventType =
  | 'tech'
  | 'disaster'
  | 'war'
  | 'culture'
  | 'divine'
  | 'law'
  | 'moral'
  | 'stage'
  | 'expansion'

export interface EventLog {
  id: string
  year: number
  type: EventType
  title: string
  detail: string
  tribeId?: string
}

export interface HistoryPoint {
  year: number
  stageIndex: number
  civIndex: number
  logPopulation: number
  tech: number
  happiness: number
  food: number
  dims: FiveDims
  lawCount: number
  moralCount: number
}

export interface WorldState {
  version: number
  seed: number
  rngState: number
  startYear: number
  year: number
  stageIndex: number
  civIndex: number
  /** 单步（1 tick）跨越的年限，随文明等级自适应放大 */
  yearsPerTick: number
  tribes: Tribe[]
  laws: LawItem[]
  morals: MoralItem[]
  relations: number[][]
  chronicle: EventLog[]
  /** 历史环形缓冲：只追加，神谕干预不回改既有曲线 */
  history: HistoryPoint[]
  nextAgentId: number
  nextSeq: number
  /** 一次性标记与事件冷却，键为标记名，值为年份或计数 */
  flags: Record<string, number>
}

export type GodScope = 'all' | string

/** 疆域操作台的三类神迹：加速殖民 / 收缩防线 / 建立中继 */
export type ExpansionMode = 'colonize' | 'fortify' | 'relay'

export type GodAction =
  | { kind: 'setDims'; scope: GodScope; dims: Partial<FiveDims> }
  | { kind: 'adjustDim'; scope: GodScope; dim: DimKey; delta: number }
  | { kind: 'setPopulation'; scope: GodScope; logPopulation: number }
  | { kind: 'scalePopulation'; scope: GodScope; factor: number }
  | {
      kind: 'addTribe'
      name: string
      color: string
      dims: FiveDims
      logPopulation: number
      tech?: number
    }
  | { kind: 'removeTribe'; tribeId: string }
  | { kind: 'renameTribe'; tribeId: string; name: string; color?: string }
  | { kind: 'upsertLaw'; law: LawItem }
  | { kind: 'removeLaw'; id: string }
  | { kind: 'toggleLaw'; id: string }
  | { kind: 'upsertMoral'; moral: MoralItem }
  | { kind: 'removeMoral'; id: string }
  | { kind: 'toggleMoral'; id: string }
  | { kind: 'pushExpansion'; scope: GodScope; mode: ExpansionMode }

export interface EmergenceResult {
  laws: LawItem[]
  morals: MoralItem[]
  logs: EventLog[]
}
