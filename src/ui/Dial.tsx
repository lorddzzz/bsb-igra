import { useRef } from 'react'
import { RINGS } from '../wave/logic'

const CX = 160
const CY = 160
const R = 145

/** Point on the arc for a value from 0 (left) to 100 (right). */
function at(value: number, radius = R): [number, number] {
  const a = Math.PI * (1 - value / 100)
  return [CX + radius * Math.cos(a), CY - radius * Math.sin(a)]
}

function wedge(from: number, to: number): string {
  const a = Math.max(0, from)
  const b = Math.min(100, to)
  const [x1, y1] = at(a)
  const [x2, y2] = at(b)
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`
}

export interface Needle {
  value: number
  color: string
  label?: string
}

/**
 * The half-circle dial. Shows the scoring rings when `target` is given, the needles passed in,
 * and when `onChange` is given, lets the player drag their own needle.
 */
export function Dial({
  left,
  right,
  target,
  needles = [],
  value,
  onChange,
}: {
  left: string
  right: string
  target?: number
  needles?: Needle[]
  value?: number
  onChange?: (value: number) => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const move = (e: React.PointerEvent) => {
    if (!onChange || !svg.current) return
    const box = svg.current.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * 320 - CX
    const y = CY - ((e.clientY - box.top) / box.height) * 180
    const angle = Math.atan2(Math.max(y, 0), x)
    onChange(Math.round(Math.min(100, Math.max(0, 100 * (1 - angle / Math.PI)))))
  }
  const all = value === undefined ? needles : [...needles, { value, color: '#ffffff' }]

  return (
    <div className="dial">
      <svg
        ref={svg}
        viewBox="0 0 320 180"
        className={onChange ? 'dial-svg live' : 'dial-svg'}
        onPointerDown={(e) => {
          if (!onChange) return
          e.currentTarget.setPointerCapture(e.pointerId)
          move(e)
        }}
        onPointerMove={(e) => e.buttons && move(e)}
      >
        <defs>
          <linearGradient id="dial-face" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5fd0ff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ff5fd2" stopOpacity="0.28" />
          </linearGradient>
        </defs>
        <path d={wedge(0, 100)} fill="url(#dial-face)" stroke="rgba(170,210,255,0.35)" />
        {target !== undefined &&
          [...RINGS].reverse().map((r) => (
            <path
              key={r.points}
              d={wedge(target - r.within, target + r.within)}
              className={`ring ring-${r.points}`}
            />
          ))}
        {target !== undefined &&
          RINGS.map((r, i) => {
            const inner = i === 0 ? 0 : RINGS[i - 1].within
            const [x, y] = at(target + (inner + r.within) / 2, R - 16)
            const [x2, y2] = at(target - (inner + r.within) / 2, R - 16)
            return (
              <g key={r.points} className="ring-label">
                <text x={x} y={y}>
                  {r.points}
                </text>
                {i > 0 && (
                  <text x={x2} y={y2}>
                    {r.points}
                  </text>
                )}
              </g>
            )
          })}
        {all.map((n, i) => {
          const [x, y] = at(n.value, R - 4)
          return (
            <g key={i}>
              <line x1={CX} y1={CY} x2={x} y2={y} stroke={n.color} strokeWidth="4" strokeLinecap="round" />
              {n.label && (
                <text x={x} y={y - 6} className="needle-label" fill={n.color}>
                  {n.label}
                </text>
              )}
            </g>
          )
        })}
        <circle cx={CX} cy={CY} r="9" fill="#dce8f7" />
      </svg>
      <div className="dial-ends">
        <span>← {left}</span>
        <span>{right} →</span>
      </div>
    </div>
  )
}
