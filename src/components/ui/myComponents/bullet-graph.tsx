import { formatCurrencyBRL } from "@/lib/format"

type BulletGraphProps = {
  valor: number
  meta: number | null
}

const FAIXAS = [
  {
    min: 100,
    texto: "text-[#006426] dark:text-[#7DD3A2]",
    barra: "bg-[#006426] dark:bg-[#7DD3A2]",
  },
  {
    min: 70,
    texto: "text-amber-700 dark:text-amber-400",
    barra: "bg-amber-500 dark:bg-amber-400",
  },
  {
    min: -Infinity,
    texto: "text-red-600 dark:text-red-400",
    barra: "bg-red-500 dark:bg-red-400",
  },
]

export default function BulletGraph({ valor, meta }: BulletGraphProps) {
  if (!meta || meta <= 0) {
    return null
  }

  const pct = (valor / meta) * 100
  const faixa = FAIXAS.find((f) => pct >= f.min) ?? FAIXAS[FAIXAS.length - 1]
  const largura = Math.min(100, Math.max(0, pct))

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2 text-xs sm:text-sm">
        <span className={`font-semibold tabular-nums ${faixa.texto}`}>
          {formatCurrencyBRL(valor)}{" "}
          <span className="font-normal text-slate-500 dark:text-slate-400">
            / {formatCurrencyBRL(meta)}
          </span>
        </span>
        <span className={`font-semibold tabular-nums ${faixa.texto}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${faixa.barra}`}
          style={{ width: `${largura}%` }}
        />
      </div>
    </div>
  )
}
