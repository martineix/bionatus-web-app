# Histórico de Compras Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nova aba "Histórico de Compras" no accordion Clientes: busca um cliente por nome/CNPJ/código e mostra, numa única tela, todo o histórico de itens comprados por ele (data, produto, quantidade, valores, tipo de movimento, representante).

**Architecture:** Duas RPCs novas e isoladas no Supabase — uma de busca de clientes (RLS-aware, reaproveitando `mv_clientes_pedidos`/`mv_clientes_nomes`) e uma de histórico de itens por CNPJ (join direto em `nexus_itens`/`sankhya_itens` + tabelas de produto, sem passar por `vw_pedidos_v2`, pois essa view não expõe valor unitário nem descrição/marca do produto). O frontend é uma única página com um fluxo de dois estados: busca → lista de resultados → seleção de cliente → histórico completo (reaproveitando `ClientesDataTable` e `ClienteNomeCell` já existentes).

**Tech Stack:** Supabase Postgres (RPC `LANGUAGE sql STABLE SECURITY DEFINER`), React 19 + TypeScript, Tailwind.

## Global Constraints

- RLS é obrigatório nas duas RPCs, via `public._dashboard_rep_visible`, exatamente como em todas as outras RPCs de Clientes.
- `tipo` do item: `'devolucao'` quando `sankhya_cabecalhos.tipmov = 'D'`; senão `'bonificacao'` quando a classificação do tipo de operação é bonificação; senão `'venda'`. Nexus nunca tem devolução.
- `quantidade` e `valor_total` levam sinal negativo em devolução (mesma lógica de `sinal` já usada em `vw_pedidos_v2`).
- `valor_total` líquido de desconto: nexus usa `vlrtot` direto; sankhya usa `vlrtot - vlrdesc` — mesma fórmula de `vw_pedidos_v2`, pra bater com os totais mostrados em qualquer outra tela.
- Exclusões replicadas de `vw_pedidos_v2`: `id_cliente` do nexus fora do intervalo 1–4, representante `<> 'FUNCIONARIOS'`.
- `representante` retornado já é o nome canônico (via `vw_representantes_canonicos`, já existente), com fallback pro nome bruto.
- Sem paginação no banco — a tabela de itens usa a paginação client-side já existente em `ClientesDataTable`.
- Sem framework de testes automatizado. Verificação via SQL direto (`mcp__supabase__execute_sql`) e `npm run build` no frontend.
- Trabalho direto na branch `main`, sem worktree isolado (consentimento já estabelecido nesta sessão).

---

### Task 1: Supabase — RPCs `buscar_clientes_historico` e `get_cliente_historico_compras`

**Files:** nenhum arquivo local — via `mcp__supabase__apply_migration` / `mcp__supabase__execute_sql`.

**Interfaces:**
- Consumes: `mv_clientes_pedidos`, `mv_clientes_nomes`, `vw_representantes_canonicos`, `_dashboard_rep_visible` (todos já existentes); `nexus_cabecalhos`/`nexus_itens`/`nexus_pessoas`/`nexus_produtos`/`nexus_tipos_operacao` e `sankhya_cabecalhos`/`sankhya_itens`/`sankhya_parceiros`/`sankhya_produtos`/`sankhya_vendedores`/`sankhya_tipos_operacao` (todos já existentes).
- Produces: RPC `public.buscar_clientes_historico(p_termo text)` retornando `cnpj, nome, codigo_cliente`; RPC `public.get_cliente_historico_compras(p_cnpj text)` retornando `item_id, data_pedido, pedido, sistema, tipo, produto, marca, quantidade, valor_unitario, valor_total, representante` — ambas consumidas pela Task 2 (frontend).

- [ ] **Step 1: Criar `buscar_clientes_historico`**

Rodar via `mcp__supabase__apply_migration` (name: `create_buscar_clientes_historico`):

```sql
CREATE OR REPLACE FUNCTION public.buscar_clientes_historico(p_termo text)
RETURNS TABLE(cnpj text, nome text, codigo_cliente text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    select distinct n.cnpj, n.nome, n.codigo_cliente
    from public.mv_clientes_pedidos m
    join public.mv_clientes_nomes n on n.cnpj = m.cnpj
    where public._dashboard_rep_visible(m.sistema, m.id_representante, null)
      and (
        n.nome ilike '%' || p_termo || '%'
        or n.cnpj ilike '%' || p_termo || '%'
        or n.codigo_cliente ilike '%' || p_termo || '%'
      )
    order by n.nome
    limit 20;
$function$;

revoke all on function public.buscar_clientes_historico(text) from public, anon;
grant execute on function public.buscar_clientes_historico(text) to authenticated;
```

- [ ] **Step 2: Criar `get_cliente_historico_compras`**

Rodar via `mcp__supabase__apply_migration` (name: `create_get_cliente_historico_compras`):

```sql
CREATE OR REPLACE FUNCTION public.get_cliente_historico_compras(p_cnpj text)
RETURNS TABLE(
  item_id text,
  data_pedido date,
  pedido text,
  sistema integer,
  tipo text,
  produto text,
  marca text,
  quantidade numeric,
  valor_unitario numeric,
  valor_total numeric,
  representante text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    with nexus_base as (
        select
            1 as sistema,
            cab.ppvcod::text as pedido,
            ite.ppviteseq as item_seq,
            cab.data_cadastro_pedido as data_pedido,
            cab.ppvvndcod as id_representante,
            vend.pesnomfan as representante,
            ntop.classificacao,
            null::text as tipmov,
            prod.prddet as produto,
            null::text as marca,
            ite.qtdneg as quantidade,
            ite.vlrunit as valor_unitario,
            ite.vlrtot as valor_total,
            1 as sinal
        from public.nexus_cabecalhos cab
        join public.nexus_itens ite on ite.ppvcod = cab.ppvcod
        join public.nexus_pessoas cli on cli.pescod = cab.ppvclicod
        left join public.nexus_pessoas vend on vend.pescod = cab.ppvvndcod
        left join public.nexus_produtos prod on prod.prdcod = ite.ppviteprdcod
        left join public.nexus_tipos_operacao ntop on ntop.ppvoprcod = cab.ppvoprcod
        where cli.pescpfcnp = p_cnpj
          and cli.pescod not between 1 and 4
    ),
    sankhya_base as (
        select
            2 as sistema,
            cab.nunota::text as pedido,
            ite.sequencia as item_seq,
            cab.data_cadastro_pedido as data_pedido,
            cab.codvend as id_representante,
            ven.vendedor as representante,
            top.classificacao,
            cab.tipmov,
            pro.descrprod as produto,
            pro.marca as marca,
            ite.qtdneg as quantidade,
            ite.vlrunit as valor_unitario,
            ite.vlrtot - coalesce(ite.vlrdesc, 0) as valor_total,
            case when cab.tipmov = 'D' then -1 else 1 end as sinal
        from public.sankhya_cabecalhos cab
        join public.sankhya_itens ite on ite.nunota = cab.nunota
        join public.sankhya_parceiros par on par.codparc = cab.codparc
        left join public.sankhya_vendedores ven on ven.codvend = cab.codvend
        left join public.sankhya_produtos pro on pro.codprod = ite.codprod
        left join public.sankhya_tipos_operacao top on top.codtipoper = cab.codtipoper
        where par.cpf_cnpj = p_cnpj
    ),
    unioned as (
        select
            sistema, pedido, item_seq, data_pedido, id_representante, representante,
            case when classificacao = 'bonificacao' then 'bonificacao' else 'venda' end as tipo,
            produto, marca,
            quantidade * sinal as quantidade,
            valor_unitario,
            valor_total * sinal as valor_total
        from nexus_base
        union all
        select
            sistema, pedido, item_seq, data_pedido, id_representante, representante,
            case
                when tipmov = 'D' then 'devolucao'
                when classificacao = 'bonificacao' then 'bonificacao'
                else 'venda'
            end as tipo,
            produto, marca,
            quantidade * sinal as quantidade,
            valor_unitario,
            valor_total * sinal as valor_total
        from sankhya_base
    )
    select
        u.sistema::text || '-' || u.pedido || '-' || u.item_seq::text as item_id,
        u.data_pedido,
        u.pedido,
        u.sistema,
        u.tipo,
        u.produto,
        u.marca,
        u.quantidade,
        u.valor_unitario,
        u.valor_total,
        coalesce(vrc.nome_canonico, u.representante) as representante
    from unioned u
    left join public.vw_representantes_canonicos vrc
      on vrc.sistema = u.sistema and vrc.id_representante = u.id_representante
    where u.representante is distinct from 'FUNCIONARIOS'
      and public._dashboard_rep_visible(u.sistema, u.id_representante, null)
    order by u.data_pedido desc, u.pedido;
$function$;

revoke all on function public.get_cliente_historico_compras(text) from public, anon;
grant execute on function public.get_cliente_historico_compras(text) to authenticated;
```

- [ ] **Step 3: Verificar com um CNPJ real**

Rodar via `mcp__supabase__execute_sql`, usando o CNPJ `53348031000102` (cliente real já identificado nesta sessão):

```sql
select item_id, data_pedido, pedido, tipo, produto, marca, quantidade, valor_unitario, valor_total, representante
from public.get_cliente_historico_compras('53348031000102')
order by data_pedido desc
limit 10;
```

Expected: retorna linhas (não erro); `item_id` é único por linha; `tipo` é sempre `'venda'`, `'bonificacao'` ou `'devolucao'`; `quantidade`/`valor_total` negativos só aparecem em linhas `'devolucao'`.

- [ ] **Step 4: Verificar a busca**

Rodar via `mcp__supabase__execute_sql`:

```sql
select cnpj, nome, codigo_cliente from public.buscar_clientes_historico('53348031000102');
```

Expected: retorna exatamente 1 linha, com o CNPJ buscado.

- [ ] **Step 5: Verificar RLS — representante só busca/vê sua própria carteira**

Rodar via `mcp__supabase__execute_sql` (reaproveita o profile de teste "Quedima Andreza da Silva Ambrosio", mapeado em `representante_contas` para `(sistema=2, id_representante=746)`; CNPJ `53348031000102` é dela, CNPJ `00017373000175` não é):

```sql
-- Simula o login da representante de teste
select set_config('request.jwt.claims', '{"sub":"725482eb-a3d6-48b1-999e-df1341cee5f6"}', true);

-- Cliente dela: deve retornar itens normalmente
select count(*) as itens_cliente_dela from public.get_cliente_historico_compras('53348031000102');

-- Cliente que não é dela: deve retornar 0 linhas
select count(*) as itens_cliente_de_outro from public.get_cliente_historico_compras('00017373000175');

-- Busca por um termo amplo (ex: parte do nome do cliente que não é dela) não deve encontrá-lo
select count(*) as encontrou_cliente_de_outro
from public.buscar_clientes_historico('00017373000175');
```

Expected: `itens_cliente_dela` > 0; `itens_cliente_de_outro` = 0; `encontrou_cliente_de_outro` = 0. Se qualquer uma dessas contagens vier diferente do esperado, voltar ao Step 1/2 e confirmar que `_dashboard_rep_visible` está presente em todas as CTEs relevantes antes de prosseguir.

---

### Task 2: Frontend — camada de dados (`clientes-historico-compras.ts` + hook)

**Files:**
- Create: `src/lib/clientes/clientes-historico-compras.ts`
- Create: `src/hooks/clientes/use-clientes-historico-compras.ts`

**Interfaces:**
- Consumes: RPCs `buscar_clientes_historico`/`get_cliente_historico_compras` (Task 1); `toNumber` de `src/lib/clientes/clientes-rpc-helpers.ts` (já existente); `logger` de `src/lib/logger.ts` (já existente).
- Produces: tipos `ClienteHistoricoBusca`, `ClienteHistoricoItemTipo`, `ClienteHistoricoItemRow`; funções `buscarClientesHistorico(termo)`, `getClienteHistoricoCompras(cnpj)`; hook `useClientesHistoricoCompras()` retornando `{ termo, setTermo, resultados, buscando, clienteSelecionado, itens, loadingItens, selecionarCliente, limparSelecao }` — consumidos pela Task 3 (página).

- [ ] **Step 1: Criar `src/lib/clientes/clientes-historico-compras.ts`**

```typescript
import { supabase } from "@/lib/supabase"
import { toNumber } from "./clientes-rpc-helpers"

export type ClienteHistoricoBusca = {
  cnpj: string
  nome: string
  codigoCliente: string | null
}

export type ClienteHistoricoItemTipo = "venda" | "bonificacao" | "devolucao"

export type ClienteHistoricoItemRow = {
  itemId: string
  dataPedido: string
  pedido: string
  tipo: ClienteHistoricoItemTipo
  produto: string | null
  marca: string | null
  quantidade: number
  valorUnitario: number
  valorTotal: number
  representante: string | null
}

type ClienteHistoricoBuscaRaw = {
  cnpj: string
  nome: string | null
  codigo_cliente: string | null
}

type ClienteHistoricoItemRowRaw = {
  item_id: string
  data_pedido: string
  pedido: string
  tipo: string
  produto: string | null
  marca: string | null
  quantidade: number | string
  valor_unitario: number | string
  valor_total: number | string
  representante: string | null
}

export async function buscarClientesHistorico(termo: string): Promise<ClienteHistoricoBusca[]> {
  const { data, error } = await supabase.rpc("buscar_clientes_historico", { p_termo: termo })

  if (error) throw error

  return ((data ?? []) as ClienteHistoricoBuscaRaw[]).map((row) => ({
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    codigoCliente: row.codigo_cliente,
  }))
}

export async function getClienteHistoricoCompras(cnpj: string): Promise<ClienteHistoricoItemRow[]> {
  const { data, error } = await supabase.rpc("get_cliente_historico_compras", { p_cnpj: cnpj })

  if (error) throw error

  return ((data ?? []) as ClienteHistoricoItemRowRaw[]).map((row) => ({
    itemId: row.item_id,
    dataPedido: row.data_pedido,
    pedido: row.pedido,
    tipo: row.tipo as ClienteHistoricoItemTipo,
    produto: row.produto,
    marca: row.marca,
    quantidade: toNumber(row.quantidade),
    valorUnitario: toNumber(row.valor_unitario),
    valorTotal: toNumber(row.valor_total),
    representante: row.representante,
  }))
}
```

- [ ] **Step 2: Criar `src/hooks/clientes/use-clientes-historico-compras.ts`**

```typescript
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  buscarClientesHistorico,
  getClienteHistoricoCompras,
  type ClienteHistoricoBusca,
  type ClienteHistoricoItemRow,
} from "@/lib/clientes/clientes-historico-compras"
import { logger } from "@/lib/logger"

export function useClientesHistoricoCompras() {
  const [termo, setTermo] = useState("")
  const [resultados, setResultados] = useState<ClienteHistoricoBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteHistoricoBusca | null>(null)
  const [itens, setItens] = useState<ClienteHistoricoItemRow[]>([])
  const [loadingItens, setLoadingItens] = useState(false)

  useEffect(() => {
    if (clienteSelecionado) return

    const termoLimpo = termo.trim()
    if (termoLimpo.length < 2) {
      setResultados([])
      return
    }

    let mounted = true
    const timeout = setTimeout(() => {
      setBuscando(true)
      buscarClientesHistorico(termoLimpo)
        .then((data) => {
          if (mounted) setResultados(data)
        })
        .catch((error) => {
          logger.error("use-clientes-historico-compras-busca", error)
          toast.error("Não foi possível buscar clientes.")
        })
        .finally(() => {
          if (mounted) setBuscando(false)
        })
    }, 300)

    return () => {
      mounted = false
      clearTimeout(timeout)
    }
  }, [termo, clienteSelecionado])

  function selecionarCliente(cliente: ClienteHistoricoBusca) {
    setClienteSelecionado(cliente)
    setLoadingItens(true)
    getClienteHistoricoCompras(cliente.cnpj)
      .then(setItens)
      .catch((error) => {
        logger.error("use-clientes-historico-compras-itens", error)
        toast.error("Não foi possível carregar o histórico de compras.")
      })
      .finally(() => setLoadingItens(false))
  }

  function limparSelecao() {
    setClienteSelecionado(null)
    setItens([])
    setTermo("")
    setResultados([])
  }

  return {
    termo,
    setTermo,
    resultados,
    buscando,
    clienteSelecionado,
    itens,
    loadingItens,
    selecionarCliente,
    limparSelecao,
  }
}
```

- [ ] **Step 3: Rodar o build**

Run: `npm run build`
Expected: build completo sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/lib/clientes/clientes-historico-compras.ts src/hooks/clientes/use-clientes-historico-compras.ts
git commit -m "feat: camada de dados do Historico de Compras"
```

---

### Task 3: Frontend — página, rota e item de menu

**Files:**
- Create: `src/pages/clientes/historico-compras-page.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `useClientesHistoricoCompras` (Task 2); `ClientesDataTable`/`ClienteNomeCell`/`ClientesTableColumn` de `src/components/clientes/clientes-data-table.tsx` (já existentes); `Skeleton` de `src/components/ui/skeleton.tsx` (já existente); `formatCurrencyBRL`/`formatNumberBR` de `src/lib/format.ts` (já existentes).

- [ ] **Step 1: Criar `src/pages/clientes/historico-compras-page.tsx`**

```typescript
import { useMemo, useState } from "react"
import { ArrowLeft, Search } from "lucide-react"
import AppShell from "@/components/layout/app-shell"
import {
  ClientesDataTable,
  ClienteNomeCell,
  type ClientesTableColumn,
} from "@/components/clientes/clientes-data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientesHistoricoCompras } from "@/hooks/clientes/use-clientes-historico-compras"
import { formatCurrencyBRL, formatNumberBR } from "@/lib/format"
import type { ClienteHistoricoItemRow, ClienteHistoricoItemTipo } from "@/lib/clientes/clientes-historico-compras"

function formatDateBR(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("pt-BR")
}

function ProdutoCell({ produto, marca }: { produto: string | null; marca: string | null }) {
  return (
    <div className="flex flex-col">
      <span>{produto ?? "Produto sem descrição"}</span>
      {marca && <span className="text-xs text-slate-500 dark:text-slate-400">{marca}</span>}
    </div>
  )
}

function TipoBadge({ tipo }: { tipo: ClienteHistoricoItemTipo }) {
  if (tipo === "devolucao") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-slate-800 dark:text-red-300">
        Devolução
      </span>
    )
  }
  if (tipo === "bonificacao") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-slate-800 dark:text-blue-300">
        Bonificação
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#E4F1E8] px-2 py-0.5 text-xs font-semibold text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
      Venda
    </span>
  )
}

const historicoColumns: ClientesTableColumn<ClienteHistoricoItemRow>[] = [
  {
    key: "data",
    header: "Data",
    render: (row) => formatDateBR(row.dataPedido),
    sortValue: (row) => new Date(row.dataPedido).getTime(),
  },
  {
    key: "produto",
    header: "Produto",
    render: (row) => <ProdutoCell produto={row.produto} marca={row.marca} />,
    sortValue: (row) => row.produto,
  },
  {
    key: "quantidade",
    header: "Qtd.",
    align: "right",
    render: (row) => formatNumberBR(row.quantidade),
    sortValue: (row) => row.quantidade,
  },
  {
    key: "valor_unitario",
    header: "Valor unit.",
    align: "right",
    render: (row) => formatCurrencyBRL(row.valorUnitario),
    sortValue: (row) => row.valorUnitario,
  },
  {
    key: "valor_total",
    header: "Valor total",
    align: "right",
    render: (row) => formatCurrencyBRL(row.valorTotal),
    sortValue: (row) => row.valorTotal,
  },
  {
    key: "tipo",
    header: "Tipo",
    align: "center",
    render: (row) => <TipoBadge tipo={row.tipo} />,
    sortValue: (row) => row.tipo,
  },
  {
    key: "representante",
    header: "Representante",
    render: (row) => row.representante ?? "—",
    sortValue: (row) => row.representante,
  },
]

export default function HistoricoComprasPage() {
  const {
    termo,
    setTermo,
    resultados,
    buscando,
    clienteSelecionado,
    itens,
    loadingItens,
    selecionarCliente,
    limparSelecao,
  } = useClientesHistoricoCompras()
  const [itemSearchTerm, setItemSearchTerm] = useState("")

  const itensFiltrados = itens.filter((item) => {
    const term = itemSearchTerm.trim().toLowerCase()
    if (!term) return true
    return (
      (item.produto?.toLowerCase().includes(term) ?? false) ||
      (item.marca?.toLowerCase().includes(term) ?? false)
    )
  })

  const resumo = useMemo(() => {
    const totalGasto = itens.filter((i) => i.tipo === "venda").reduce((soma, i) => soma + i.valorTotal, 0)
    const qtdPedidos = new Set(itens.map((i) => i.pedido)).size
    return { totalGasto, qtdPedidos, qtdItens: itens.length }
  }, [itens])

  return (
    <AppShell
      title="Histórico de Compras"
      subtitle="Busque um cliente e veja todo o histórico de itens comprados por ele"
    >
      <div className="space-y-6">
        {!clienteSelecionado ? (
          <section className="rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar por nome, CNPJ ou código..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            {buscando && (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            )}

            {!buscando && termo.trim().length >= 2 && resultados.length === 0 && (
              <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum cliente encontrado.
              </p>
            )}

            {!buscando && resultados.length > 0 && (
              <div className="mt-3 space-y-2">
                {resultados.map((resultado) => (
                  <button
                    type="button"
                    key={resultado.cnpj}
                    onClick={() => selecionarCliente(resultado)}
                    className="flex w-full items-center rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <ClienteNomeCell
                      nome={resultado.nome}
                      cnpj={resultado.cnpj}
                      codigoCliente={resultado.codigoCliente}
                    />
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={limparSelecao}
                className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#297B49] hover:underline dark:text-[#7DD3A2]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Nova busca
              </button>

              <ClienteNomeCell
                nome={clienteSelecionado.nome}
                cnpj={clienteSelecionado.cnpj}
                codigoCliente={clienteSelecionado.codigoCliente}
              />

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                    Total gasto (vendas)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrencyBRL(resumo.totalGasto)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                    Pedidos
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {resumo.qtdPedidos}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                    Itens
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {resumo.qtdItens}
                  </p>
                </div>
              </div>
            </section>

            <ClientesDataTable
              columns={historicoColumns}
              rows={itensFiltrados}
              loading={loadingItens}
              getRowKey={(row) => row.itemId}
              searchTerm={itemSearchTerm}
              onSearchTermChange={setItemSearchTerm}
              searchPlaceholder="Buscar por produto ou marca..."
              emptyMessage="Nenhum item encontrado para este cliente."
            />
          </>
        )}
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2: Adicionar a rota em `src/App.tsx`**

Adicionar o import junto aos outros de `@/pages/clientes/*` (depois de `AgendaPage`):

```typescript
import HistoricoComprasPage from "@/pages/clientes/historico-compras-page"
```

Adicionar o bloco de rota logo depois do bloco `/clientes/agenda` existente:

```typescript
      <Route
        path="/clientes/historico-compras"
        element={
          <ProtectedRoute>
            <HistoricoComprasPage />
          </ProtectedRoute>
        }
      />
```

- [ ] **Step 3: Adicionar o item de menu em `src/components/layout/sidebar.tsx`**

No import de ícones do `lucide-react`, adicionar `History` à lista:

```typescript
  CalendarClock,
  History,
```

No array `clientesNavItems`, adicionar a entrada ao final (ordem alfabética — "Histórico de Compras" vem depois de "Frequência"):

```typescript
  { to: "/clientes/historico-compras", label: "Histórico de Compras", icon: History },
```

- [ ] **Step 4: Rodar o build**

Run: `npm run build`
Expected: build completo sem erros de TypeScript.

- [ ] **Step 5: Testar no navegador**

Run: `npm run dev` (ou reaproveitar instância já rodando) e abrir `/clientes/historico-compras` logado.

Verificar manualmente:
1. Digitar 2+ caracteres de um nome/CNPJ real mostra resultados após um instante (debounce).
2. Clicar num resultado troca a tela pro resumo + tabela de itens daquele cliente.
3. A tabela mostra produto, quantidade, valores e o badge de tipo corretamente (cores diferentes por tipo).
4. Buscar por um produto no campo de busca da tabela filtra os itens.
5. "Nova busca" volta pro campo de busca inicial, limpando a seleção.

- [ ] **Step 6: Commit**

```bash
git add src/pages/clientes/historico-compras-page.tsx src/App.tsx src/components/layout/sidebar.tsx
git commit -m "feat: tela de Historico de Compras"
```

---

## Ordem de execução

Task 1 → Task 2 → Task 3. Task 1 (backend) pode ser verificada de forma totalmente independente antes de avançar.
