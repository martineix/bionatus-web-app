# A Faturar e Meta por Representante — Plano de Implementação

> **Para quem for executar:** USE O SUB-SKILL OBRIGATÓRIO superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa.

**Objetivo:** Quebrar a badge "A faturar" do Dashboard por representante (vendedor Sankhya, `CODVEND`) e adicionar um bullet graph de Meta (COTA, tabela `TGFMET`) × Faturamento realizado, visível só para um representante logado.

**Arquitetura:** Três repositórios: backend Node/Fastify (`C:\Users\Power BI\projetos\backend`) sincroniza Sankhya → Supabase; Supabase guarda os dados e expõe RPCs com RLS; o frontend (este repo) consome. n8n (fora do nosso alcance de edição) agenda os syncs — o usuário duplica um workflow existente.

**Tech Stack:** PostgreSQL/Supabase (SQL functions, migrations via `mcp__supabase__apply_migration`), Node/Fastify (backend, sem framework de testes), React/TypeScript (frontend, sem framework de testes).

## Global Constraints

- O papel do usuário (`profiles.role`) e o `codvend` mapeado (via `representante_contas`, `sistema=2`) devem ser resolvidos **uma vez por chamada** dentro de cada RPC nova/alterada — nunca repetir subconsulta a `profiles`/`representante_contas` por linha (lição da Errata 5 de Aberturas). Use CTEs não-correlacionadas (`meu_role`, `meu_codvend`) para que o Postgres promova a subconsulta a `InitPlan`.
- Para um usuário com `role='representante'` sem mapeamento em `representante_contas`, as RPCs devem retornar vazio/zero — nunca cair para "sem filtro" (fail-open). Compare por igualdade explícita (`f.codvend = (select ... )`), nunca por `... IS NULL OR ...` do lado do representante.
- O vendedor "FUNCIONARIOS" nunca faz login — não precisa de tratamento de RLS, e seu valor pendente continua entrando na soma total da empresa.
- Nenhum framework de testes automatizados existe em nenhum dos 3 repositórios — verificação é manual: `EXPLAIN ANALYZE`/`SELECT` direto no Supabase pra RPCs, `npm run build` pro frontend, chamada HTTP + `SELECT` no Supabase pro backend.
- Backend usa `env.supabaseUrlSnk`/`env.supabaseSnkRoleKey` (projeto `lbsrhplayhusmcexnwfw`, o mesmo do frontend) — nunca `env.supabaseUrl`/`env.supabaseKey` (projeto Fideliza legado, não relacionado a este app).
- Cores do bullet graph reaproveitam a paleta semântica já usada no app (`kpi-card.tsx`, `curva-abc-page.tsx`): verde `#006426`/`#7DD3A2` (dark), âmbar `amber-500`/`amber-700`/`amber-400` (dark), vermelho `red-500`/`red-600`/`red-400` (dark) — não usar as cores do painel de referência do Sankhya.
- Bullet graph e "a faturar" por vendedor só aparecem quando o usuário logado tem `role='representante'` (mesmo sinal que já liga o aviso "Você está vendo seus próprios números de desempenho" em `dashboard-page.tsx`). Não existe filtro de representante na UI do Dashboard — admin sempre vê o total da empresa, sem bullet graph.

---

### Task 1: Supabase — `sankhya_pendente_faturamento` por vendedor

**Files:**
- Migration via `mcp__supabase__apply_migration` (sem arquivo local — este projeto aplica migrations direto no Supabase, sem versionar `.sql` no repo).

**Interfaces:**
- Produces: RPC `get_sankhya_pendente_faturamento(p_id_representante bigint default null)` retornando `TABLE(qtd integer, vlrnota numeric, venda numeric, bonus numeric, updated_at timestamptz)` — usada pela Task 5.
- Consumes: tabela `sankhya_pendente_faturamento` (hoje 1 linha fixa `id=1`), `profiles.role`, `representante_contas(profile_id, sistema, id_representante)`.

- [ ] **Passo 1: Restruturar a tabela**

```sql
alter table public.sankhya_pendente_faturamento drop constraint sankhya_pendente_faturamento_single_row;
alter table public.sankhya_pendente_faturamento drop constraint sankhya_pendente_faturamento_pkey;
alter table public.sankhya_pendente_faturamento drop column id;
alter table public.sankhya_pendente_faturamento add column codvend bigint not null default 0;
alter table public.sankhya_pendente_faturamento alter column codvend drop default;
alter table public.sankhya_pendente_faturamento add constraint sankhya_pendente_faturamento_pkey primary key (codvend);
delete from public.sankhya_pendente_faturamento;
```

- [ ] **Passo 2: Recriar a RPC com resolução de papel/vendedor uma vez por chamada**

```sql
create or replace function public.get_sankhya_pendente_faturamento(p_id_representante bigint default null)
 returns table(qtd integer, vlrnota numeric, venda numeric, bonus numeric, updated_at timestamptz)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with meu_role as (
    select role from public.profiles where id = auth.uid()
  ),
  meu_codvend as (
    select rc.id_representante
    from public.representante_contas rc
    where rc.profile_id = auth.uid() and rc.sistema = 2
    limit 1
  )
  select
    coalesce(sum(f.qtd), 0)::integer as qtd,
    coalesce(sum(f.vlrnota), 0) as vlrnota,
    coalesce(sum(f.venda), 0) as venda,
    coalesce(sum(f.bonus), 0) as bonus,
    max(f.updated_at) as updated_at
  from public.sankhya_pendente_faturamento f
  where
    case
      when (select role from meu_role) = 'representante'
        then f.codvend = (select id_representante from meu_codvend)
      else (p_id_representante is null or f.codvend = p_id_representante)
    end;
$function$;
```

- [ ] **Passo 3: Verificar manualmente**

Rodar via `mcp__supabase__execute_sql`:
```sql
-- sem dados ainda (tabela vazia após o delete do passo 1) — deve retornar 1 linha com zeros, não erro
select * from public.get_sankhya_pendente_faturamento();

-- insere 2 linhas de teste
insert into public.sankhya_pendente_faturamento (codvend, qtd, vlrnota, venda, bonus, updated_at)
values (111, 5, 1000, 900, 100, now()), (222, 3, 500, 500, 0, now());

-- admin sem filtro: soma das 2 linhas (qtd=8, venda=1400)
select * from public.get_sankhya_pendente_faturamento();

-- admin filtrando por 111: só a linha dele
select * from public.get_sankhya_pendente_faturamento(111);

-- simula representante logado mapeado ao codvend 222 (ajustar profile_id/uuid de teste existente)
-- confirma que retorna só a linha do 222, mesmo passando p_id_representante=111
select set_config('request.jwt.claims', '{"sub":"<uuid de um profile role=representante mapeado a algum sistema=2>"}', true);
select * from public.get_sankhya_pendente_faturamento(111);

-- limpa os dados de teste
delete from public.sankhya_pendente_faturamento where codvend in (111, 222);
```
Confirmar que o resultado de cada chamada bate com o esperado descrito nos comentários.

---

### Task 2: Supabase — tabela e RPC de Meta (TGFMET)

**Files:**
- Migration via `mcp__supabase__apply_migration`.

**Interfaces:**
- Produces: tabela `sankhya_metas`; RPC `get_meta_representante(p_ano integer, p_mes integer, p_id_representante bigint default null)` retornando `numeric` (escalar, não tabela) — usada pela Task 5.
- Consumes: `profiles.role`, `representante_contas`.

- [ ] **Passo 1: Criar a tabela**

```sql
create table public.sankhya_metas (
  codvend bigint not null,
  mes_referencia date not null,
  meta numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (codvend, mes_referencia)
);
revoke all on public.sankhya_metas from anon, authenticated;
```

- [ ] **Passo 2: Criar a RPC**

```sql
create or replace function public.get_meta_representante(p_ano integer, p_mes integer, p_id_representante bigint default null)
 returns numeric
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with meu_role as (
    select role from public.profiles where id = auth.uid()
  ),
  meu_codvend as (
    select rc.id_representante
    from public.representante_contas rc
    where rc.profile_id = auth.uid() and rc.sistema = 2
    limit 1
  ),
  codvend_alvo as (
    select case
      when (select role from meu_role) = 'representante' then (select id_representante from meu_codvend)
      else p_id_representante
    end as codvend
  )
  select case
    when ca.codvend is null then null
    else coalesce(
      (select sum(m.meta) from public.sankhya_metas m
       where m.codvend = ca.codvend and m.mes_referencia = make_date(p_ano, p_mes, 1)),
      0
    )
  end
  from codvend_alvo ca;
$function$;
```

- [ ] **Passo 3: Verificar manualmente**

```sql
insert into public.sankhya_metas (codvend, mes_referencia, meta) values (111, '2026-07-01', 50000);

-- admin sem p_id_representante -> null (sem contexto de representante)
select public.get_meta_representante(2026, 7, null);

-- admin com p_id_representante=111 -> 50000
select public.get_meta_representante(2026, 7, 111);

-- mês sem meta cadastrada -> 0 (não null, já que o codvend foi resolvido)
select public.get_meta_representante(2026, 6, 111);

delete from public.sankhya_metas where codvend = 111;
```
Confirmar os 3 resultados batem com o esperado nos comentários.

---

### Task 3: Backend — "A Faturar" por vendedor

**Repositório:** `C:\Users\Power BI\projetos\backend`

**Files:**
- Modify: `src/services/services-new/sync-sankhya-pendente-faturamento.js`

**Interfaces:**
- Consumes: nada novo (mesma auth Sankhya já usada no arquivo).
- Produces: mesma função exportada `getPendenteFaturamento()`, agora grava N linhas (uma por `codvend`) em vez de 1.

- [ ] **Passo 1: Adicionar `CODVEND` na query e agrupar por vendedor**

Em `SQL_PENDENTE_FATURAMENTO`, trocar:
```js
const SQL_PENDENTE_FATURAMENTO = `
SELECT
    COUNT(DISTINCT CAB.NUNOTA) AS QTD,
    SUM(ITE.VLRTOT-ITE.VLRDESC) AS VLRNOTA,
    SUM(CASE WHEN ITE.USOPROD <> 'F' THEN (ITE.VLRTOT-ITE.VLRDESC) ELSE 0 END) AS VENDA,
    SUM(CASE WHEN ITE.USOPROD = 'F' THEN (ITE.VLRTOT-ITE.VLRDESC) ELSE 0 END) AS BONUS
FROM TGFCAB CAB
INNER JOIN TGFTOP TOP ON TOP.CODTIPOPER = CAB.CODTIPOPER AND TOP.DHALTER = CAB.DHTIPOPER
INNER JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
JOIN TGFITE ITE ON ITE.NUNOTA=CAB.NUNOTA AND ITE.CODEMP=CAB.CODEMP
WHERE CAB.TIPMOV = 'P'
AND NVL(TOP.ORCAMENTO, 'N') = 'N'
AND CAB.PENDENTE = 'S'
AND (
    CAB.CODTIPOPER IN (1010, 1011)
    OR (CAB.CODTIPOPER IN (1012, 1051) AND CAB.STATUSNOTA <> 'L')
    OR (CAB.CODTIPOPER IN (1012, 1051) AND CAB.STATUSNOTA = 'L' AND CAB.AD_IMPRIMEMAPA <> 4)
)
`;
```
por:
```js
const SQL_PENDENTE_FATURAMENTO = `
SELECT
    CAB.CODVEND,
    COUNT(DISTINCT CAB.NUNOTA) AS QTD,
    SUM(ITE.VLRTOT-ITE.VLRDESC) AS VLRNOTA,
    SUM(CASE WHEN ITE.USOPROD <> 'F' THEN (ITE.VLRTOT-ITE.VLRDESC) ELSE 0 END) AS VENDA,
    SUM(CASE WHEN ITE.USOPROD = 'F' THEN (ITE.VLRTOT-ITE.VLRDESC) ELSE 0 END) AS BONUS
FROM TGFCAB CAB
INNER JOIN TGFTOP TOP ON TOP.CODTIPOPER = CAB.CODTIPOPER AND TOP.DHALTER = CAB.DHTIPOPER
INNER JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
JOIN TGFITE ITE ON ITE.NUNOTA=CAB.NUNOTA AND ITE.CODEMP=CAB.CODEMP
WHERE CAB.TIPMOV = 'P'
AND NVL(TOP.ORCAMENTO, 'N') = 'N'
AND CAB.PENDENTE = 'S'
AND (
    CAB.CODTIPOPER IN (1010, 1011)
    OR (CAB.CODTIPOPER IN (1012, 1051) AND CAB.STATUSNOTA <> 'L')
    OR (CAB.CODTIPOPER IN (1012, 1051) AND CAB.STATUSNOTA = 'L' AND CAB.AD_IMPRIMEMAPA <> 4)
)
GROUP BY CAB.CODVEND
`;
```

- [ ] **Passo 2: Trocar upsert de 1 linha por "apaga tudo, insere de novo"**

Em `getPendenteFaturamento()`, trocar:
```js
    const [registro] = parseDbExplorer(json);

    const snapshot = {
      id: 1,
      qtd: Number(registro?.qtd ?? 0),
      vlrnota: Number(registro?.vlrnota ?? 0),
      venda: Number(registro?.venda ?? 0),
      bonus: Number(registro?.bonus ?? 0),
      updated_at: new Date().toISOString(),
    };

    console.log("📦 Pendente de faturamento:", snapshot);

    const { error } = await supabase
      .from("sankhya_pendente_faturamento")
      .upsert(snapshot, { onConflict: "id" });

    if (error) throw error;

    console.log("🎉 Sync de pendente de faturamento concluída");

    return snapshot;
```
por:
```js
    const registros = parseDbExplorer(json);
    const agora = new Date().toISOString();

    const linhas = registros
      .filter((r) => r?.codvend != null)
      .map((r) => ({
        codvend: Number(r.codvend),
        qtd: Number(r.qtd ?? 0),
        vlrnota: Number(r.vlrnota ?? 0),
        venda: Number(r.venda ?? 0),
        bonus: Number(r.bonus ?? 0),
        updated_at: agora,
      }));

    console.log(`📦 Pendente de faturamento: ${linhas.length} vendedor(es)`);

    const { error: deleteError } = await supabase
      .from("sankhya_pendente_faturamento")
      .delete()
      .gte("codvend", 0);

    if (deleteError) throw deleteError;

    if (linhas.length > 0) {
      const { error: insertError } = await supabase
        .from("sankhya_pendente_faturamento")
        .insert(linhas);

      if (insertError) throw insertError;
    }

    console.log("🎉 Sync de pendente de faturamento concluída");

    return linhas;
```
(`.gte("codvend", 0)` é o jeito do supabase-js de fazer `delete from ... ` sem cláusula `where` real — `codvend` é sempre >= 0 pra vendedor válido no Sankhya, então isso apaga todas as linhas.)

- [ ] **Passo 3: Verificar manualmente**

No backend, rodar `npm run dev` e, em outro terminal:
```bash
curl -X POST http://localhost:<porta>/update-pendente-faturamento
```
Depois, via `mcp__supabase__execute_sql`: `select * from public.sankhya_pendente_faturamento order by venda desc limit 10;` — confirmar que há várias linhas (uma por `codvend`), com valores plausíveis, e que a resposta do `curl` retornou `status: 'ok'` com a lista de linhas.

- [ ] **Passo 4: Commit**

```bash
cd "C:\Users\Power BI\projetos\backend"
git add src/services/services-new/sync-sankhya-pendente-faturamento.js
git commit -m "feat: quebra pendente de faturamento por vendedor (CODVEND)"
```

---

### Task 4: Backend — sync de Meta (TGFMET)

**Repositório:** `C:\Users\Power BI\projetos\backend`

**Files:**
- Create: `src/services/services-new/sync-sankhya-metas.js`
- Modify: `src/routes/sankhya.routes.js`

**Interfaces:**
- Produces: função exportada `getMetasSankhya()` (nome deliberadamente diferente de `getMetas`, já existente em `sync-fideliza-meta.js` — evita colisão de import por nome igual em arquivos diferentes).

- [ ] **Passo 1: Criar o serviço de sync**

Criar `src/services/services-new/sync-sankhya-metas.js`:
```js
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

// Meta (COTA) mensal por vendedor: TGFMET.PREVREC, TGFMET.DTREF (1o dia do mes), TGFMET.CODVEND.
// Sincroniza uma janela de 12 meses pra tras + mes atual (historico "de graca" pra uso futuro).
function buildSqlMetas() {
  return `
SELECT
    MET.CODVEND,
    TO_CHAR(MET.DTREF, 'YYYY-MM-DD') AS DTREF,
    SUM(MET.PREVREC) AS META
FROM TGFMET MET
WHERE MET.CODVEND > 0
  AND MET.DTREF >= ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -12)
  AND MET.DTREF <= TRUNC(SYSDATE, 'MM')
GROUP BY MET.CODVEND, MET.DTREF
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

export async function getMetasSankhya() {
  try {
    const accessToken = await getAccessToken();
    console.log("🔑 AccessToken OK");

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
          requestBody: { sql: buildSqlMetas() },
        }),
      }
    );

    const json = await response.json();
    const registros = parseDbExplorer(json);
    const agora = new Date().toISOString();

    const linhas = registros.map((r) => ({
      codvend: Number(r.codvend),
      mes_referencia: r.dtref,
      meta: Number(r.meta ?? 0),
      updated_at: agora,
    }));

    console.log(`📦 Metas: ${linhas.length} linha(s) (vendedor x mes)`);

    const { error } = await supabase
      .from("sankhya_metas")
      .upsert(linhas, { onConflict: "codvend,mes_referencia" });

    if (error) throw error;

    console.log("🎉 Sync de metas concluída");

    return linhas;
  } catch (err) {
    console.error("❌ ERRO GERAL:", err);
    throw err;
  }
}
```

- [ ] **Passo 2: Adicionar a rota**

Em `src/routes/sankhya.routes.js`, adicionar o import (junto dos outros de `services-new`):
```js
import { getMetasSankhya } from '../services/services-new/sync-sankhya-metas.js';
```
E, no bloco `ROTAS NOVAS — services-new`, adicionar após a rota `/update-pendente-faturamento`:
```js
  app.post("/update-metas", async (request, reply) => {
    try {
      const linhas = await getMetasSankhya()
      return { status: 'ok', message: 'Metas sincronizadas com sucesso', data: linhas }
    } catch (err) {
      app.log.error(err)
      return reply.status(500).send({ status: 'error', message: err.message })
    }
  })
```

- [ ] **Passo 3: Verificar manualmente**

```bash
curl -X POST http://localhost:<porta>/update-metas
```
Via `mcp__supabase__execute_sql`: `select * from public.sankhya_metas order by mes_referencia desc, meta desc limit 10;` — confirmar linhas com `mes_referencia` no formato `YYYY-MM-01` e valores de `meta` plausíveis.

- [ ] **Passo 4: Commit**

```bash
cd "C:\Users\Power BI\projetos\backend"
git add src/services/services-new/sync-sankhya-metas.js src/routes/sankhya.routes.js
git commit -m "feat: sync de metas (TGFMET/COTA) por vendedor e mes"
```

---

### Task 5: Frontend — camada de dados (lib + hook)

**Files:**
- Modify: `src/lib/dashboard.ts`
- Modify: `src/hooks/dashboard/use-dashboard-data.ts`

**Interfaces:**
- Consumes: RPCs `get_sankhya_pendente_faturamento(p_id_representante)` e `get_meta_representante(p_ano, p_mes, p_id_representante)` das Tasks 1 e 2.
- Produces: `useDashboardData` passa a retornar `metaRepresentante: number | null`, além do `pendenteFaturamento` já existente (agora ciente do representante). Consumido pela Task 6.

- [ ] **Passo 1: Atualizar `getPendenteFaturamento` em `src/lib/dashboard.ts`**

Trocar:
```ts
export async function getPendenteFaturamento(): Promise<PendenteFaturamento | null> {
  const { data, error } = await supabase.rpc("get_sankhya_pendente_faturamento")

  if (error) {
    throw error
  }
```
por:
```ts
export async function getPendenteFaturamento(
  idRepresentante: number | null
): Promise<PendenteFaturamento | null> {
  const { data, error } = await supabase.rpc("get_sankhya_pendente_faturamento", {
    p_id_representante: idRepresentante,
  })

  if (error) {
    throw error
  }
```
(o resto da função permanece igual.)

- [ ] **Passo 2: Adicionar `getMetaRepresentante` em `src/lib/dashboard.ts`**

Adicionar após `getPendenteFaturamento`:
```ts
export async function getMetaRepresentante(
  ano: number,
  mes: number,
  idRepresentante: number | null
): Promise<number | null> {
  if (idRepresentante === null) {
    return null
  }

  const { data, error } = await supabase.rpc("get_meta_representante", {
    p_ano: ano,
    p_mes: mes,
    p_id_representante: idRepresentante,
  })

  if (error) {
    throw error
  }

  return data === null ? null : Number(data)
}
```

- [ ] **Passo 3: Atualizar `use-dashboard-data.ts`**

Import: trocar
```ts
import {
  getDashboardAvailableMonths,
  getDashboardAvailableYears,
  getDashboardKpis,
  getDashboardKpisComparison,
  getDashboardMetricsDaily,
  getDashboardProjectionDaily,
  getPendenteFaturamento,
  type DashboardFiltersInput,
  type DashboardKpis,
  type DashboardKpisComparison,
  type DashboardMetricDailyPoint,
  type DashboardProjectionDailyPoint,
  type DashboardMonthOption,
  type PendenteFaturamento,
} from "@/lib/dashboard"
```
por:
```ts
import {
  getDashboardAvailableMonths,
  getDashboardAvailableYears,
  getDashboardKpis,
  getDashboardKpisComparison,
  getDashboardMetricsDaily,
  getDashboardProjectionDaily,
  getPendenteFaturamento,
  getMetaRepresentante,
  type DashboardFiltersInput,
  type DashboardKpis,
  type DashboardKpisComparison,
  type DashboardMetricDailyPoint,
  type DashboardProjectionDailyPoint,
  type DashboardMonthOption,
  type PendenteFaturamento,
} from "@/lib/dashboard"
```

`UseDashboardDataParams` ganha o sinal de "sou representante" (a página já sabe disso via `getMyProfile`):
```ts
type UseDashboardDataParams = {
  filters: DashboardFiltersInput
  hasComparison: boolean
  filtersReady?: boolean
  isRepresentanteView: boolean
}
```

Assinatura da função:
```ts
export function useDashboardData({ filters, hasComparison, filtersReady, isRepresentanteView }: UseDashboardDataParams) {
```

Novo estado, junto de `pendenteFaturamento`:
```ts
  const [metaRepresentante, setMetaRepresentante] = useState<number | null>(null)
```

`loadPendenteFaturamento` passa a receber o `idRepresentante` só como sinal de contexto (a RPC ignora o valor pra representante, mas o admin não filtra por ninguém — então sempre `null` é o correto pra passar aqui, já que não existe seletor de representante nesta tela):
```ts
  const loadPendenteFaturamento = useCallback(async () => {
    try {
      const data = await getPendenteFaturamento(null)
      setPendenteFaturamento(data)
    } catch (error) {
      logger.error("use-dashboard-data/loadPendenteFaturamento", error)
    }
  }, [])
```
(sem mudança de comportamento pra admin; pra representante, a RPC já resolve pelo `auth.uid()` independente do parâmetro.)

Novo loader de meta, só dispara quando `isRepresentanteView` e há `ano`/`mes` selecionados. O terceiro argumento de `getMetaRepresentante` é só um sinal "existe representante no contexto" — a RPC ignora esse valor e resolve o `codvend` pelo `auth.uid()` quando `role='representante'` (qualquer número não-nulo funciona; usamos `1` por não ter melhor candidato, já que este Dashboard não tem seletor de representante):
```ts
  const loadMetaRepresentante = useCallback(async () => {
    if (!isRepresentanteView || !ano || !mes) {
      setMetaRepresentante(null)
      return
    }

    try {
      const data = await getMetaRepresentante(ano, mes, 1)
      setMetaRepresentante(data)
    } catch (error) {
      logger.error("use-dashboard-data/loadMetaRepresentante", error)
    }
  }, [isRepresentanteView, ano, mes])
```

Efeito próprio (mesmo padrão do `loadPendenteFaturamento`), logo após o `useEffect` que chama `loadPendenteFaturamento`:
```ts
  useEffect(() => {
    loadMetaRepresentante()
  }, [loadMetaRepresentante])
```

Incluir no `Promise.all` de `loadDashboardData` (junto de `loadPendenteFaturamento()`):
```ts
        const [
          kpisData,
          comparisonData,
          metricsData,
          metricsPreviousData,
          metricsLastYearData,
          projectionData,
        ] = await Promise.all([
          getDashboardKpis(filtersToQuery),
          comparisonPromise,
          getDashboardMetricsDaily(filtersToQuery),
          previousMetricsPromise,
          lastYearMetricsPromise,
          projectionPromise,
          loadPendenteFaturamento(),
          loadMetaRepresentante(),
        ])
```
(a lista de retorno desestruturada continua com os mesmos 6 nomes — `loadPendenteFaturamento()`/`loadMetaRepresentante()` já atualizam seu próprio estado via `setPendenteFaturamento`/`setMetaRepresentante`, não precisam de posição na desestruturação, igual já ocorre hoje com `loadPendenteFaturamento`.)

Adicionar `loadMetaRepresentante` na lista de dependências do `useCallback` de `loadDashboardData` (ao lado de `loadPendenteFaturamento`):
```ts
    [filtersReady, ano, mes, dataInicio, dataFim, idRepresentante, mercado, contasKey, isBionatus, hasComparison, loadPendenteFaturamento, loadMetaRepresentante]
```

Retorno do hook: adicionar `metaRepresentante`:
```ts
  return {
    kpis,
    kpisComparison,
    availableYears,
    availableMonths,
    metricsDaily,
    metricsPreviousDaily,
    metricsLastYearDaily,
    projectionDaily,
    pendenteFaturamento,
    metaRepresentante,
    loading,
    refreshing,
    lastUpdated,
    loadDashboardData,
  }
```

- [ ] **Passo 4: Rodar o build**

```bash
npm run build
```
Deve falhar aqui de propósito (tipo `UseDashboardDataParams` exige `isRepresentanteView`, mas `dashboard-page.tsx` ainda não passa) — confirma que o erro apontado é exatamente esse (uso em `dashboard-page.tsx`), não outro. A Task 6 corrige.

---

### Task 6: Frontend — Bullet graph e integração visual

**Files:**
- Create: `src/components/ui/myComponents/bullet-graph.tsx`
- Modify: `src/components/ui/myComponents/kpi-card.tsx`
- Modify: `src/components/dashboard/dashboard-kpis-section.tsx`
- Modify: `src/pages/dashboard/dashboard-page.tsx`

**Interfaces:**
- Consumes: `metaRepresentante` e `isRepresentanteView` (Task 5 / já existente na página).
- Produces: `BulletGraph` (componente exportado, reutilizável).

- [ ] **Passo 1: Criar `src/components/ui/myComponents/bullet-graph.tsx`**

```tsx
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
```

- [ ] **Passo 2: Adicionar prop `extra` em `kpi-card.tsx`**

Trocar:
```tsx
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
```
por:
```tsx
type KpiCardProps = {
  title: string
  value: string
  icon: ReactNode
  accentColor: string
  accentBg: string
  comparisons?: ComparisonItem[]
  loading?: boolean
  badge?: string
  extra?: ReactNode
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
  extra,
}: KpiCardProps) {
```

E, imediatamente depois do bloco do valor/skeleton (antes da `div` de `comparisons`), adicionar:
```tsx
      {loading ? (
        <Skeleton className="mt-4 h-8 w-28 sm:h-9 sm:w-36" />
      ) : (
        <h3 className="mt-4 text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-100 sm:text-3xl">
          {value}
        </h3>
      )}

      {extra && !loading && extra}

      <div className="mt-4 space-y-2">
```

- [ ] **Passo 3: Atualizar `dashboard-kpis-section.tsx`**

Trocar:
```tsx
import KpiCard from "@/components/ui/myComponents/kpi-card"
import {
  formatCurrencyBRL,
  formatNumberBR,
  formatPercentBR,
  getPercentageChange,
} from "@/lib/format"
import { dashboardKpiCards } from "@/lib/dashboard/dashboard-kpi-cards"
import type { DashboardKpis, DashboardKpisComparison, PendenteFaturamento } from "@/lib/dashboard"

type DashboardKpisSectionProps = {
  loading: boolean
  hasComparison: boolean
  kpis: DashboardKpis | null
  kpisComparison: DashboardKpisComparison | null
  pendenteFaturamento: PendenteFaturamento | null
}

export function DashboardKpisSection({
  loading,
  hasComparison,
  kpis,
  kpisComparison,
  pendenteFaturamento,
}: DashboardKpisSectionProps) {
```
por:
```tsx
import KpiCard from "@/components/ui/myComponents/kpi-card"
import BulletGraph from "@/components/ui/myComponents/bullet-graph"
import {
  formatCurrencyBRL,
  formatNumberBR,
  formatPercentBR,
  getPercentageChange,
} from "@/lib/format"
import { dashboardKpiCards } from "@/lib/dashboard/dashboard-kpi-cards"
import type { DashboardKpis, DashboardKpisComparison, PendenteFaturamento } from "@/lib/dashboard"

type DashboardKpisSectionProps = {
  loading: boolean
  hasComparison: boolean
  kpis: DashboardKpis | null
  kpisComparison: DashboardKpisComparison | null
  pendenteFaturamento: PendenteFaturamento | null
  metaRepresentante: number | null
}

export function DashboardKpisSection({
  loading,
  hasComparison,
  kpis,
  kpisComparison,
  pendenteFaturamento,
  metaRepresentante,
}: DashboardKpisSectionProps) {
```

E, no `badge`/render do card, adicionar a prop `extra` (dentro do `map`, onde já existe `currentValue`):
```tsx
          <KpiCard
            key={card.key}
            title={card.title}
            value={formatValue(currentValue)}
            loading={loading}
            icon={<Icon className="h-5 w-5" />}
            accentColor="#FFF"
            accentBg={card.accentBg}
            badge={
              card.key === "faturamento" && pendenteFaturamento && pendenteFaturamento.venda > 0
                ? `A faturar: ${formatCurrencyBRL(pendenteFaturamento.venda)}`
                : undefined
            }
            extra={
              card.key === "faturamento" && metaRepresentante !== null
                ? <BulletGraph valor={currentValue} meta={metaRepresentante} />
                : undefined
            }
            comparisons={
```

- [ ] **Passo 4: Atualizar `dashboard-page.tsx`**

Trocar:
```tsx
  const {
    kpis,
    kpisComparison,
    availableYears,
    availableMonths,
    metricsDaily,
    metricsPreviousDaily,
    metricsLastYearDaily,
    projectionDaily,
    pendenteFaturamento,
    loading,
    refreshing,
    lastUpdated,
    loadDashboardData,
  } = useDashboardData({ filters, hasComparison, filtersReady })
```
por:
```tsx
  const {
    kpis,
    kpisComparison,
    availableYears,
    availableMonths,
    metricsDaily,
    metricsPreviousDaily,
    metricsLastYearDaily,
    projectionDaily,
    pendenteFaturamento,
    metaRepresentante,
    loading,
    refreshing,
    lastUpdated,
    loadDashboardData,
  } = useDashboardData({ filters, hasComparison, filtersReady, isRepresentanteView })
```

E:
```tsx
        <DashboardKpisSection
          loading={loading}
          hasComparison={hasComparison}
          kpis={kpis}
          kpisComparison={kpisComparison}
          pendenteFaturamento={pendenteFaturamento}
        />
```
por:
```tsx
        <DashboardKpisSection
          loading={loading}
          hasComparison={hasComparison}
          kpis={kpis}
          kpisComparison={kpisComparison}
          pendenteFaturamento={pendenteFaturamento}
          metaRepresentante={metaRepresentante}
        />
```

(`isRepresentanteView` já existe em `dashboard-page.tsx` desde antes deste plano — só passa a ser usado também aqui, além do aviso visual que já mostrava.)

- [ ] **Passo 5: Rodar o build**

```bash
npm run build
```
Deve passar limpo. Nenhum erro de tipo relacionado às mudanças deste plano.

- [ ] **Passo 6: Commit**

```bash
git add src/lib/dashboard.ts src/hooks/dashboard/use-dashboard-data.ts src/components/ui/myComponents/bullet-graph.tsx src/components/ui/myComponents/kpi-card.tsx src/components/dashboard/dashboard-kpis-section.tsx src/pages/dashboard/dashboard-page.tsx
git commit -m "feat: A Faturar por representante e bullet graph de Meta (TGFMET) no Dashboard"
```
