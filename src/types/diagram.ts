/**
 * DiagramSpec — the JSON schema that DeepSeek AI generates
 * and JSXGraph renders into an interactive SVG diagram.
 *
 * Design goals:
 *  - Simple enough for an LLM to produce reliably
 *  - Rich enough to cover all P3 math diagram types
 *  - Serialisable to SVG for PDF embedding
 */

export type DiagramType =
  | 'clock'         // Analog clock showing a specific time
  | 'number_line'   // Number line with marked points / jumps
  | 'polygon'       // Any polygon (triangle, square, rectangle, etc.)
  | 'circle'        // Circle with optional radius / diameter label
  | 'angle'         // Two rays forming an angle with label
  | 'compass'       // Compass rose showing N/S/E/W directions
  | 'bar_chart'     // Simple bar chart (up to 5 bars)
  | 'fraction_bar'  // Shaded fraction bar
  | 'grid'          // Dot/grid for counting or area
  | 'custom'        // Fallback: raw JSXGraph element list

// ── Clock ────────────────────────────────────────────────────────────────────
export interface ClockSpec {
  type: 'clock'
  hour: number    // 1–12
  minute: number  // 0, 15, 30, 45 (quarter-hour steps for P3)
}

// ── Number line ──────────────────────────────────────────────────────────────
export interface NumberLineSpec {
  type: 'number_line'
  min: number
  max: number
  /** Points to mark with a dot and optional label */
  marks: Array<{ value: number; label?: string }>
  /** Arrows showing jumps (e.g. +4 from 3 to 7) */
  jumps?: Array<{ from: number; to: number; label?: string }>
}

// ── Polygon ──────────────────────────────────────────────────────────────────
export interface PolygonSpec {
  type: 'polygon'
  /** Vertices as [x, y] pairs in a coordinate system where (0,0) is centre */
  vertices: Array<[number, number]>
  /** Optional label for each side */
  sideLabels?: string[]
  /** Optional label for each angle */
  angleLabels?: string[]
  /** Fill colour (CSS colour string, default light blue) */
  fillColor?: string
}

// ── Circle ───────────────────────────────────────────────────────────────────
export interface CircleSpec {
  type: 'circle'
  radius: number
  /** Show radius line with label */
  radiusLabel?: string
  /** Show diameter line with label */
  diameterLabel?: string
}

// ── Angle ────────────────────────────────────────────────────────────────────
export interface AngleSpec {
  type: 'angle'
  /** Degrees of the angle (0–360) */
  degrees: number
  /** Label shown inside the arc (e.g. "90°", "銳角") */
  label?: string
}

// ── Compass ──────────────────────────────────────────────────────────────────
export interface CompassSpec {
  type: 'compass'
  /** Which direction to highlight (optional) */
  highlight?: 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW'
}

// ── Bar chart ────────────────────────────────────────────────────────────────
export interface BarChartSpec {
  type: 'bar_chart'
  bars: Array<{ label: string; value: number }>
  yLabel?: string
  title?: string
}

// ── Fraction bar ─────────────────────────────────────────────────────────────
export interface FractionBarSpec {
  type: 'fraction_bar'
  /** Total number of equal parts */
  total: number
  /** Number of shaded parts */
  shaded: number
  /** Label above bar (e.g. "3/8") */
  label?: string
}

// ── Grid ─────────────────────────────────────────────────────────────────────
export interface GridSpec {
  type: 'grid'
  rows: number
  cols: number
  /** Cells to shade: array of [row, col] (0-indexed) */
  shaded?: Array<[number, number]>
}

// ── Custom (raw JSXGraph elements) ───────────────────────────────────────────
export interface CustomSpec {
  type: 'custom'
  /** Raw JSXGraph board.create() calls as a serialisable description */
  elements: Array<{
    kind: string        // e.g. "point", "line", "circle", "text"
    args: unknown[]     // positional args to board.create()
    attrs?: Record<string, unknown>
  }>
}

export type DiagramSpec =
  | ClockSpec
  | NumberLineSpec
  | PolygonSpec
  | CircleSpec
  | AngleSpec
  | CompassSpec
  | BarChartSpec
  | FractionBarSpec
  | GridSpec
  | CustomSpec
