import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"

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
  loading?: boolean
  badge?: string
}

export default function KpiCard({
  title,
  value,
  icon,
  accentColor,
  accentBg,
  comparisons = [],
  loading = false,
  badge,
}: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="flex items-center justify-between gap-3">
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

        {badge && !loading && (
          <span className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            {badge}
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-8 w-28 sm:h-9 sm:w-36" />
      ) : (
        <h3 className="mt-4 text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-100 sm:text-3xl">
          {value}
        </h3>
      )}

      <div className="mt-4 space-y-2">
        {comparisons.map((item) => (
          <div
            key={item.label}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm"
          >
            <span className="text-slate-500 dark:text-slate-400">
              {item.label}
            </span>
            <span className="tabular-nums text-slate-700 dark:text-slate-300">
              {item.value}
            </span>
            <span
              className={`tabular-nums font-semibold ${
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