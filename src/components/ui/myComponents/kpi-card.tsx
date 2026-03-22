import type { ReactNode } from "react"

type KpiCardProps = {
    title: string
    value: string
    previousLabel?: string
    previousValue?: string
    change?: string
    positive?: boolean
    icon?: ReactNode
    accentColor?: string
    accentBg?: string
}

export default function KpiCard({
    title,
    value,
    previousLabel = "Período anterior:",
    previousValue = "R$ 0,00",
    change = "0%",
    positive = true,
    icon,
    accentColor,
    accentBg
}: KpiCardProps) {
    return (
        <div className="rounded-2xl border border-[#D0D9D6] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
                <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                        backgroundColor: accentBg,
                        color: accentColor
                    }}
                >
                    {icon}
                </div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
            </div>

            <h3 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                {value}
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-500">{previousLabel}</span>
                <span className="text-slate-700">{previousValue}</span>

                <span
                    className={`font-semibold ${positive ? "text-[#297B49]" : "text-red-500"
                        }`}
                >
                    {positive ? "↗" : "↘"} {change}
                </span>
            </div>
        </div>
    )
}