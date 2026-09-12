import { useEffect, useRef, useState } from 'react'

export interface ElementSize {
  width: number
  height: number
}

/**
 * ResizeObserver 尺寸监听，供 Canvas 与 recharts 容器使用。
 * 返回值直接写入 state，但只有尺寸真正变化时才触发重渲染。
 */
export function useElementSize<T extends HTMLElement>(): {
  ref: React.RefObject<T>
  size: ElementSize
} {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    const apply = () => {
      const rect = node.getBoundingClientRect()
      const width = Math.round(rect.width)
      const height = Math.round(rect.height)
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    }

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return { ref, size }
}
