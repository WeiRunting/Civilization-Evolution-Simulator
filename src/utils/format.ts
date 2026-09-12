/**
 * 展示层格式化统一入口：视图组件只从这里取格式化函数，
 * 保证「同一数值在任何面板里都以同一种方式呈现」。
 */
export {
  formatBigNumber,
  formatInt,
  formatLogNumber,
  formatPercent,
  formatYear,
  fromLog10,
} from '../sim/num'
import { formatLogNumber } from '../sim/num'

/** 纪元跨度：1 年 / 12 年 / 4.2 万年 */
export function formatSpan(years: number): string {
  if (!Number.isFinite(years) || years <= 0) return '—'
  if (years < 1) return `${years.toFixed(2)} 年`
  if (years < 10) return `${years.toFixed(years % 1 === 0 ? 0 : 1)} 年`
  if (years < 10000) return `${Math.round(years)} 年`
  if (years < 1e8) return `${(years / 10000).toFixed(1)} 万年`
  if (years < 1e12) return `${(years / 1e8).toFixed(1)} 亿年`
  return `${formatLogNumber(Math.log10(years), 1)} 年`
}

/** 输入框里接受「12.5万」「3亿」这类中文大数写法 */
export function parseBigNumber(input: string): number | null {
  const text = input.trim().replace(/[,，\s]/g, '')
  if (!text) return null
  const units: Array<[string, number]> = [
    ['亿', 1e8],
    ['万', 1e4],
    ['京', 1e16],
    ['兆', 1e12],
    ['千', 1e3],
  ]
  for (const [unit, scale] of units) {
    if (text.endsWith(unit)) {
      const base = Number(text.slice(0, -unit.length))
      if (!Number.isFinite(base)) return null
      return base * scale
    }
  }
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

/** 带符号数值，用于制度影响力提示 */
export function formatDelta(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}`
}

export function formatStepCost(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0.0 ms'
  if (ms < 10) return `${ms.toFixed(1)} ms`
  return `${Math.round(ms)} ms`
}
