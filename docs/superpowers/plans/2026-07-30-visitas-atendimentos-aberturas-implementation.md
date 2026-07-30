# Visitas e Atendimentos em Aberturas de Clientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sincronizar `AD_LIGACOESVI` (atendimentos de televendas) do Sankhya para o Supabase seguindo o mesmo padrão já usado para Visitas, e usar essa nova fonte (junto com `sankhya_visitas`) para mostrar, na tela de Aberturas de Clientes, se cada cliente aberto recebeu visita e/ou atendimento desde a data de abertura.

**Architecture:** Backend Node/Fastify (repo separado `projetos/backend`) ganha um novo serviço de sync + rota, clonando o padrão existente de `sync-sankhya-visitas.js`. Supabase ganha uma tabela espelho nova (`sankhya_atendimentos`) e sua RPC de upsert, e a RPC `get_clientes_aberturas_detalhe` passa a contar visitas/atendimentos por CNPJ. O frontend (`bionatus-web-app`) só consome os 2 campos novos da RPC e renderiza 2 colunas na tabela de detalhe de Aberturas.

**Tech Stack:** Node.js/Fastify (backend), Supabase Postgres (RPCs `LANGUAGE sql STABLE SECURITY DEFINER` e `LANGUAGE plpgsql`), React 19 + TypeScript (frontend), n8n (agendamento — fora do alcance de edição automatizada).

## Global Constraints

- Uma "visita"/"atendimento" real = um `CODIGOVISITA` distinto. Toda contagem de eventos usa `count(distinct codigovisita)`, nunca `count(*)`.
- CNPJ já vem em formato só-dígitos em `sankhya_visitas`/`sankhya_atendimentos`, compatível direto com `mv_clientes_pedidos.cnpj` — sem normalização.
- Sem framework de testes automatizado em nenhum dos dois repos. Verificação via SQL direto (contagens conhecidas) e `npm run build` no frontend.
- Trabalho direto na branch `main` de ambos os repositórios, sem worktree isolado — já consentido para `bionatus-web-app`; para `projetos/backend` o consentimento para **commit** ainda precisa ser confirmado com o usuário antes de rodar `git commit` lá (Task 2).
- Fora de escopo: telas/rotas novas no frontend, filtro por usuário/representante, contagem pré-abertura.
- n8n: a duplicação do workflow "Visitas" para "Atendimentos" é uma ação manual do usuário, fora do alcance de edição — não é uma task executável neste plano, só uma instrução final para o usuário (Task 5).

---

### Task 1: Supabase — tabela e RPC de sincronização de Atendimentos

**Files:** nenhum arquivo local — tudo via `mcp__supabase__apply_migration` / `mcp__supabase__execute_sql`.

**Interfaces:**
- Produces: tabela `public.sankhya_atendimentos` (colunas: `id integer primary key, codigovisita text, usuario text, clienterazaosocial text, cnpj text, cidade text, datavisita date, questionario text, pergunta text, resposta text, observacoes text, hashunico text, origem text`); RPC `public.insert_or_update_sankhya_atendimentos(pedido_data jsonb) returns void`, usada pela Task 2 (backend).

- [ ] **Step 1: Criar a tabela `sankhya_atendimentos` e índices**

Rodar via `mcp__supabase__apply_migration` (name: `create_sankhya_atendimentos`):

```sql
create table public.sankhya_atendimentos (
  id integer primary key,
  codigovisita text,
  usuario text,
  clienterazaosocial text,
  cnpj text,
  cidade text,
  datavisita date,
  questionario text,
  pergunta text,
  resposta text,
  observacoes text,
  hashunico text,
  origem text
);

create index if not exists idx_sankhya_atendimentos_cnpj on public.sankhya_atendimentos (cnpj);
create index if not exists idx_sankhya_visitas_cnpj on public.sankhya_visitas (cnpj);

revoke all on public.sankhya_atendimentos from anon, authenticated;
```

- [ ] **Step 2: Criar a RPC de upsert `insert_or_update_sankhya_atendimentos`**

Rodar via `mcp__supabase__apply_migration` (name: `create_insert_or_update_sankhya_atendimentos`):

```sql
CREATE OR REPLACE FUNCTION public.insert_or_update_sankhya_atendimentos(pedido_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO sankhya_atendimentos (
    id, codigovisita, usuario, clienterazaosocial, cnpj, cidade,
    datavisita, questionario, pergunta, resposta, observacoes, hashunico, origem
  )
  SELECT
    (item->>'id')::integer,
    item->>'codigovisita',
    item->>'usuario',
    item->>'clienterazaosocial',
    item->>'cnpj',
    item->>'cidade',
    CASE WHEN NULLIF(item->>'datavisita', '') IS NOT NULL
      THEN (item->>'datavisita')::date ELSE NULL END,
    item->>'questionario',
    item->>'pergunta',
    item->>'resposta',
    item->>'observacoes',
    item->>'hashunico',
    item->>'origem'
  FROM jsonb_array_elements(pedido_data) AS item
  ON CONFLICT (id) DO NOTHING;
END;
$function$;

revoke all on function public.insert_or_update_sankhya_atendimentos(jsonb) from anon, authenticated;
```

- [ ] **Step 3: Verificar a RPC com um registro de teste**

Rodar via `mcp__supabase__execute_sql`:

```sql
select public.insert_or_update_sankhya_atendimentos(
  '[{"id": 999999999, "codigovisita": "TESTE-1", "usuario": "TESTE", "clienterazaosocial": "CLIENTE TESTE", "cnpj": "00000000000000", "cidade": "TESTE", "datavisita": "2026-07-01", "questionario": "Q", "pergunta": "P", "resposta": "R", "observacoes": null, "hashunico": "abc", "origem": "TESTE"}]'::jsonb
);

select * from sankhya_atendimentos where id = 999999999;

delete from sankhya_atendimentos where id = 999999999;
```

Expected: o select intermediário retorna 1 linha com os dados inseridos; depois do delete, a tabela volta a não ter o registro de teste.

---

### Task 2: Backend — serviço de sincronização e rota `/update-atendimentos`

**Files:**
- Create: `C:\Users\Power BI\projetos\backend\src\services\services-new\sync-sankhya-atendimentos.js`
- Modify: `C:\Users\Power BI\projetos\backend\src\routes\sankhya.routes.js`

**Interfaces:**
- Consumes: RPC `insert_or_update_sankhya_atendimentos` (Task 1), tabela `sankhya_atendimentos` (Task 1) para `getUltimoId`.
- Produces: função exportada `getAtendimentos()`; rota HTTP `POST /update-atendimentos`.

- [ ] **Step 1: Criar `sync-sankhya-atendimentos.js`**

Conteúdo completo do arquivo (idêntico a `sync-sankhya-visitas.js`, só trocando a tabela Sankhya de origem, a tabela/RPC do Supabase de destino e os nomes de função):

```javascript
import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";
import dotenv from "dotenv";
dotenv.config();

const {
  SANKHYA_X_TOKEN,
  SANKHYA_CLIENT_ID,
  SANKHYA_CLIENT_SECRET,
  SANKHYA_URL_BASE,
  SANKHYA_SERVICE_NAME,
} = process.env;

const supabase = createClient(env.supabaseUrlSnk, env.supabaseSnkRoleKey);

function parseDbExplorer(response) {
  if (
    !response ||
    !response.responseBody ||
    !response.responseBody.fieldsMetadata ||
    !response.responseBody.rows
  ) {
    console.error("Resposta inválida do Sankhya:", JSON.stringify(response, null, 2));
    throw new Error("Estrutura inválida retornada pelo DbExplorer");
  }

  const fields = response.responseBody.fieldsMetadata.map((f) => f.name.toLowerCase());
  const rows = response.responseBody.rows;

  return rows.map((row) => {
    const obj = {};
    row.forEach((value, idx) => (obj[fields[idx]] = value));
    return obj;
  });
}

// Sankhya retorna datas como "DDMMYYYY HH:MM:SS" — converte para "YYYY-MM-DD"
function parseSankhyaDate(value) {
  if (value == null) return null;
  const match = String(value).trim().match(/^(\d{2})(\d{2})(\d{4})/);
  if (!match) return value;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

async function getUltimoId() {
  const { data, error } = await supabase
    .from("sankhya_atendimentos")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data.length ? data[0].id : null;
}

function buildPagedSQL(offset, pageSize, ultimoIdOrNull) {
  const filtro = ultimoIdOrNull ? `WHERE b.id > ${ultimoIdOrNull}` : "";

  return `
  WITH base_raw AS (
    SELECT
      V.ID,
      V.CODIGOVISITA,
      V.USUARIO,
      V.CLIENTERAZAOSOCIAL,
      V.CNPJ,
      V.CIDADE,
      V.DATAVISITA,
      V.QUESTIONARIO,
      V.PERGUNTA,
      V.RESPOSTA,
      V.OBSERVACOES,
      V.HASHUNICO,
      V.ORIGEM
    FROM AD_LIGACOESVI V
  ),
  base AS (
    SELECT ROW_NUMBER() OVER (ORDER BY b.id) AS rn, b.*
    FROM base_raw b
    ${filtro}
  )
  SELECT * FROM base
  WHERE rn BETWEEN ${offset} AND ${offset + pageSize - 1}
  `;
}

async function getAccessToken() {
  const params = new URLSearchParams();
  params.append("client_id", SANKHYA_CLIENT_ID);
  params.append("client_secret", SANKHYA_CLIENT_SECRET);
  params.append("grant_type", "client_credentials");

  const authRes = await fetch(`${SANKHYA_URL_BASE}/authenticate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-TOKEN": SANKHYA_X_TOKEN,
    },
    body: params,
  });

  const authData = await authRes.json();

  if (!authData.access_token) {
    console.error("Erro token:", authData);
    throw new Error("Erro ao obter AccessToken");
  }

  return authData.access_token;
}

export async function getAtendimentos() {
  try {
    const accessToken = await getAccessToken();
    console.log("🔑 AccessToken OK");

    const ultimoId = await getUltimoId();
    console.log(
      ultimoId
        ? `📌 Buscando atendimentos com ID > ${ultimoId}`
        : "🧱 Tabela vazia. Carregando tudo."
    );

    const PAGE_SIZE = 5000;
    let offset = 1;
    let lote = 1;

    while (true) {
      const sql = buildPagedSQL(offset, PAGE_SIZE, ultimoId);

      const response = await fetch(
        `${SANKHYA_URL_BASE}/gateway/v1/mge/service.sbr?serviceName=${SANKHYA_SERVICE_NAME}&outputType=json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            serviceName: "DbExplorerSP.executeQuery",
            requestBody: { sql },
          }),
        }
      );

      const json = await response.json();
      const registros = parseDbExplorer(json).map((r) => ({
        ...r,
        datavisita: parseSankhyaDate(r.datavisita),
      }));

      if (!registros.length) {
        console.log("🏁 Fim dos registros");
        break;
      }

      console.log(`📦 Lote ${lote} - ${registros.length} registros`);

      const { error: rpcError } = await supabase.rpc("insert_or_update_sankhya_atendimentos", {
        pedido_data: registros,
      });

      if (rpcError) throw rpcError;

      offset += PAGE_SIZE;
      lote++;
    }

    console.log("🎉 Sync de atendimentos concluída");
  } catch (err) {
    console.error("❌ ERRO GERAL:", err);
    throw err;
  }
}
```

- [ ] **Step 2: Verificar sintaxe do arquivo**

Run: `cd "C:\Users\Power BI\projetos\backend" && node --check src/services/services-new/sync-sankhya-atendimentos.js`
Expected: nenhuma saída (sintaxe válida). `node --check` só valida sintaxe, não resolve imports — isso é esperado e suficiente aqui, já que não há framework de testes.

- [ ] **Step 3: Adicionar a rota `/update-atendimentos`**

Em `C:\Users\Power BI\projetos\backend\src\routes\sankhya.routes.js`, adicionar o import junto aos outros de `services-new`:

```javascript
import { getAtendimentos } from '../services/services-new/sync-sankhya-atendimentos.js';
```

E adicionar o bloco de rota logo depois do bloco `/update-visitas` existente:

```javascript
  app.post("/update-atendimentos", async (request, reply) => {
    try {
      await getAtendimentos()
      return { status: 'ok', message: 'Atendimentos sincronizados com sucesso' }
    } catch (err) {
      app.log.error(err)
      return reply.status(500).send({ status: 'error', message: err.message })
    }
  })
```

- [ ] **Step 4: Verificar sintaxe da rota**

Run: `cd "C:\Users\Power BI\projetos\backend" && node --check src/routes/sankhya.routes.js`
Expected: nenhuma saída (sintaxe válida).

- [ ] **Step 5: Checkpoint — confirmar com o usuário antes de comitar no repo backend**

Este repositório (`projetos/backend`) é separado do `bionatus-web-app` e ainda não houve consentimento explícito nesta sessão para commits nele. Antes de rodar qualquer `git add`/`git commit` em `C:\Users\Power BI\projetos\backend`, perguntar ao usuário (via `AskUserQuestion`) se deve comitar agora nesse repo ou só deixar os arquivos editados sem commit. Só proceder com `git commit` após resposta explícita.

- [ ] **Step 6: Commit (se autorizado no Step 5)**

```bash
cd "C:\Users\Power BI\projetos\backend"
git add src/services/services-new/sync-sankhya-atendimentos.js src/routes/sankhya.routes.js
git commit -m "feat: sincroniza AD_LIGACOESVI (atendimentos) do Sankhya para sankhya_atendimentos"
```

---

### Task 3: Supabase — enriquecer `get_clientes_aberturas_detalhe` com contagem de visitas/atendimentos

**Files:** nenhum arquivo local — via `mcp__supabase__apply_migration` / `mcp__supabase__execute_sql`.

**Interfaces:**
- Consumes: `sankhya_visitas`, `sankhya_atendimentos` (Task 1), `mv_clientes_pedidos` (já existente).
- Produces: RPC `public.get_clientes_aberturas_detalhe(p_data_inicio date, p_data_fim date, p_id_representante bigint default null, p_mercado integer default null, p_contas integer[] default null, p_is_bionatus integer default null)` retornando `cnpj, nome, codigo_cliente, data_abertura, representante_abertura, qtd_recompras, qtd_visitas, qtd_atendimentos` — consumida pela Task 4 (frontend).

- [ ] **Step 1: Recriar a RPC com as 2 colunas novas**

A RPC atual tem assinatura de retorno diferente (sem `qtd_visitas`/`qtd_atendimentos`), então é preciso `DROP FUNCTION` antes do `CREATE`. Rodar via `mcp__supabase__apply_migration` (name: `add_visitas_atendimentos_to_get_clientes_aberturas_detalhe`):

```sql
DROP FUNCTION IF EXISTS public.get_clientes_aberturas_detalhe(date, date, bigint, integer, integer[], integer);

CREATE FUNCTION public.get_clientes_aberturas_detalhe(
  p_data_inicio date,
  p_data_fim date,
  p_id_representante bigint DEFAULT NULL::bigint,
  p_mercado integer DEFAULT NULL::integer,
  p_contas integer[] DEFAULT NULL::integer[],
  p_is_bionatus integer DEFAULT NULL::integer
)
RETURNS TABLE(
  cnpj text,
  nome text,
  codigo_cliente text,
  data_abertura date,
  representante_abertura text,
  qtd_recompras bigint,
  qtd_visitas bigint,
  qtd_atendimentos bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    with base as (
        select m.cnpj, m.data_pedido, m.representante
        from public.mv_clientes_pedidos m
        where m.is_venda
          and public._dashboard_rep_visible(m.sistema, m.id_representante, p_id_representante)
          and (p_mercado is null or m.mercado = p_mercado)
          and (p_contas is null or cardinality(p_contas) = 0 or m.contas = any(p_contas))
          and (p_is_bionatus is null or m.is_bionatus = p_is_bionatus)
    ),
    primeiras as (
        select cnpj, min(data_pedido) as data_abertura
        from base
        group by cnpj
    ),
    abertura_rep as (
        select b.cnpj, b.representante,
               row_number() over (partition by b.cnpj order by b.data_pedido asc) as rn
        from base b
        join primeiras pr on pr.cnpj = b.cnpj and b.data_pedido = pr.data_abertura
    ),
    recompras as (
        select b.cnpj, count(distinct b.data_pedido) as qtd_recompras
        from base b
        join primeiras pr on pr.cnpj = b.cnpj
        where b.data_pedido > pr.data_abertura
        group by b.cnpj
    ),
    visitas as (
        select v.cnpj, count(distinct v.codigovisita) as qtd_visitas
        from public.sankhya_visitas v
        join primeiras pr on pr.cnpj = v.cnpj
        where v.datavisita > pr.data_abertura
        group by v.cnpj
    ),
    atendimentos as (
        select a.cnpj, count(distinct a.codigovisita) as qtd_atendimentos
        from public.sankhya_atendimentos a
        join primeiras pr on pr.cnpj = a.cnpj
        where a.datavisita > pr.data_abertura
        group by a.cnpj
    )
    select
        pr.cnpj,
        n.nome,
        n.codigo_cliente,
        pr.data_abertura,
        ar.representante as representante_abertura,
        coalesce(rc.qtd_recompras, 0) as qtd_recompras,
        coalesce(vi.qtd_visitas, 0) as qtd_visitas,
        coalesce(at.qtd_atendimentos, 0) as qtd_atendimentos
    from primeiras pr
    left join abertura_rep ar on ar.cnpj = pr.cnpj and ar.rn = 1
    left join recompras rc on rc.cnpj = pr.cnpj
    left join visitas vi on vi.cnpj = pr.cnpj
    left join atendimentos at on at.cnpj = pr.cnpj
    left join public.vw_clientes_nomes n on n.cnpj = pr.cnpj
    where pr.data_abertura between p_data_inicio and p_data_fim
    order by pr.data_abertura desc;
$function$;

revoke all on function public.get_clientes_aberturas_detalhe(date, date, bigint, integer, integer[], integer) from public, anon;
grant execute on function public.get_clientes_aberturas_detalhe(date, date, bigint, integer, integer[], integer) to authenticated;
```

- [ ] **Step 2: Verificar com uma query de sanidade**

Rodar via `mcp__supabase__execute_sql`:

```sql
select cnpj, nome, data_abertura, qtd_recompras, qtd_visitas, qtd_atendimentos
from public.get_clientes_aberturas_detalhe('2026-01-01', '2026-07-30')
where qtd_visitas > 0 or qtd_atendimentos > 0
order by qtd_visitas desc, qtd_atendimentos desc
limit 5;
```

Expected: retorna linhas (não erro), com `qtd_visitas`/`qtd_atendimentos` como inteiros ≥ 0. Como `sankhya_atendimentos` ainda estará vazia até a Task 2 rodar em produção (sync real via n8n), `qtd_atendimentos` será 0 para todo mundo até lá — isso é esperado, não é bug.

- [ ] **Step 3: Verificar que a contagem usa `codigovisita` distinto, não linhas cruas**

Rodar via `mcp__supabase__execute_sql`, usando um CNPJ que se sabe ter várias linhas de pergunta/resposta na mesma visita (ex: reaproveitar o CNPJ `19248571000178` já identificado nesta sessão como tendo o `codigovisita` `11270` com 3 linhas):

```sql
select count(*) as linhas_cruas, count(distinct codigovisita) as visitas_reais
from sankhya_visitas
where cnpj = '19248571000178';

select qtd_visitas from public.get_clientes_aberturas_detalhe('2020-01-01', '2030-01-01')
where cnpj = '19248571000178';
```

Expected: `qtd_visitas` (visitas com data posterior à abertura) é menor ou igual a `visitas_reais`, e nunca igual a `linhas_cruas` a menos que cada visita tenha exatamente 1 linha (o que não é o caso aqui — confirma que a RPC não está contando linha crua como visita).

---

### Task 4: Frontend — colunas "Visita" e "Atendimento" em Aberturas

**Files:**
- Modify: `src/lib/clientes/clientes-aberturas.ts`
- Modify: `src/pages/clientes/aberturas-page.tsx`

**Interfaces:**
- Consumes: RPC `get_clientes_aberturas_detalhe` (Task 3), campos `qtd_visitas`/`qtd_atendimentos`.
- Produces: `ClienteAberturaDetalheRow` com `qtdVisitas: number` e `qtdAtendimentos: number`, usados só dentro de `aberturas-page.tsx`.

- [ ] **Step 1: Atualizar o tipo e o mapper em `clientes-aberturas.ts`**

Em `src/lib/clientes/clientes-aberturas.ts`, no tipo `ClienteAberturaDetalheRow`, adicionar após `qtdRecompras: number`:

```typescript
  qtdVisitas: number
  qtdAtendimentos: number
```

No tipo `ClienteAberturaDetalheRowRaw`, adicionar após `qtd_recompras: number | string`:

```typescript
  qtd_visitas: number | string
  qtd_atendimentos: number | string
```

No mapper dentro de `getClientesAberturasDetalhe`, adicionar após `qtdRecompras: toNumber(row.qtd_recompras),`:

```typescript
    qtdVisitas: toNumber(row.qtd_visitas),
    qtdAtendimentos: toNumber(row.qtd_atendimentos),
```

- [ ] **Step 2: Adicionar as colunas "Visita" e "Atendimento" em `aberturas-page.tsx`**

Em `src/pages/clientes/aberturas-page.tsx`, no array `detalheColumns`, adicionar 2 novas entradas imediatamente depois da coluna `"recompra"` (antes da coluna `"representante"`):

```typescript
  {
    key: "visita",
    header: "Visita",
    align: "center",
    render: (row) =>
      row.qtdVisitas > 0 ? (
        <span className="inline-flex items-center rounded-full bg-[#E4F1E8] px-2 py-0.5 text-xs font-semibold text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
          Sim · {row.qtdVisitas}x
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Não
        </span>
      ),
    sortValue: (row) => row.qtdVisitas,
  },
  {
    key: "atendimento",
    header: "Atendimento",
    align: "center",
    render: (row) =>
      row.qtdAtendimentos > 0 ? (
        <span className="inline-flex items-center rounded-full bg-[#E4F1E8] px-2 py-0.5 text-xs font-semibold text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
          Sim · {row.qtdAtendimentos}x
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Não
        </span>
      ),
    sortValue: (row) => row.qtdAtendimentos,
  },
```

- [ ] **Step 3: Rodar o build**

Run: `npm run build`
Expected: build completo sem erros de TypeScript (mesmo padrão de saída dos builds anteriores nesta sessão — `tsc -b && vite build` seguido de `✓ built in`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/clientes/clientes-aberturas.ts src/pages/clientes/aberturas-page.tsx
git commit -m "feat: colunas Visita e Atendimento na tabela de detalhe de Aberturas"
```

---

### Task 5: Instrução final para o usuário — duplicar workflow no n8n

**Files:** nenhum — esta task não é executável automaticamente.

- [ ] **Step 1: Informar o usuário**

Ao final da execução deste plano, avisar explicitamente o usuário que ele precisa:
1. Abrir o n8n e duplicar o workflow "Visitas" (id `OJD5mjfrs42ay8ZV`).
2. Renomear a cópia para "Atendimentos".
3. Trocar a URL da chamada HTTP de `/update-visitas` para `/update-atendimentos` (mesma base URL do backend).
4. Manter o mesmo agendamento/gatilho do workflow original.
5. Ativar o novo workflow e rodar uma vez manualmente para popular `sankhya_atendimentos` pela primeira vez.

Sem esse passo manual, `sankhya_atendimentos` fica vazia e `qtd_atendimentos` será sempre 0 em Aberturas — isso não é um bug do código, é a sincronização inicial pendente.

---

## Ordem de execução

Task 1 → Task 2 → Task 3 → Task 4 → Task 5. Tasks 1, 2 e 3 podem ser verificadas independentemente (cada uma tem sua própria query/comando de verificação) antes de avançar para a próxima.
