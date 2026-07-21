'use client'
/**
 * DynamicDiagram
 * Renders a DiagramSpec using JSXGraph.
 * Must be imported with Next.js dynamic() and ssr: false because JSXGraph
 * requires browser globals (document, window).
 *
 * Usage:
 *   const DynamicDiagram = dynamic(() => import('@/components/DynamicDiagram'), { ssr: false })
 *   <DynamicDiagram spec={spec} width={300} height={300} />
 *
 * For PDF generation, call getSvgString() on the ref to get the SVG markup.
 */

import { useEffect, useRef, useId, forwardRef, useImperativeHandle } from 'react'
import type { DiagramSpec } from '@/types/diagram'

// JSXGraph is loaded via CDN in the print page; in the app we import it directly.
// We use a dynamic require so the module is only loaded client-side.

export interface DynamicDiagramHandle {
  /** Returns the SVG markup of the rendered diagram, or null if not ready. */
  getSvgString: () => string | null
}

interface Props {
  spec: DiagramSpec
  width?: number
  height?: number
  className?: string
}

const DynamicDiagram = forwardRef<DynamicDiagramHandle, Props>(
  ({ spec, width = 280, height = 280, className }, ref) => {
    const containerId = useId().replace(/:/g, '_')
    const boardRef = useRef<unknown>(null)

    useImperativeHandle(ref, () => ({
      getSvgString: () => {
        const el = document.getElementById(containerId)
        if (!el) return null
        const svg = el.querySelector('svg')
        return svg ? new XMLSerializer().serializeToString(svg) : null
      },
    }))

    useEffect(() => {
      // Dynamically import JSXGraph to avoid SSR issues
      import('jsxgraph').then((JXG) => {
        const JXGLib = (JXG as unknown as { JSXGraph: unknown }).JSXGraph || JXG.default || JXG
        const board = (JXGLib as { initBoard: (id: string, opts: unknown) => unknown }).initBoard(containerId, {
          boundingbox: [-6, 6, 6, -6],
          axis: false,
          showNavigation: false,
          showCopyright: false,
          pan: { enabled: false },
          zoom: { enabled: false },
          keepaspectratio: true,
        })
        boardRef.current = board
        renderSpec(board, JXGLib as Record<string, unknown>, spec)
      }).catch((err) => {
        console.error('[DynamicDiagram] Failed to load JSXGraph:', err)
      })

      return () => {
        if (boardRef.current) {
          try {
            import('jsxgraph').then((JXG) => {
              const JXGLib = (JXG as unknown as { JSXGraph: unknown }).JSXGraph || JXG.default || JXG;
              (JXGLib as { freeBoard: (b: unknown) => void }).freeBoard(boardRef.current)
            })
          } catch { /* ignore cleanup errors */ }
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerId, JSON.stringify(spec)])

    return (
      <div
        id={containerId}
        className={className}
        style={{ width, height, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}
      />
    )
  }
)

DynamicDiagram.displayName = 'DynamicDiagram'
export default DynamicDiagram

// ─────────────────────────────────────────────────────────────────────────────
// Renderer — translates DiagramSpec into JSXGraph board.create() calls
// ─────────────────────────────────────────────────────────────────────────────

function renderSpec(board: unknown, JXG: Record<string, unknown>, spec: DiagramSpec) {
  const b = board as {
    create: (type: string, args: unknown[], attrs?: unknown) => unknown
    suspendUpdate: () => void
    unsuspendUpdate: () => void
  }

  b.suspendUpdate()

  try {
    switch (spec.type) {
      case 'clock':
        renderClock(b, spec.hour, spec.minute)
        break
      case 'number_line':
        renderNumberLine(b, spec)
        break
      case 'polygon':
        renderPolygon(b, spec)
        break
      case 'circle':
        renderCircle(b, spec)
        break
      case 'angle':
        renderAngle(b, spec)
        break
      case 'compass':
        renderCompass(b, spec.highlight)
        break
      case 'bar_chart':
        renderBarChart(b, spec)
        break
      case 'fraction_bar':
        renderFractionBar(b, spec)
        break
      case 'grid':
        renderGrid(b, spec)
        break
      case 'custom':
        renderCustom(b, spec)
        break
    }
  } finally {
    b.unsuspendUpdate()
  }

  void JXG // suppress unused warning
}

// ── Clock ────────────────────────────────────────────────────────────────────
function renderClock(
  b: { create: (type: string, args: unknown[], attrs?: unknown) => unknown },
  hour: number,
  minute: number
) {
  // Clock face
  b.create('circle', [[0, 0], [0, 5]], { strokeColor: '#333', strokeWidth: 2, fillColor: '#fff' })

  // Hour markers
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI / 2) - (i * Math.PI) / 6
    const x1 = 4.4 * Math.cos(angle)
    const y1 = 4.4 * Math.sin(angle)
    const x2 = 5 * Math.cos(angle)
    const y2 = 5 * Math.sin(angle)
    b.create('line', [[x1, y1], [x2, y2]], { strokeColor: '#333', strokeWidth: 2, straightFirst: false, straightLast: false })
  }

  // Hour numbers
  const nums = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI / 2) - (i * Math.PI) / 6
    const x = 3.7 * Math.cos(angle)
    const y = 3.7 * Math.sin(angle)
    b.create('text', [x - 0.3, y - 0.3, nums[i]], { fontSize: 14, strokeColor: '#333', fixed: true })
  }

  // Hour hand
  const hourAngle = (Math.PI / 2) - ((hour % 12 + minute / 60) * Math.PI) / 6
  b.create('line', [[0, 0], [2.8 * Math.cos(hourAngle), 2.8 * Math.sin(hourAngle)]],
    { strokeColor: '#1a1a1a', strokeWidth: 4, straightFirst: false, straightLast: false })

  // Minute hand
  const minAngle = (Math.PI / 2) - (minute * Math.PI) / 30
  b.create('line', [[0, 0], [4.0 * Math.cos(minAngle), 4.0 * Math.sin(minAngle)]],
    { strokeColor: '#1a1a1a', strokeWidth: 2.5, straightFirst: false, straightLast: false })

  // Centre dot
  b.create('point', [0, 0], { size: 3, strokeColor: '#333', fillColor: '#333', fixed: true, name: '' })
}

// ── Number line ──────────────────────────────────────────────────────────────
function renderNumberLine(
  b: { create: (type: string, args: unknown[], attrs?: unknown) => unknown },
  spec: import('@/types/diagram').NumberLineSpec
) {
  const { min, max, marks, jumps } = spec
  const range = max - min
  const scale = 9 / range  // map [min,max] to [-4.5, 4.5]
  const toX = (v: number) => (v - min) * scale - 4.5

  // Axis line
  b.create('line', [[toX(min) - 0.3, 0], [toX(max) + 0.3, 0]],
    { strokeColor: '#333', strokeWidth: 2, straightFirst: false, straightLast: false })

  // Tick marks and labels
  for (let v = min; v <= max; v++) {
    const x = toX(v)
    b.create('line', [[x, -0.3], [x, 0.3]], { strokeColor: '#333', strokeWidth: 1.5, straightFirst: false, straightLast: false })
    b.create('text', [x - 0.2, -0.9, String(v)], { fontSize: 13, strokeColor: '#333', fixed: true })
  }

  // Marked points
  marks.forEach(({ value, label }) => {
    const x = toX(value)
    b.create('point', [x, 0], { size: 5, fillColor: '#2563eb', strokeColor: '#2563eb', fixed: true, name: '' })
    if (label) {
      b.create('text', [x - 0.3, 1.0, label], { fontSize: 13, strokeColor: '#2563eb', fixed: true })
    }
  })

  // Jump arrows
  jumps?.forEach(({ from, to, label }) => {
    const x1 = toX(from)
    const x2 = toX(to)
    const mid = (x1 + x2) / 2
    b.create('line', [[x1, 0.5], [x2, 0.5]], { strokeColor: '#dc2626', strokeWidth: 2, straightFirst: false, straightLast: false })
    if (label) {
      b.create('text', [mid - 0.3, 1.3, label], { fontSize: 13, strokeColor: '#dc2626', fixed: true })
    }
  })
}

// ── Polygon ──────────────────────────────────────────────────────────────────
function renderPolygon(
  b: { create: (type: string, args: unknown[], attrs?: unknown) => unknown },
  spec: import('@/types/diagram').PolygonSpec
) {
  const { vertices, sideLabels, angleLabels, fillColor } = spec
  const pts = vertices.map((v, i) =>
    b.create('point', v, { size: 0, name: '', fixed: true, visible: false }) as unknown
  )

  b.create('polygon', pts, {
    fillColor: fillColor || '#bfdbfe',
    fillOpacity: 0.5,
    strokeColor: '#1d4ed8',
    strokeWidth: 2,
    vertices: { visible: false },
  })

  // Side labels (midpoints)
  if (sideLabels) {
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i]
      const bv = vertices[(i + 1) % vertices.length]
      const mx = (a[0] + bv[0]) / 2
      const my = (a[1] + bv[1]) / 2
      if (sideLabels[i]) {
        b.create('text', [mx, my, sideLabels[i]], { fontSize: 13, strokeColor: '#1d4ed8', fixed: true })
      }
    }
  }

  // Angle labels (at vertices)
  if (angleLabels) {
    vertices.forEach((v, i) => {
      if (angleLabels[i]) {
        b.create('text', [v[0] + 0.2, v[1] + 0.2, angleLabels[i]], { fontSize: 12, strokeColor: '#6b7280', fixed: true })
      }
    })
  }
}

// ── Circle ───────────────────────────────────────────────────────────────────
function renderCircle(
  b: { create: (type: string, args: unknown[], attrs?: unknown) => unknown },
  spec: import('@/types/diagram').CircleSpec
) {
  const { radius, radiusLabel, diameterLabel } = spec
  const r = Math.min(radius, 4.5)

  b.create('circle', [[0, 0], [0, r]], {
    strokeColor: '#1d4ed8', strokeWidth: 2, fillColor: '#bfdbfe', fillOpacity: 0.3,
  })

  if (radiusLabel) {
    b.create('line', [[0, 0], [r, 0]], { strokeColor: '#dc2626', strokeWidth: 2, straightFirst: false, straightLast: false })
    b.create('text', [r / 2 - 0.2, 0.4, radiusLabel], { fontSize: 13, strokeColor: '#dc2626', fixed: true })
  }

  if (diameterLabel) {
    b.create('line', [[-r, 0], [r, 0]], { strokeColor: '#059669', strokeWidth: 2, straightFirst: false, straightLast: false })
    b.create('text', [-0.5, 0.5, diameterLabel], { fontSize: 13, strokeColor: '#059669', fixed: true })
  }

  b.create('point', [0, 0], { size: 3, fillColor: '#333', strokeColor: '#333', fixed: true, name: '' })
}

// ── Angle ────────────────────────────────────────────────────────────────────
function renderAngle(
  b: { create: (type: string, args: unknown[], attrs?: unknown) => unknown },
  spec: import('@/types/diagram').AngleSpec
) {
  const { degrees, label } = spec
  const rad = (degrees * Math.PI) / 180
  const len = 4

  // Base ray (horizontal right)
  b.create('line', [[0, 0], [len, 0]], { strokeColor: '#1d4ed8', strokeWidth: 2, straightFirst: false, straightLast: false })
  // Second ray
  b.create('line', [[0, 0], [len * Math.cos(rad), len * Math.sin(rad)]],
    { strokeColor: '#1d4ed8', strokeWidth: 2, straightFirst: false, straightLast: false })

  // Arc
  const arcR = 1.5
  b.create('arc', [[0, 0], [arcR, 0], [arcR * Math.cos(rad), arcR * Math.sin(rad)]],
    { strokeColor: '#dc2626', strokeWidth: 1.5 })

  // Label
  const midAngle = rad / 2
  const lx = 2.2 * Math.cos(midAngle)
  const ly = 2.2 * Math.sin(midAngle)
  b.create('text', [lx, ly, label || `${degrees}°`], { fontSize: 14, strokeColor: '#dc2626', fixed: true })

  b.create('point', [0, 0], { size: 3, fillColor: '#333', strokeColor: '#333', fixed: true, name: '' })
}

// ── Compass ──────────────────────────────────────────────────────────────────
function renderCompass(
  b: { create: (type: string, args: unknown[], attrs?: unknown) => unknown },
  highlight?: string
) {
  const dirs = [
    { label: 'N', x: 0, y: 4.5 }, { label: 'S', x: 0, y: -4.5 },
    { label: 'E', x: 4.5, y: 0 }, { label: 'W', x: -4.5, y: 0 },
  ]
  dirs.forEach(({ label, x, y }) => {
    b.create('line', [[0, 0], [x * 0.85, y * 0.85]], {
      strokeColor: label === highlight ? '#dc2626' : '#374151',
      strokeWidth: label === highlight ? 3 : 2,
      straightFirst: false, straightLast: false,
    })
    b.create('text', [x, y - 0.3, label], {
      fontSize: 16, strokeColor: label === highlight ? '#dc2626' : '#374151', fixed: true,
    })
  })
  b.create('point', [0, 0], { size: 3, fillColor: '#333', strokeColor: '#333', fixed: true, name: '' })
}

// ── Bar chart ────────────────────────────────────────────────────────────────
function renderBarChart(
  b: { create: (type: string, args: unknown[], attrs?: unknown) => unknown },
  spec: import('@/types/diagram').BarChartSpec
) {
  const { bars, title } = spec
  const n = bars.length
  const maxVal = Math.max(...bars.map(bar => bar.value), 1)
  const barW = 7 / (n * 2)
  const startX = -3.5

  bars.forEach((bar, i) => {
    const x = startX + i * barW * 2 + barW / 2
    const h = (bar.value / maxVal) * 8 - 4
    b.create('polygon', [
      [x, -4], [x + barW, -4], [x + barW, h], [x, h],
    ].map(([px, py]) => b.create('point', [px, py], { visible: false, fixed: true, name: '' })), {
      fillColor: '#3b82f6', fillOpacity: 0.7, strokeColor: '#1d4ed8', strokeWidth: 1,
      vertices: { visible: false },
    })
    b.create('text', [x + barW / 4, -4.8, bar.label], { fontSize: 11, strokeColor: '#374151', fixed: true })
    b.create('text', [x + barW / 4, h + 0.2, String(bar.value)], { fontSize: 11, strokeColor: '#1d4ed8', fixed: true })
  })

  // Axis
  b.create('line', [[-4, -4], [4, -4]], { strokeColor: '#374151', strokeWidth: 2, straightFirst: false, straightLast: false })
  b.create('line', [[-4, -4], [-4, 4.5]], { strokeColor: '#374151', strokeWidth: 2, straightFirst: false, straightLast: false })

  if (title) {
    b.create('text', [-1, 5.2, title], { fontSize: 13, strokeColor: '#374151', fixed: true })
  }
}

// ── Fraction bar ─────────────────────────────────────────────────────────────
function renderFractionBar(
  b: { create: (type: string, args: unknown[], attrs?: unknown) => unknown },
  spec: import('@/types/diagram').FractionBarSpec
) {
  const { total, shaded, label } = spec
  const barW = 9 / total
  const startX = -4.5

  for (let i = 0; i < total; i++) {
    const x = startX + i * barW
    const pts = [[x, -1], [x + barW, -1], [x + barW, 1], [x, 1]]
      .map(([px, py]) => b.create('point', [px, py], { visible: false, fixed: true, name: '' }))
    b.create('polygon', pts, {
      fillColor: i < shaded ? '#3b82f6' : '#e5e7eb',
      fillOpacity: 0.8,
      strokeColor: '#374151',
      strokeWidth: 1.5,
      vertices: { visible: false },
    })
  }

  if (label) {
    b.create('text', [-0.5, 2.2, label], { fontSize: 16, strokeColor: '#1d4ed8', fixed: true })
  }
}

// ── Grid ─────────────────────────────────────────────────────────────────────
function renderGrid(
  b: { create: (type: string, args: unknown[], attrs?: unknown) => unknown },
  spec: import('@/types/diagram').GridSpec
) {
  const { rows, cols, shaded } = spec
  const cellW = 8 / cols
  const cellH = 8 / rows
  const startX = -4
  const startY = 4

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * cellW
      const y = startY - r * cellH
      const isShaded = shaded?.some(([sr, sc]) => sr === r && sc === c) ?? false
      const pts = [[x, y - cellH], [x + cellW, y - cellH], [x + cellW, y], [x, y]]
        .map(([px, py]) => b.create('point', [px, py], { visible: false, fixed: true, name: '' }))
      b.create('polygon', pts, {
        fillColor: isShaded ? '#3b82f6' : '#f9fafb',
        fillOpacity: 0.7,
        strokeColor: '#9ca3af',
        strokeWidth: 1,
        vertices: { visible: false },
      })
    }
  }
}

// ── Custom ───────────────────────────────────────────────────────────────────
function renderCustom(
  b: { create: (type: string, args: unknown[], attrs?: unknown) => unknown },
  spec: import('@/types/diagram').CustomSpec
) {
  spec.elements.forEach(({ kind, args, attrs }) => {
    try {
      b.create(kind, args, attrs)
    } catch (e) {
      console.warn('[DynamicDiagram] custom element error:', kind, e)
    }
  })
}
