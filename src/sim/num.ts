/**
 * 对数域大数工具。
 *
 * 银河帝国级文明的人口可达 10^18 以上，远超 JS 安全整数（9e15）。
 * 因此引擎内部所有「量级型」指标（人口、殖民地、疆域、舰队）统一以 log10 域存储：
 *   - 乘法 → 对数相加
 *   - 加法 → log10Add(a, b) = log10(10^a + 10^b)
 * 只在进行 UI 展示时才还原为可读的大数。
 */

export const LN10 = Math.LN10

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return value < min ? min : value > max ? max : value
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

/** 把线性值安全地转成 log10 域，并设下限避免 -Infinity */
export function toLog10(value: number, floor = -12): number {
  return Math.max(Math.log10(Math.max(value, 0)), floor)
}

export function fromLog10(logValue: number): number {
  if (logValue > 308) return Number.MAX_VALUE
  if (logValue < -308) return 0
  return Math.pow(10, logValue)
}

/** log10(10^a + 10^b)，用于对数域上的加法 */
export function log10Add(a: number, b: number): number {
  if (a === -Infinity) return b
  if (b === -Infinity) return a
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return hi + Math.log10(1 + Math.pow(10, lo - hi))
}

export function log10Mul(a: number, b: number): number {
  return a + b
}

/** 单次时间步的收敛因子：tau 为特征年限，步长越大越接近 1，天然饱和、不发散 */
export function converge(years: number, tau: number): number {
  if (years <= 0) return 0
  return 1 - Math.exp(-years / Math.max(tau, 1e-6))
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/** 饱和增长：越接近上限增长越慢 */
export function saturate(current: number, target: number, years: number, tau: number, maxDelta = Infinity): number {
  const t = converge(years, tau)
  const delta = (target - current) * t
  const capped = clamp(delta, -maxDelta, maxDelta)
  return current + capped
}

/** 对数域上的速率折算：d(log10 N)/dt = r / ln(10) */
export function rateToLogDelta(ratePerYear: number, years: number): number {
  return (ratePerYear * years) / LN10
}

const CN_UNITS: Array<{ exp: number; name: string }> = [
  { exp: 44, name: '载' },
  { exp: 40, name: '正' },
  { exp: 36, name: '涧' },
  { exp: 32, name: '沟' },
  { exp: 28, name: '穰' },
  { exp: 24, name: '秭' },
  { exp: 20, name: '垓' },
  { exp: 16, name: '京' },
  { exp: 12, name: '万亿' },
  { exp: 8, name: '亿' },
  { exp: 4, name: '万' },
]

/** 由 log10 值格式化中文大数，超出「载」量级后退化为 10^n 科学计数 */
export function formatLogNumber(logValue: number, digits = 2): string {
  if (!Number.isFinite(logValue)) return '—'
  if (logValue < 3) {
    return String(Math.round(fromLog10(logValue)))
  }
  for (const unit of CN_UNITS) {
    if (logValue >= unit.exp) {
      const scaled = fromLog10(logValue - unit.exp)
      return `${scaled.toFixed(digits)}${unit.name}`
    }
  }
  return `10^${logValue.toFixed(1)}`
}

/** 线性值的中文大数格式化 */
export function formatBigNumber(value: number, digits = 2): string {
  if (value < 1000) return String(Math.round(value))
  return formatLogNumber(Math.log10(value), digits)
}

export function formatPercent(value01: number, digits = 0): string {
  return `${(value01 * 100).toFixed(digits)}%`
}

export function formatYear(year: number): string {
  return year < 0 ? `公元前 ${Math.abs(Math.round(year))} 年` : `${Math.round(year)} 年`
}

/** 千分位整数，用于小数量级展示 */
export function formatInt(value: number): string {
  return Math.round(value).toLocaleString('zh-CN')
}
