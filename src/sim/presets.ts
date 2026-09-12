import type { FiveDims } from './types'
import { START_YEAR } from './config'

export interface TribePreset {
  id: string
  name: string
  color: string
  /** log10(人口)，2026 年真实量级 */
  logPopulation: number
  tech: number
  happiness: number
  food: number
  military: number
  dims: FiveDims
}

/**
 * 2026 年的初始文明体。
 * 文明起点是当代：人口取现实量级，科技已是信息社会水平，制度池从国际公约与现代法律起步。
 */
export const INITIAL_2026_TRIBES: TribePreset[] = [
  {
    id: 'cn',
    name: '中国',
    color: '#FF6B5B',
    logPopulation: 9.149,
    tech: 76,
    happiness: 66,
    food: 84,
    military: 80,
    dims: { de: 68, zhi: 77, ti: 72, mei: 71, lao: 84 },
  },
  {
    id: 'in',
    name: '印度',
    color: '#F2B84B',
    logPopulation: 9.164,
    tech: 66,
    happiness: 62,
    food: 72,
    military: 72,
    dims: { de: 64, zhi: 68, ti: 64, mei: 73, lao: 74 },
  },
  {
    id: 'eu',
    name: '欧盟',
    color: '#6E8BFF',
    logPopulation: 8.653,
    tech: 78,
    happiness: 74,
    food: 76,
    military: 62,
    dims: { de: 78, zhi: 75, ti: 71, mei: 79, lao: 68 },
  },
  {
    id: 'us',
    name: '美国',
    color: '#22D3EE',
    logPopulation: 8.534,
    tech: 84,
    happiness: 65,
    food: 78,
    military: 92,
    dims: { de: 63, zhi: 81, ti: 66, mei: 75, lao: 70 },
  },
  {
    id: 'ea',
    name: '欧亚联盟',
    color: '#A855F7',
    logPopulation: 8.38,
    tech: 68,
    happiness: 58,
    food: 70,
    military: 78,
    dims: { de: 58, zhi: 70, ti: 67, mei: 66, lao: 65 },
  },
  {
    id: 'asean',
    name: '东盟',
    color: '#4ADE80',
    logPopulation: 8.836,
    tech: 62,
    happiness: 68,
    food: 74,
    military: 60,
    dims: { de: 66, zhi: 63, ti: 68, mei: 70, lao: 77 },
  },
  {
    id: 'au',
    name: '非盟',
    color: '#FBBF24',
    logPopulation: 9.17,
    tech: 50,
    happiness: 58,
    food: 64,
    military: 58,
    dims: { de: 60, zhi: 52, ti: 62, mei: 68, lao: 71 },
  },
  {
    id: 'latam',
    name: '拉美与加勒比',
    color: '#FF8FB1',
    logPopulation: 8.82,
    tech: 58,
    happiness: 64,
    food: 70,
    military: 56,
    dims: { de: 62, zhi: 61, ti: 66, mei: 77, lao: 64 },
  },
]

/** 新增文明体时的属性模板 */
export interface TribeTemplate {
  id: string
  name: string
  desc: string
  tech: number
  dims: FiveDims
}

export const TRIBE_TEMPLATES: TribeTemplate[] = [
  {
    id: 'industrial',
    name: '工业重镇',
    desc: '以制造业与基础设施立身，劳与体的底子极厚，审美与幸福常被牺牲。',
    tech: 66,
    dims: { de: 58, zhi: 62, ti: 76, mei: 52, lao: 88 },
  },
  {
    id: 'finance',
    name: '金融枢纽',
    desc: '以契约、信用与法律服务为业，德与智突出，但生产纵深较薄。',
    tech: 78,
    dims: { de: 74, zhi: 82, ti: 58, mei: 72, lao: 60 },
  },
  {
    id: 'techhub',
    name: '科技走廊',
    desc: '研究机构与工程团队高度聚集，智力密度极高，社会承压也大。',
    tech: 86,
    dims: { de: 64, zhi: 90, ti: 60, mei: 70, lao: 66 },
  },
  {
    id: 'resource',
    name: '资源腹地',
    desc: '依赖矿产与能源输出，体力劳动占比高，制度执行力偏弱。',
    tech: 46,
    dims: { de: 54, zhi: 48, ti: 74, mei: 58, lao: 80 },
  },
  {
    id: 'maritime',
    name: '海洋枢纽',
    desc: '航运与转口贸易造就开放心态，审美多元、道德务实。',
    tech: 70,
    dims: { de: 70, zhi: 68, ti: 68, mei: 76, lao: 74 },
  },
  {
    id: 'ancient',
    name: '文化古国',
    desc: '历史纵深带来极高的文化认同与道德厚度，技术更迭相对迟缓。',
    tech: 54,
    dims: { de: 84, zhi: 60, ti: 62, mei: 86, lao: 58 },
  },
]

/** 治理模板：新建文明体时可预挂的制度倾向 */
export interface GovernanceTemplate {
  id: string
  name: string
  desc: string
  lawSeed: string[]
  moralSeed: string[]
}

export const GOVERNANCE_TEMPLATES: GovernanceTemplate[] = [
  {
    id: 'technocrat',
    name: '技术官僚',
    desc: '以数据与绩效分配资源，执行力强但共情稀薄。',
    lawSeed: ['绩效问责条例', '技术标准强制适用令'],
    moralSeed: ['崇尚效率'],
  },
  {
    id: 'welfare',
    name: '福利国家',
    desc: '高税收高保障，犯罪率低、幸福高，但创新活力被稀释。',
    lawSeed: ['普遍医疗保障法', '累进所得税法'],
    moralSeed: ['照护弱者'],
  },
  {
    id: 'freemarket',
    name: '自由市场',
    desc: '最小干预、最大流动，效率极高但贫富张力持续累积。',
    lawSeed: ['契约自由法', '有限监管原则法'],
    moralSeed: ['自食其力'],
  },
  {
    id: 'mobilize',
    name: '集权动员',
    desc: '可在短期内集中全部资源，代价是幸福与审美的长期压抑。',
    lawSeed: ['紧急状态授权法', '舆论统一管理法'],
    moralSeed: ['服从集体'],
  },
]

/** 2026 年起点已有的国际制度：文明从现代法律与国际公约起步，而非部落习俗 */
export interface SeedInstitution {
  title: string
  category: 'criminal' | 'civil' | 'economic' | 'religious' | 'military' | 'custom'
  strictness: number
  enforcement: number
  reason: string
}

export const SEED_LAWS: SeedInstitution[] = [
  {
    title: '《联合国宪章》',
    category: 'custom',
    strictness: 32,
    enforcement: 54,
    reason: '两次世界大战之后，人类第一次尝试用成文规则约束国家间暴力。',
  },
  {
    title: '《世界人权宣言》',
    category: 'civil',
    strictness: 26,
    enforcement: 48,
    reason: '对个体尊严的最低共识，成为后续一切权利话语的源头。',
  },
  {
    title: '《不扩散核武器条约》',
    category: 'military',
    strictness: 68,
    enforcement: 62,
    reason: '当毁灭能力超过政治理性时，人类选择把它锁进条约。',
  },
  {
    title: '《巴黎气候协定》',
    category: 'economic',
    strictness: 44,
    enforcement: 38,
    reason: '大气层无法分割，减排因此成为第一项真正意义上的行星级公共事务。',
  },
  {
    title: '《劳动基本权利公约》',
    category: 'economic',
    strictness: 40,
    enforcement: 52,
    reason: '工业化两百年的血汗代价，最终凝固为工时与结社权的底线。',
  },
  {
    title: '《数据与隐私保护法》',
    category: 'civil',
    strictness: 38,
    enforcement: 56,
    reason: '信息社会把「人」变成了数据，法律不得不重新定义人的边界。',
  },
]

export interface SeedMoral {
  title: string
  bindDim: 'de' | 'zhi' | 'ti' | 'mei' | 'lao' | 'conflict'
  strength: number
  prevalence: number
  reason: string
}

export const SEED_MORALS: SeedMoral[] = [
  {
    title: '契约精神',
    bindDim: 'de',
    strength: 58,
    prevalence: 62,
    reason: '陌生人社会得以运转的前提：承诺必须可被追索。',
  },
  {
    title: '职业伦理',
    bindDim: 'lao',
    strength: 62,
    prevalence: 58,
    reason: '专业分工越细，越依赖从业者自我约束而非外部监督。',
  },
  {
    title: '科学求实',
    bindDim: 'zhi',
    strength: 66,
    prevalence: 54,
    reason: '承认自己可能犯错，是社会唯一可自我纠错的德性。',
  },
  {
    title: '环保意识',
    bindDim: 'mei',
    strength: 48,
    prevalence: 52,
    reason: '当污染第一次被看见，人与自然的关系就不再是征服。',
  },
]

export const START_YEAR_CONST = START_YEAR
