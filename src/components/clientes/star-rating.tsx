import { Star } from "lucide-react"

export function StarRating({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-slate-400">Sem dados</span>
  }

  const rounded = Math.round(value)

  return (
    <div className="flex items-center gap-0.5" title={`${value} de 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${
            index < rounded ? "fill-[#297B49] text-[#297B49]" : "text-slate-300 dark:text-slate-700"
          }`}
        />
      ))}
    </div>
  )
}
