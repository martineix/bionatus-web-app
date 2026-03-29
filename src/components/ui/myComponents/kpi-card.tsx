import type { ReactNode } from "react"

type ComparisonItem = {
  label: string
  value: string
  change: string
  positive: boolean
}

type KpiCardProps = {
  title: string
  value: string
  icon: ReactNode
  accentColor: string
  accentBg: string
  comparisons?: ComparisonItem[]
}

export default function KpiCard({
  title,
  value,
  icon,
  accentColor,
  accentBg,
  comparisons = [],
}: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            backgroundColor: accentBg,
            color: accentColor,
          }}
        >
          {icon}
        </div>

        <p className="text-base font-medium text-slate-500 dark:text-slate-400 sm:text-lg">
          {title}
        </p>
      </div>

      <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
        {value}
      </h3>

      <div className="mt-4 space-y-2">
        {comparisons.map((item) => (
          <div
            key={item.label}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm"
          >
            <span className="text-slate-500 dark:text-slate-400">
              {item.label}
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {item.value}
            </span>
            <span
              className={`font-semibold ${
                item.positive ? "text-[#297B49]" : "text-red-500"
              }`}
            >
              {item.positive ? "↗" : "↘"} {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}