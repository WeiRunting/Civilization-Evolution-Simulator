import type { DimKey, EventType, FiveDims, InstCategory, InstStageTag } from '../types'

/** 制度萌芽的触发条件：把「演化涌现」写成可组合的规则表，而不是写死的时间线 */
export interface EmergenceCondition {
  minStage?: number
  maxStage?: number
  minTech?: number
  maxTech?: number
  minPopLog?: number
  minHappiness?: number
  maxHappiness?: number
  minColoniesLog?: number
  /** 维度区间条件，例如 德 >= 70 */
  dims?: Partial<Record<DimKey, { min?: number; max?: number }>>
  /** 需要某个已生效制度存在（按标题匹配） */
  requiresLaw?: string
  requiresMoral?: string
}

export interface LawBlueprint {
  id: string
  title: string
  category: InstCategory
  stageTag: InstStageTag
  strictness: number
  enforcement: number
  reason: string
  condition: EmergenceCondition
  /** 每个 tick 的涌现概率权重，最终按阶段与候选数归一化 */
  weight: number
}

export interface MoralBlueprint {
  id: string
  title: string
  bindDim: DimKey | 'conflict'
  stageTag: InstStageTag
  strength: number
  prevalence: number
  reason: string
  condition: EmergenceCondition
  weight: number
}

export interface EventEffect {
  tech?: number
  happiness?: number
  food?: number
  military?: number
  logPopulationDelta?: number
  logColoniesDelta?: number
  dims?: Partial<FiveDims>
}

export interface EventBlueprint {
  id: string
  type: EventType
  stageTag: InstStageTag
  minStage?: number
  maxStage?: number
  minTech?: number
  minPopLog?: number
  /** 每个 tick 的触发概率 */
  chance: number
  /** 冷却年数，避免同一事件反复刷屏 */
  cooldown: number
  /** 是否只对单个文明体生效（false 表示全局性事件） */
  tribal: boolean
  title: (tribeName: string) => string
  detail: (tribeName: string) => string
  effect: EventEffect
}
