"use client"

type MobileKPICardProps = {
  title: string
  value: string
  status?: "ok" | "warn" | "critical"
  onClick?: () => void
  sparkline?: number[]
}

const STATUS_STYLES: Record<NonNullable<MobileKPICardProps["status"]>, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  critical: "border-red-500/40 bg-red-500/10 text-red-200",
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = Math.max(1, max - min)
  const width = 96
  const height = 30

  const coords = points
    .map((point, idx) => {
      const x = (idx / (points.length - 1)) * width
      const y = height - ((point - min) / range) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="h-[30px] w-full max-w-[96px]"
      aria-label="Trend sparkline"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
        opacity="0.9"
      />
    </svg>
  )
}

export function MobileKPICard({
  title,
  value,
  status = "ok",
  onClick,
  sparkline,
}: MobileKPICardProps) {
  const Component = onClick ? "button" : "div"
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={
        "w-full rounded-xl border px-3 py-2 text-left " +
        "touch-target transition-colors " +
        STATUS_STYLES[status] +
        (onClick ? " hover:bg-accent/20" : "")
      }
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-mobile-caption uppercase tracking-wide text-muted-foreground">{title}</div>
          <div className="mt-0.5 truncate text-mobile-body font-semibold">{value}</div>
        </div>
        {sparkline && sparkline.length > 1 ? <Sparkline points={sparkline} /> : null}
      </div>
    </Component>
  )
}

