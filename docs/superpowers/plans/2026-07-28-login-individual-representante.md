# Login individual por representante Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada representante loga com e-mail/senha e vê, nas 6 RPCs de dashboard que expõem
números, exclusivamente os próprios dados — reforçado no banco, não apenas confiado no cliente —
sem quebrar o uso atual de gestor/admin.

**Architecture:** Uma tabela nova (`representante_contas`) vincula um login a um ou mais pares
`(sistema, id_representante)`. Um novo valor de `profiles.role` (`'representante'`) marca quem é
representante. Uma função auxiliar (`_dashboard_rep_visible`) centraliza a regra "esta linha é
visível para quem está chamando" e é injetada, por substituição textual pontual, dentro das 6 RPCs
`get_dashboard_*` que hoje filtram por `p_id_representante` sem checagem de identidade. Um
pré-requisito de segurança pré-existente (grants excessivos em `vw_pedidos`/`vw_pedidos_v2`) é
corrigido antes de tudo, já que sem isso o reforço nas RPCs seria contornável.

**Tech Stack:** Supabase Postgres, via `mcp__supabase__execute_sql` (inspeção) e
`mcp__supabase__apply_migration` (DDL) — projeto sem migrations locais, mudanças aplicadas direto no
projeto ao vivo. Frontend React/Vite (mudança mínima, ver Task 8).

## Global Constraints

- `id_representante` sozinho **não** identifica um representante de forma única — colide entre
  sistemas (confirmado: código `51` é "PEDRO FIGUEIRA" no Sankhya e uma entidade não relacionada no
  Nexus). Toda checagem de identidade neste plano usa o par `(sistema, id_representante)`, nunca
  `id_representante` isolado.
- As 8 RPCs `get_dashboard_*` são `SECURITY DEFINER` — o branch "gestor/admin" de cada uma
  permanece **byte-a-byte igual** ao que já existe hoje; a única mudança é a substituição pontual do
  fragmento de filtro por representante, nunca reescrever o resto da lógica.
- `get_dashboard_available_years`/`get_dashboard_available_months` não recebem
  `p_id_representante` e não expõem valores financeiros — **fora de escopo**, não são tocadas.
- Nenhuma tabela existente perde dados nem muda de estrutura, exceto a `ALTER TABLE
  public.profiles ADD CONSTRAINT ...` do Task 2 (aditiva, não destrutiva).
- Projeto sem framework de testes automatizado. "Testar" um passo significa rodar o
  SQL/RPC/comando indicado e confirmar a saída esperada.

---

### Task 1: Corrigir grants excessivos em `vw_pedidos`/`vw_pedidos_v2` (pré-requisito bloqueante)

**Files:** nenhum (Supabase apenas).

**Interfaces:**
- Consome: nada de outras tasks.
- Produz: garante que o reforço de segurança das Tasks 4-9 não seja contornável via acesso direto
  às views pelo `supabase-js` do cliente.

- [ ] **Step 1: Confirmar que nada legítimo depende do acesso direto hoje**

```sql
SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('vw_pedidos','vw_pedidos_v2')
AND grantee IN ('anon','authenticated') ORDER BY table_name, grantee, privilege_type;
```

Confirmado durante o design: nenhuma RPC nem código do frontend (`grep` em `src/` por
`vw_pedidos` retorna zero arquivos) referencia essas views diretamente — todo consumo real passa
pelas materialized views via RPC, ou pelo backend via `service_role`. Este passo é só uma
reconfirmação de sanidade antes de revogar (estado pode ter mudado desde o design).

- [ ] **Step 2: Revogar os grants excessivos**

```sql
REVOKE ALL ON public.vw_pedidos FROM anon, authenticated;
REVOKE ALL ON public.vw_pedidos_v2 FROM anon, authenticated;
```

- [ ] **Step 3: Verificar que os grants foram removidos**

```sql
SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('vw_pedidos','vw_pedidos_v2')
AND grantee IN ('anon','authenticated');
```

Esperado: zero linhas.

- [ ] **Step 4: Verificar que o dashboard atual continua funcionando (smoke test via RPC)**

```sql
SELECT * FROM get_dashboard_kpis(p_data_inicio := '2026-06-01', p_data_fim := '2026-07-31');
```

Esperado: mesmo resultado de antes do revoke (essa RPC nunca dependeu de acesso direto à view —
ela lê `mv_dashboard_kpis_diario`/`mv_dashboard_clientes_diario`, que já não tinham grant nenhum
pra `anon`/`authenticated`). Se der erro de permissão aqui, é sinal de que algo dependia do grant
revogado — parar e investigar antes de seguir.

Sem commit nesta task (Supabase apenas).

---

### Task 2: Criar `representante_contas` e o valor `'representante'` em `profiles.role`

**Files:** nenhum (Supabase apenas).

**Interfaces:**
- Consome: `public.profiles(id, role)` (já existe).
- Produz: `public.representante_contas(profile_id, sistema, id_representante)` — consumida pela
  Task 3 (`_dashboard_rep_visible`). `profiles.role` aceitando `'representante'` — consumida pelas
  Tasks 3 e 8.

- [ ] **Step 1: Criar a tabela**

```sql
CREATE TABLE public.representante_contas (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sistema integer NOT NULL CHECK (sistema IN (1, 2)),
  id_representante bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, sistema, id_representante),
  UNIQUE (sistema, id_representante)
);
```

Nota: a PK é composta (`profile_id, sistema, id_representante`) em vez de só `profile_id`, porque
um mesmo `profile_id` pode ter mais de uma linha (uma por sistema em que a pessoa atua) — a
`UNIQUE(sistema, id_representante)` continua garantindo que um representante não seja vinculado a
dois logins diferentes.

- [ ] **Step 2: Travar o acesso — só `service_role` toca essa tabela diretamente**

```sql
REVOKE ALL ON TABLE public.representante_contas FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.representante_contas TO service_role;
```

Ninguém precisa consultar essa tabela direto pelo cliente — só a função auxiliar da Task 3 (que
roda em contexto elevado, ver Task 3) e o provisionamento manual (Task 10, via SQL Editor/service
role).

- [ ] **Step 3: Adicionar a constraint de valores válidos em `profiles.role`**

```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND contype = 'c';
```

Esperado: zero linhas (confirmado durante o design — hoje não existe nenhuma CHECK constraint em
`profiles`). Se aparecer alguma, leia sua definição antes de continuar (pode já restringir `role`
de um jeito incompatível com o próximo passo).

```sql
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'representante'));
```

- [ ] **Step 4: Verificar**

```sql
SELECT matviewname FROM pg_matviews WHERE matviewname = 'representante_contas'; -- deve dar 0 linhas (é tabela, não MV)
SELECT table_name FROM information_schema.tables WHERE table_name = 'representante_contas';
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_role_check';
```

Esperado: `representante_contas` aparece em `information_schema.tables`; a constraint aparece com
definição `CHECK ((role = ANY (ARRAY['user'::text, 'representante'::text])))`.

Sem commit nesta task (Supabase apenas).

---

### Task 3: Criar a função auxiliar `_dashboard_rep_visible`

**Files:** nenhum (Supabase apenas).

**Interfaces:**
- Consome: `public.profiles.role`, `public.representante_contas` (Task 2), `auth.uid()` (padrão
  Supabase Auth).
- Produz: `public._dashboard_rep_visible(p_sistema integer, p_id_representante bigint,
  p_filter_id_representante bigint) RETURNS boolean` — consumida pelas Tasks 4-9.

- [ ] **Step 1: Criar a função**

```sql
CREATE OR REPLACE FUNCTION public._dashboard_rep_visible(
  p_sistema integer,
  p_id_representante bigint,
  p_filter_id_representante bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'representante'
      THEN EXISTS (
        SELECT 1 FROM public.representante_contas rc
        WHERE rc.profile_id = auth.uid()
          AND rc.sistema = p_sistema
          AND rc.id_representante = p_id_representante
      )
    ELSE (p_filter_id_representante IS NULL OR p_id_representante = p_filter_id_representante)
  END;
$function$;
```

Como as 6 RPCs que vão chamar essa função já são `SECURITY DEFINER`, esta função herda o mesmo
contexto elevado de execução (não precisa da sua própria `SECURITY DEFINER`) — mas ainda assim
trava o acesso direto por precaução, já que ela lê `profiles`/`representante_contas`:

```sql
REVOKE ALL ON FUNCTION public._dashboard_rep_visible(integer, bigint, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._dashboard_rep_visible(integer, bigint, bigint)
  TO authenticated, service_role;
```

- [ ] **Step 2: Testar os dois caminhos manualmente**

```sql
-- Caminho "gestor" (sem vínculo de representante): comporta-se como o filtro antigo
SELECT public._dashboard_rep_visible(2, 51, NULL);   -- esperado: true (filtro NULL = sem restrição)
SELECT public._dashboard_rep_visible(2, 51, 51);      -- esperado: true (bate)
SELECT public._dashboard_rep_visible(2, 51, 999);     -- esperado: false (não bate)
```

Esperado: `true`, `true`, `false` — isso confirma que, para qualquer usuário sem `role='representante'`
(inclusive quando não há usuário autenticado, caso comum ao rodar via SQL Editor com `service_role`),
a função reproduz exatamente a regra antiga `(p_filter IS NULL OR id = p_filter)`. O teste completo do
caminho "representante" (retornando `true` só para os pares vinculados) fica no Task 10, depois que
existir pelo menos uma conta de teste em `representante_contas`.

Sem commit nesta task (Supabase apenas).

---

### Task 4: Aplicar o reforço em `get_dashboard_kpis`

**Files:** nenhum (Supabase apenas).

**Interfaces:**
- Consome: `public._dashboard_rep_visible` (Task 3).
- Produz: `get_dashboard_kpis` sem alteração de assinatura nem de shape de retorno — consumida por
  `src/lib/dashboard.ts:getDashboardKpis` (já existente, sem mudança necessária).

- [ ] **Step 1: Aplicar a nova definição**

```sql
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date, p_id_representante bigint DEFAULT NULL::bigint, p_mercado integer DEFAULT NULL::integer, p_contas integer[] DEFAULT NULL::integer[], p_is_bionatus integer DEFAULT NULL::integer)
 RETURNS TABLE(faturamento numeric, pedidos bigint, ticket_medio numeric, positivacoes bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    with base_kpis as (
        select
            coalesce(sum(faturamento), 0) as faturamento,
            coalesce(sum(pedidos), 0)::bigint as pedidos
        from public.mv_dashboard_kpis_diario
        where
            (p_data_inicio is null or data_ref >= p_data_inicio)
            and (p_data_fim is null or data_ref <= p_data_fim)
            and public._dashboard_rep_visible(sistema, id_representante, p_id_representante)
            and (p_mercado is null or mercado = p_mercado)
            and (
                p_contas is null
                or cardinality(p_contas) = 0
                or contas = any(p_contas)
            )
            and (p_is_bionatus is null or is_bionatus = p_is_bionatus)
    ),
    base_positivacoes as (
        select
            count(distinct cnpj)::bigint as positivacoes
        from public.mv_dashboard_clientes_diario
        where
            (p_data_inicio is null or data_ref >= p_data_inicio)
            and (p_data_fim is null or data_ref <= p_data_fim)
            and public._dashboard_rep_visible(sistema, id_representante, p_id_representante)
            and (p_mercado is null or mercado = p_mercado)
            and (
                p_contas is null
                or cardinality(p_contas) = 0
                or contas = any(p_contas)
            )
            and (p_is_bionatus is null or is_bionatus = p_is_bionatus)
    )
    select
        k.faturamento,
        k.pedidos,
        case
            when k.pedidos = 0 then 0
            else round(k.faturamento / k.pedidos, 2)
        end as ticket_medio,
        p.positivacoes
    from base_kpis k
    cross join base_positivacoes p;
$function$;
```

- [ ] **Step 2: Regressão — comparar contra o resultado de referência já validado nesta sessão**

```sql
SELECT * FROM get_dashboard_kpis(p_data_inicio := '2026-06-01', p_data_fim := '2026-07-31');
```

Esperado: **exatamente** `faturamento=7250580.495`, `pedidos=5824`, `ticket_medio=1244.95`,
`positivacoes=2411` (mesmo valor confirmado na Task 3 do corte `vw_pedidos_v2`, antes desta
mudança) — prova que, para o caminho gestor/admin (sem `role='representante'`), o comportamento é
idêntico.

Sem commit nesta task (Supabase apenas).

---

### Task 5: Aplicar o reforço em `get_dashboard_kpis_comparison`

**Files:** nenhum (Supabase apenas).

**Interfaces:**
- Consome: `public._dashboard_rep_visible` (Task 3).
- Produz: `get_dashboard_kpis_comparison` sem alteração de assinatura — consumida por
  `src/lib/dashboard.ts:getDashboardKpisComparison`.

- [ ] **Step 1: Aplicar a nova definição**

```sql
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis_comparison(p_data_inicio date, p_data_fim date, p_data_inicio_mes_anterior date, p_data_fim_mes_anterior date, p_data_inicio_ano_anterior date, p_data_fim_ano_anterior date, p_id_representante bigint DEFAULT NULL::bigint, p_mercado integer DEFAULT NULL::integer, p_contas integer[] DEFAULT NULL::integer[], p_is_bionatus integer DEFAULT NULL::integer)
 RETURNS TABLE(faturamento_atual numeric, faturamento_mes_anterior numeric, faturamento_ano_anterior numeric, pedidos_atual bigint, pedidos_mes_anterior bigint, pedidos_ano_anterior bigint, ticket_medio_atual numeric, ticket_medio_mes_anterior numeric, ticket_medio_ano_anterior numeric, positivacoes_atual bigint, positivacoes_mes_anterior bigint, positivacoes_ano_anterior bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH base_kpis AS (
    SELECT
        COALESCE(SUM(faturamento) FILTER (WHERE data_ref BETWEEN p_data_inicio              AND p_data_fim),              0)          AS fat_atual,
        COALESCE(SUM(faturamento) FILTER (WHERE data_ref BETWEEN p_data_inicio_mes_anterior AND p_data_fim_mes_anterior), 0)          AS fat_mes_ant,
        COALESCE(SUM(faturamento) FILTER (WHERE data_ref BETWEEN p_data_inicio_ano_anterior AND p_data_fim_ano_anterior), 0)          AS fat_ano_ant,
        COALESCE(SUM(pedidos)     FILTER (WHERE data_ref BETWEEN p_data_inicio              AND p_data_fim),              0)::bigint  AS ped_atual,
        COALESCE(SUM(pedidos)     FILTER (WHERE data_ref BETWEEN p_data_inicio_mes_anterior AND p_data_fim_mes_anterior), 0)::bigint  AS ped_mes_ant,
        COALESCE(SUM(pedidos)     FILTER (WHERE data_ref BETWEEN p_data_inicio_ano_anterior AND p_data_fim_ano_anterior), 0)::bigint  AS ped_ano_ant
    FROM public.mv_dashboard_kpis_diario
    WHERE data_ref BETWEEN LEAST(p_data_inicio, p_data_inicio_mes_anterior, p_data_inicio_ano_anterior)
                       AND GREATEST(p_data_fim, p_data_fim_mes_anterior, p_data_fim_ano_anterior)
      AND public._dashboard_rep_visible(sistema, id_representante, p_id_representante)
      AND (p_mercado          IS NULL OR mercado           = p_mercado)
      AND (p_contas IS NULL OR cardinality(p_contas) = 0 OR contas = ANY(p_contas))
      AND (p_is_bionatus      IS NULL OR is_bionatus       = p_is_bionatus)
),
base_positivacoes AS (
    SELECT
        COUNT(DISTINCT CASE WHEN data_ref BETWEEN p_data_inicio              AND p_data_fim              THEN cnpj END)::bigint AS pos_atual,
        COUNT(DISTINCT CASE WHEN data_ref BETWEEN p_data_inicio_mes_anterior AND p_data_fim_mes_anterior THEN cnpj END)::bigint AS pos_mes_ant,
        COUNT(DISTINCT CASE WHEN data_ref BETWEEN p_data_inicio_ano_anterior AND p_data_fim_ano_anterior THEN cnpj END)::bigint AS pos_ano_ant
    FROM public.mv_dashboard_clientes_diario
    WHERE data_ref BETWEEN LEAST(p_data_inicio, p_data_inicio_mes_anterior, p_data_inicio_ano_anterior)
                       AND GREATEST(p_data_fim, p_data_fim_mes_anterior, p_data_fim_ano_anterior)
      AND public._dashboard_rep_visible(sistema, id_representante, p_id_representante)
      AND (p_mercado          IS NULL OR mercado           = p_mercado)
      AND (p_contas IS NULL OR cardinality(p_contas) = 0 OR contas = ANY(p_contas))
      AND (p_is_bionatus      IS NULL OR is_bionatus       = p_is_bionatus)
)
SELECT
    k.fat_atual,
    k.fat_mes_ant,
    k.fat_ano_ant,
    k.ped_atual,
    k.ped_mes_ant,
    k.ped_ano_ant,
    CASE WHEN k.ped_atual    = 0 THEN 0 ELSE ROUND(k.fat_atual    / k.ped_atual,    2) END,
    CASE WHEN k.ped_mes_ant  = 0 THEN 0 ELSE ROUND(k.fat_mes_ant  / k.ped_mes_ant,  2) END,
    CASE WHEN k.ped_ano_ant  = 0 THEN 0 ELSE ROUND(k.fat_ano_ant  / k.ped_ano_ant,  2) END,
    p.pos_atual,
    p.pos_mes_ant,
    p.pos_ano_ant
FROM base_kpis k
CROSS JOIN base_positivacoes p;
$function$;
```

- [ ] **Step 2: Regressão**

```sql
SELECT * FROM get_dashboard_kpis_comparison(
  p_data_inicio := '2026-06-01', p_data_fim := '2026-07-31',
  p_data_inicio_mes_anterior := '2026-05-01', p_data_fim_mes_anterior := '2026-06-30',
  p_data_inicio_ano_anterior := '2025-06-01', p_data_fim_ano_anterior := '2025-07-31'
);
```

Esperado: `faturamento_atual=7250580.495`, `pedidos_atual=5824`, `positivacoes_atual=2411` (mesmos
valores da Task 3 do corte `vw_pedidos_v2` para este período) — demais colunas de mês/ano anterior
inalteradas.

Sem commit nesta task (Supabase apenas).

---

### Task 6: Aplicar o reforço em `get_dashboard_metrics_daily`

**Files:** nenhum (Supabase apenas).

**Interfaces:**
- Consome: `public._dashboard_rep_visible` (Task 3).
- Produz: `get_dashboard_metrics_daily` sem alteração de assinatura — consumida por
  `src/lib/dashboard.ts:getDashboardMetricsDaily`.

- [ ] **Step 1: Aplicar a nova definição**

```sql
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_daily(p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date, p_id_representante bigint DEFAULT NULL::bigint, p_mercado integer DEFAULT NULL::integer, p_contas integer[] DEFAULT NULL::integer[], p_is_bionatus integer DEFAULT NULL::integer)
 RETURNS TABLE(data_ref date, dia integer, faturamento numeric, pedidos bigint, ticket_medio numeric, positivacoes bigint, positivacoes_acumuladas bigint, dia_util boolean, dia_util_numero_mes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with base_kpis as (
    select
        data_ref,
        dia,
        sum(faturamento) as faturamento,
        sum(pedidos)::bigint as pedidos
    from public.mv_dashboard_kpis_diario
    where
        (p_data_inicio is null or data_ref >= p_data_inicio)
        and (p_data_fim is null or data_ref <= p_data_fim)
        and public._dashboard_rep_visible(sistema, id_representante, p_id_representante)
        and (p_mercado is null or mercado = p_mercado)
        and (
            p_contas is null
            or cardinality(p_contas) = 0
            or contas = any(p_contas)
        )
        and (p_is_bionatus is null or is_bionatus = p_is_bionatus)
    group by data_ref, dia
),
clientes_periodo as (
    select distinct
        data_ref,
        dia,
        cnpj
    from public.mv_dashboard_clientes_diario
    where
        (p_data_inicio is null or data_ref >= p_data_inicio)
        and (p_data_fim is null or data_ref <= p_data_fim)
        and public._dashboard_rep_visible(sistema, id_representante, p_id_representante)
        and (p_mercado is null or mercado = p_mercado)
        and (
            p_contas is null
            or cardinality(p_contas) = 0
            or contas = any(p_contas)
        )
        and (p_is_bionatus is null or is_bionatus = p_is_bionatus)
),
positivacoes_diarias as (
    select
        data_ref,
        dia,
        count(distinct cnpj)::bigint as positivacoes
    from clientes_periodo
    group by data_ref, dia
),
primeira_aparicao_no_periodo as (
    select
        cnpj,
        min(data_ref) as primeira_data_ref
    from clientes_periodo
    group by cnpj
),
positivacoes_acumuladas as (
    select
        k.data_ref,
        k.dia,
        count(f.cnpj)::bigint as positivacoes_acumuladas
    from base_kpis k
    left join primeira_aparicao_no_periodo f
        on f.primeira_data_ref <= k.data_ref
    group by k.data_ref, k.dia
),
dias_calendario as (
    select
        c.data_ref,
        c.dia,
        c.dia_util,
        du.dia_util_numero_mes
    from public.dim_calendario c
    left join (
        select
            data_ref,
            row_number() over (
                partition by ano, mes
                order by data_ref
            ) as dia_util_numero_mes
        from public.dim_calendario
        where
            dia_util = true
            and (p_data_inicio is null or data_ref >= p_data_inicio)
            and (p_data_fim is null or data_ref <= p_data_fim)
    ) du
        on du.data_ref = c.data_ref
    where
        (p_data_inicio is null or c.data_ref >= p_data_inicio)
        and (p_data_fim is null or c.data_ref <= p_data_fim)
)
select
    k.data_ref,
    k.dia,
    k.faturamento,
    k.pedidos,
    case
        when k.pedidos = 0 then 0
        else round(k.faturamento / k.pedidos, 2)
    end as ticket_medio,
    coalesce(p.positivacoes, 0) as positivacoes,
    coalesce(a.positivacoes_acumuladas, 0) as positivacoes_acumuladas,
    coalesce(c.dia_util, false) as dia_util,
    c.dia_util_numero_mes
from base_kpis k
left join positivacoes_diarias p
    on p.data_ref = k.data_ref
   and p.dia = k.dia
left join positivacoes_acumuladas a
    on a.data_ref = k.data_ref
   and a.dia = k.dia
left join dias_calendario c
    on c.data_ref = k.data_ref
order by k.data_ref;
$function$;
```

- [ ] **Step 2: Regressão**

```sql
SELECT sum(faturamento), sum(pedidos), max(positivacoes_acumuladas)
FROM get_dashboard_metrics_daily(p_data_inicio := '2026-06-01', p_data_fim := '2026-07-31');
```

Esperado: `sum(faturamento)=7250580.495`, `sum(pedidos)=5824`, `max(positivacoes_acumuladas)=2411`
(mesmos totais das Tasks 4/5).

Sem commit nesta task (Supabase apenas).

---

### Task 7: Aplicar o reforço em `get_dashboard_breakdown_by_conta`

**Files:** nenhum (Supabase apenas).

**Interfaces:**
- Consome: `public._dashboard_rep_visible` (Task 3).
- Produz: `get_dashboard_breakdown_by_conta` sem alteração de assinatura — consumida por
  `src/lib/dashboard/breakdown.ts`.

- [ ] **Step 1: Aplicar a nova definição**

```sql
CREATE OR REPLACE FUNCTION public.get_dashboard_breakdown_by_conta(p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date, p_id_representante bigint DEFAULT NULL::bigint)
 RETURNS TABLE(mercado integer, mercado_nome text, conta integer, conta_nome text, faturamento numeric, pedidos bigint, ticket_medio numeric, positivacoes bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH base_kpis AS (
        SELECT
            contas,
            mercado,
            COALESCE(SUM(faturamento), 0)     AS faturamento,
            COALESCE(SUM(pedidos), 0)::bigint AS pedidos
        FROM public.mv_dashboard_kpis_diario
        WHERE
            (p_data_inicio IS NULL OR data_ref >= p_data_inicio)
            AND (p_data_fim IS NULL OR data_ref <= p_data_fim)
            AND public._dashboard_rep_visible(sistema, id_representante, p_id_representante)
        GROUP BY contas, mercado
    ),
    base_positivacoes AS (
        SELECT
            contas,
            COUNT(DISTINCT cnpj)::bigint AS positivacoes
        FROM public.mv_dashboard_clientes_diario
        WHERE
            (p_data_inicio IS NULL OR data_ref >= p_data_inicio)
            AND (p_data_fim IS NULL OR data_ref <= p_data_fim)
            AND public._dashboard_rep_visible(sistema, id_representante, p_id_representante)
        GROUP BY contas
    )
    SELECT
        k.mercado,
        COALESCE(m.descricao, 'Outros')                                                  AS mercado_nome,
        k.contas                                                                          AS conta,
        k.contas::text || ' - ' || COALESCE(c.descricao, 'Canal ' || k.contas::text)    AS conta_nome,
        k.faturamento,
        k.pedidos,
        CASE WHEN k.pedidos = 0 THEN 0 ELSE ROUND(k.faturamento / k.pedidos, 2) END     AS ticket_medio,
        COALESCE(p.positivacoes, 0)                                                       AS positivacoes
    FROM base_kpis k
    LEFT JOIN public.dim_mercados m ON m.id = k.mercado
    LEFT JOIN public.dim_contas   c ON c.id = k.contas
    LEFT JOIN base_positivacoes   p ON p.contas = k.contas
    ORDER BY k.mercado, k.contas;
$function$;
```

- [ ] **Step 2: Regressão**

```sql
SELECT sum(faturamento), sum(pedidos) FROM get_dashboard_breakdown_by_conta(
  p_data_inicio := '2026-06-01', p_data_fim := '2026-07-31');
```

Esperado: `sum(faturamento)=7250580.495`, `sum(pedidos)=5824` (mesmos totais das tasks anteriores —
esta RPC não filtra por `mercado`/`contas`/`is_bionatus`, então a soma de todas as linhas deve bater
com o total geral).

Sem commit nesta task (Supabase apenas).

---

### Task 8: Aplicar o reforço em `get_dashboard_breakdown_by_fabricante`

**Files:** nenhum (Supabase apenas).

**Interfaces:**
- Consome: `public._dashboard_rep_visible` (Task 3).
- Produz: `get_dashboard_breakdown_by_fabricante` sem alteração de assinatura — consumida por
  `src/lib/dashboard/breakdown.ts`.

- [ ] **Step 1: Aplicar a nova definição**

```sql
CREATE OR REPLACE FUNCTION public.get_dashboard_breakdown_by_fabricante(p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date, p_id_representante bigint DEFAULT NULL::bigint, p_mercado integer DEFAULT NULL::integer, p_contas integer[] DEFAULT NULL::integer[])
 RETURNS TABLE(is_bionatus integer, fabricante_nome text, faturamento numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    select
        is_bionatus,
        case is_bionatus
            when 1 then 'BIONATUS'
            when 0 then 'TERCEIROS'
            else        'Em branco'
        end as fabricante_nome,
        coalesce(sum(faturamento), 0) as faturamento
    from public.mv_dashboard_kpis_diario
    where
        (p_data_inicio is null or data_ref >= p_data_inicio)
        and (p_data_fim is null or data_ref <= p_data_fim)
        and public._dashboard_rep_visible(sistema, id_representante, p_id_representante)
        and (p_mercado is null or mercado = p_mercado)
        and (
            p_contas is null
            or cardinality(p_contas) = 0
            or contas = any(p_contas)
        )
    group by is_bionatus
    order by is_bionatus desc nulls last;
$function$;
```

- [ ] **Step 2: Regressão**

```sql
SELECT * FROM get_dashboard_breakdown_by_fabricante(p_data_inicio := '2026-06-01', p_data_fim := '2026-07-31');
```

Esperado: `BIONATUS=4341760.41`, `TERCEIROS=2908820.085` (mesmos valores confirmados na Task 3 do
corte `vw_pedidos_v2`).

Sem commit nesta task (Supabase apenas).

---

### Task 9: Aplicar o reforço em `get_dashboard_projection_daily_v4`

**Files:** nenhum (Supabase apenas).

**Interfaces:**
- Consome: `public._dashboard_rep_visible` (Task 3).
- Produz: `get_dashboard_projection_daily_v4` sem alteração de assinatura — consumida por
  `src/lib/dashboard.ts:getDashboardProjectionDaily`.

Esta função tem 3 ocorrências do filtro por representante (fluxo A real, fluxo A referência
histórica, fluxo B) — nenhuma outra parte da função muda.

- [ ] **Step 1: Aplicar a nova definição**

```sql
CREATE OR REPLACE FUNCTION public.get_dashboard_projection_daily_v4(p_data_inicio date, p_data_fim date, p_id_representante bigint DEFAULT NULL::bigint, p_mercado integer DEFAULT NULL::integer, p_contas integer[] DEFAULT NULL::integer[], p_is_bionatus integer DEFAULT NULL::integer)
 RETURNS TABLE(data_ref date, dia integer, dia_util boolean, dia_util_numero_mes integer, projecao_acumulada numeric, fechamento_projetado numeric, percentual_referencia numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with periodo as (
    select
        p_data_inicio as data_inicio,
        p_data_fim as data_fim,
        date_trunc('month', p_data_inicio)::date as inicio_mes_atual,
        (date_trunc('month', p_data_inicio) + interval '1 month - 1 day')::date as fim_mes_atual
),

ponto_corte as (
    select
        least(
            current_date,
            (select data_fim from periodo),
            (select fim_mes_atual from periodo)
        )::date as data_corte
),

cal_atual_base as (
    select
        c.data_ref,
        c.ano,
        c.mes,
        c.dia,
        c.dia_util
    from public.dim_calendario c
    join periodo p
      on c.data_ref between p.inicio_mes_atual and p.fim_mes_atual
),

cal_atual_du as (
    select
        c.data_ref,
        row_number() over (
            partition by c.ano, c.mes
            order by c.data_ref
        )::integer as dia_util_numero_mes
    from cal_atual_base c
    where c.dia_util = true
),

cal_atual_total_du as (
    select count(*)::integer as total_dias_uteis_atual
    from cal_atual_du
),

cal_atual as (
    select
        b.data_ref,
        b.dia,
        b.dia_util,
        d.dia_util_numero_mes
    from cal_atual_base b
    left join cal_atual_du d
      on d.data_ref = b.data_ref
),

fat_atual_diario_a as (
    select
        m.data_ref,
        sum(m.faturamento)::numeric as faturamento
    from public.mv_dashboard_kpis_diario m
    join periodo p on true
    join ponto_corte pc on true
    where
        m.data_ref between p.inicio_mes_atual and pc.data_corte
        and public._dashboard_rep_visible(m.sistema, m.id_representante, p_id_representante)
        and (p_mercado is null or m.mercado = p_mercado)
        and (
            p_contas is null
            or cardinality(p_contas) = 0
            or m.contas = any(p_contas)
        )
        and m.contas not in (1, 2, 7)
        and (p_is_bionatus is null or m.is_bionatus = p_is_bionatus)
    group by m.data_ref
),

fat_atual_por_du_a as (
    select
        c.data_ref,
        c.dia,
        c.dia_util,
        c.dia_util_numero_mes,
        coalesce(f.faturamento, 0)::numeric as faturamento
    from cal_atual c
    left join fat_atual_diario_a f
      on f.data_ref = c.data_ref
),

fat_atual_acum_a as (
    select
        data_ref,
        dia,
        dia_util_numero_mes,
        faturamento,
        sum(faturamento) over (
            order by dia_util_numero_mes
            rows between unbounded preceding and current row
        )::numeric as acumulado_atual
    from fat_atual_por_du_a
    where dia_util = true
      and dia_util_numero_mes is not null
      and data_ref <= (select data_corte from ponto_corte)
),

ultimo_ponto_real_a as (
    select
        data_ref as data_ref_atual,
        dia as dia_atual,
        dia_util_numero_mes as dia_util_numero_mes_atual,
        faturamento as faturamento_no_dia,
        acumulado_atual
    from fat_atual_acum_a
    where faturamento > 0
    order by dia_util_numero_mes desc
    limit 1
),

meses_referencia as (
    select
        gs as ordem_mes,
        date_trunc('month', (select data_inicio from periodo) - (gs || ' month')::interval)::date as inicio_mes_ref,
        (date_trunc('month', (select data_inicio from periodo) - (gs || ' month')::interval) + interval '1 month - 1 day')::date as fim_mes_ref
    from generate_series(1, 3) as gs
),

cal_ref_base as (
    select
        mr.ordem_mes,
        c.data_ref,
        c.ano,
        c.mes,
        c.dia,
        c.dia_util
    from meses_referencia mr
    join public.dim_calendario c
      on c.data_ref between mr.inicio_mes_ref and mr.fim_mes_ref
),

cal_ref_du as (
    select
        ordem_mes,
        data_ref,
        row_number() over (
            partition by ordem_mes
            order by data_ref
        )::integer as dia_util_numero_mes
    from cal_ref_base
    where dia_util = true
),

cal_ref_total_du as (
    select
        ordem_mes,
        count(*)::integer as total_dias_uteis_ref
    from cal_ref_du
    group by ordem_mes
),

cal_ref as (
    select
        b.ordem_mes,
        b.data_ref,
        b.dia,
        b.dia_util,
        d.dia_util_numero_mes
    from cal_ref_base b
    left join cal_ref_du d
      on d.ordem_mes = b.ordem_mes
     and d.data_ref = b.data_ref
),

fat_ref_diario_a as (
    select
        mr.ordem_mes,
        m.data_ref,
        sum(m.faturamento)::numeric as faturamento
    from meses_referencia mr
    join public.mv_dashboard_kpis_diario m
      on m.data_ref between mr.inicio_mes_ref and mr.fim_mes_ref
    where
        public._dashboard_rep_visible(m.sistema, m.id_representante, p_id_representante)
        and (p_mercado is null or m.mercado = p_mercado)
        and (
            p_contas is null
            or cardinality(p_contas) = 0
            or m.contas = any(p_contas)
        )
        and m.contas not in (1, 2, 7)
        and (p_is_bionatus is null or m.is_bionatus = p_is_bionatus)
    group by mr.ordem_mes, m.data_ref
),

fat_ref_por_du_a as (
    select
        c.ordem_mes,
        c.dia_util_numero_mes,
        sum(coalesce(f.faturamento, 0))::numeric as faturamento_dia_util
    from cal_ref c
    left join fat_ref_diario_a f
      on f.ordem_mes = c.ordem_mes
     and f.data_ref = c.data_ref
    where c.dia_util = true
      and c.dia_util_numero_mes is not null
    group by c.ordem_mes, c.dia_util_numero_mes
),

curva_ref_a as (
    select
        f.ordem_mes,
        f.dia_util_numero_mes,
        f.faturamento_dia_util,
        sum(f.faturamento_dia_util) over (
            partition by f.ordem_mes
            order by f.dia_util_numero_mes
            rows between unbounded preceding and current row
        )::numeric as acumulado_referencia,
        sum(f.faturamento_dia_util) over (
            partition by f.ordem_mes
        )::numeric as total_referencia
    from fat_ref_por_du_a f
),

curva_ref_pct_a as (
    select
        c.ordem_mes,
        c.dia_util_numero_mes,
        case
            when c.total_referencia > 0
                then (c.acumulado_referencia / c.total_referencia)::numeric
            else null
        end as percentual_referencia
    from curva_ref_a c
),

mapa_ref_para_atual_a as (
    select
        ca.data_ref,
        ca.dia,
        ca.dia_util,
        ca.dia_util_numero_mes,
        mr.ordem_mes,
        ceil(
            (
                ca.dia_util_numero_mes::numeric
                / nullif(cta.total_dias_uteis_atual, 0)
            ) * crt.total_dias_uteis_ref
        )::integer as dia_util_referencia
    from cal_atual ca
    cross join cal_atual_total_du cta
    cross join cal_ref_total_du crt
    join meses_referencia mr
      on mr.ordem_mes = crt.ordem_mes
    where ca.dia_util = true
      and ca.dia_util_numero_mes is not null
),

mapa_ref_para_atual_ajustado_a as (
    select
        m.data_ref,
        m.dia,
        m.dia_util,
        m.dia_util_numero_mes,
        m.ordem_mes,
        least(
            greatest(m.dia_util_referencia, 1),
            crt.total_dias_uteis_ref
        ) as dia_util_referencia_ajustada
    from mapa_ref_para_atual_a m
    join cal_ref_total_du crt
      on crt.ordem_mes = m.ordem_mes
),

curva_referencia_media_ponderada_a as (
    select
        m.data_ref,
        m.dia,
        m.dia_util,
        m.dia_util_numero_mes,
        sum(
            case
                when m.ordem_mes = 1 then c.percentual_referencia * 0.5
                when m.ordem_mes = 2 then c.percentual_referencia * 0.3
                when m.ordem_mes = 3 then c.percentual_referencia * 0.2
                else 0
            end
        )::numeric as percentual_referencia
    from mapa_ref_para_atual_ajustado_a m
    left join curva_ref_pct_a c
      on c.ordem_mes = m.ordem_mes
     and c.dia_util_numero_mes = m.dia_util_referencia_ajustada
    group by
        m.data_ref,
        m.dia,
        m.dia_util,
        m.dia_util_numero_mes
),

ponto_referencia_base_a as (
    select
        u.data_ref_atual,
        u.dia_atual,
        u.dia_util_numero_mes_atual,
        u.faturamento_no_dia,
        u.acumulado_atual,
        c.percentual_referencia
    from ultimo_ponto_real_a u
    left join curva_referencia_media_ponderada_a c
      on c.dia_util_numero_mes = u.dia_util_numero_mes_atual
),

fechamento_base_a as (
    select
        data_ref_atual,
        dia_atual,
        dia_util_numero_mes_atual,
        acumulado_atual,
        percentual_referencia,
        case
            when percentual_referencia is null or percentual_referencia <= 0
                then null
            else (acumulado_atual / percentual_referencia)::numeric
        end as fechamento_projetado_base
    from ponto_referencia_base_a
),

simulado_diario_a as (
    select
        dp.data_ref,
        sum(dp.valor)::numeric as valor_simulado
    from public.dashboard_projecoes dp
    join periodo p on true
    join ponto_corte pc on true
    where
        dp.data_ref between p.inicio_mes_atual and p.fim_mes_atual
        and dp.data_ref > pc.data_corte
        and (p_mercado is null or dp.mercado = p_mercado)
        and (
            p_contas is null
            or cardinality(p_contas) = 0
            or dp.contas = any(p_contas)
        )
        and dp.contas not in (1, 2, 7)
    group by dp.data_ref
),

simulado_por_du_a as (
    select
        c.data_ref,
        c.dia,
        c.dia_util,
        c.dia_util_numero_mes,
        coalesce(s.valor_simulado, 0)::numeric as valor_simulado
    from cal_atual c
    left join simulado_diario_a s
      on s.data_ref = c.data_ref
    where c.dia_util = true
      and c.dia_util_numero_mes is not null
),

simulado_acumulado_a as (
    select
        s.data_ref,
        s.dia_util_numero_mes,
        s.valor_simulado,
        sum(s.valor_simulado) over (
            order by s.dia_util_numero_mes
            rows between unbounded preceding and current row
        )::numeric as valor_simulado_acumulado
    from simulado_por_du_a s
),

ultimo_ponto_simulado_a as (
    select
        s.data_ref,
        s.dia_util_numero_mes,
        s.valor_simulado_acumulado
    from simulado_acumulado_a s
    where s.valor_simulado > 0
    order by s.dia_util_numero_mes desc
    limit 1
),

curva_base_final_a as (
    select
        c.data_ref,
        c.dia,
        c.dia_util,
        c.dia_util_numero_mes,
        c.percentual_referencia,
        f.data_ref_atual,
        f.dia_util_numero_mes_atual,
        f.acumulado_atual,
        f.fechamento_projetado_base,
        case
            when f.fechamento_projetado_base is null then null
            when c.dia_util_numero_mes <= f.dia_util_numero_mes_atual
                then f.acumulado_atual
            when f.percentual_referencia is null or f.percentual_referencia >= 1
                then null
            when c.percentual_referencia is null
                then null
            else
                f.acumulado_atual +
                (
                    (c.percentual_referencia - f.percentual_referencia)
                    / nullif(1 - f.percentual_referencia, 0)
                ) * (f.fechamento_projetado_base - f.acumulado_atual)
        end::numeric as projecao_acumulada_base
    from curva_referencia_media_ponderada_a c
    cross join fechamento_base_a f
),

ponto_ancora_final_a as (
    select
        coalesce(ups.data_ref, fb.data_ref_atual) as data_ref_ancora,
        coalesce(ups.dia_util_numero_mes, fb.dia_util_numero_mes_atual) as dia_util_numero_mes_ancora,
        case
            when ups.data_ref is not null
                then coalesce(cbf.projecao_acumulada_base, 0) + coalesce(ups.valor_simulado_acumulado, 0)
            else fb.acumulado_atual
        end::numeric as acumulado_ancora,
        case
            when ups.data_ref is not null
                then cbf.percentual_referencia
            else fb.percentual_referencia
        end::numeric as percentual_ancora
    from fechamento_base_a fb
    left join ultimo_ponto_simulado_a ups on true
    left join curva_base_final_a cbf
      on cbf.data_ref = ups.data_ref
),

fechamento_recalculado_a as (
    select
        p.data_ref_ancora,
        p.dia_util_numero_mes_ancora,
        p.acumulado_ancora,
        p.percentual_ancora,
        case
            when p.percentual_ancora is null or p.percentual_ancora <= 0
                then null
            else (p.acumulado_ancora / p.percentual_ancora)::numeric
        end as fechamento_projetado
    from ponto_ancora_final_a p
),

curva_final_a as (
    select
        c.data_ref,
        c.dia_util_numero_mes,
        fr.fechamento_projetado,
        c.percentual_referencia,
        case
            when fr.fechamento_projetado is null then null
            when c.dia_util_numero_mes <= fb.dia_util_numero_mes_atual
                then fb.acumulado_atual
            when c.dia_util_numero_mes <= fr.dia_util_numero_mes_ancora
                then coalesce(cbf.projecao_acumulada_base, 0) + coalesce(sa.valor_simulado_acumulado, 0)
            when fr.percentual_ancora is null or fr.percentual_ancora >= 1
                then null
            when c.percentual_referencia is null
                then null
            else
                fr.acumulado_ancora +
                (
                    (c.percentual_referencia - fr.percentual_ancora)
                    / nullif(1 - fr.percentual_ancora, 0)
                ) * (fr.fechamento_projetado - fr.acumulado_ancora)
        end::numeric as projecao_acumulada
    from curva_referencia_media_ponderada_a c
    cross join fechamento_recalculado_a fr
    cross join fechamento_base_a fb
    left join curva_base_final_a cbf
      on cbf.data_ref = c.data_ref
    left join simulado_acumulado_a sa
      on sa.data_ref = c.data_ref
),

fat_atual_diario_b as (
    select
        m.data_ref,
        sum(m.faturamento)::numeric as faturamento
    from public.mv_dashboard_kpis_diario m
    join periodo p on true
    join ponto_corte pc on true
    where
        m.data_ref between p.inicio_mes_atual and pc.data_corte
        and public._dashboard_rep_visible(m.sistema, m.id_representante, p_id_representante)
        and (p_mercado is null or m.mercado = p_mercado)
        and (
            p_contas is null
            or cardinality(p_contas) = 0
            or m.contas = any(p_contas)
        )
        and m.contas in (1, 2, 7)
        and (p_is_bionatus is null or m.is_bionatus = p_is_bionatus)
    group by m.data_ref
),

fat_atual_acum_b as (
    select
        c.data_ref,
        c.dia_util_numero_mes,
        coalesce(f.faturamento, 0)::numeric as faturamento,
        sum(coalesce(f.faturamento, 0)) over (
            order by c.dia_util_numero_mes
            rows between unbounded preceding and current row
        )::numeric as acumulado_atual
    from cal_atual c
    left join fat_atual_diario_b f
      on f.data_ref = c.data_ref
    where c.dia_util = true
      and c.dia_util_numero_mes is not null
      and c.data_ref <= (select data_corte from ponto_corte)
),

ultimo_ponto_real_b as (
    select
        dia_util_numero_mes as dia_util_numero_mes_atual,
        acumulado_atual
    from fat_atual_acum_b
    where faturamento > 0
    order by dia_util_numero_mes desc
    limit 1
),

simulado_diario_b as (
    select
        dp.data_ref,
        sum(dp.valor)::numeric as valor_simulado
    from public.dashboard_projecoes dp
    join periodo p on true
    join ponto_corte pc on true
    where
        dp.data_ref between p.inicio_mes_atual and p.fim_mes_atual
        and dp.data_ref > pc.data_corte
        and (p_mercado is null or dp.mercado = p_mercado)
        and (
            p_contas is null
            or cardinality(p_contas) = 0
            or dp.contas = any(p_contas)
        )
        and dp.contas in (1, 2, 7)
    group by dp.data_ref
),

simulado_por_du_b as (
    select
        c.data_ref,
        c.dia_util_numero_mes,
        coalesce(s.valor_simulado, 0)::numeric as valor_simulado
    from cal_atual c
    left join simulado_diario_b s
      on s.data_ref = c.data_ref
    where c.dia_util = true
      and c.dia_util_numero_mes is not null
      and c.data_ref > (select data_corte from ponto_corte)
),

simulado_acumulado_b as (
    select
        s.data_ref,
        s.dia_util_numero_mes,
        s.valor_simulado,
        sum(s.valor_simulado) over (
            order by s.dia_util_numero_mes
            rows between unbounded preceding and current row
        )::numeric as valor_simulado_acumulado
    from simulado_por_du_b s
),

curva_final_b as (
    select
        c.data_ref,
        c.dia_util_numero_mes,
        case
            when c.dia_util_numero_mes <= u.dia_util_numero_mes_atual
                then fab.acumulado_atual
            else
                u.acumulado_atual
                + coalesce(sb.valor_simulado_acumulado, 0)
        end::numeric as projecao_acumulada
    from cal_atual c
    cross join ultimo_ponto_real_b u
    left join fat_atual_acum_b fab
      on fab.data_ref = c.data_ref
    left join simulado_acumulado_b sb
      on sb.data_ref = c.data_ref
    where c.dia_util = true
      and c.dia_util_numero_mes is not null
),

resultado_combinado as (
    select
        cal.data_ref,
        cal.dia,
        cal.dia_util,
        cal.dia_util_numero_mes,
        coalesce(ca.projecao_acumulada, 0) + coalesce(cb.projecao_acumulada, 0) as projecao_acumulada,
        ca.fechamento_projetado
            + coalesce(
                (select projecao_acumulada
                 from curva_final_b
                 order by dia_util_numero_mes desc
                 limit 1),
                0
            ) as fechamento_projetado,
        ca.percentual_referencia
    from cal_atual cal
    left join curva_final_a ca
      on ca.data_ref = cal.data_ref
    left join curva_final_b cb
      on cb.data_ref = cal.data_ref
)

select
    cal.data_ref,
    cal.dia,
    cal.dia_util,
    cal.dia_util_numero_mes,
    case
        when cal.dia_util = true then rc.projecao_acumulada
        else null
    end as projecao_acumulada,
    case
        when cal.dia_util = true then rc.fechamento_projetado
        else null
    end as fechamento_projetado,
    case
        when cal.dia_util = true then rc.percentual_referencia
        else null
    end as percentual_referencia
from cal_atual cal
left join resultado_combinado rc
  on rc.data_ref = cal.data_ref
order by cal.data_ref;
$function$;
```

- [ ] **Step 2: Regressão**

```sql
SELECT count(*), sum(projecao_acumulada), sum(fechamento_projetado)
FROM get_dashboard_projection_daily_v4(p_data_inicio := '2026-06-01', p_data_fim := '2026-07-31');
```

Esperado: `count=30`, `sum(projecao_acumulada)=81797359.035` (mesmos valores confirmados na Task 3
do corte `vw_pedidos_v2`, antes desta mudança).

Sem commit nesta task (Supabase apenas).

---

### Task 10: Provisionar a primeira conta de teste e validar o isolamento

**Files:** nenhum (Supabase apenas — operação manual via SQL Editor/Supabase Auth Admin).

**Interfaces:**
- Consome: Tasks 2-9 completas.
- Produz: primeira conta `role='representante'` funcional, validando o modelo de ponta a ponta
  antes de provisionar o restante da equipe.

- [ ] **Step 1: Escolher um representante real de teste e confirmar seus números de referência**

Usar "PEDRO FIGUEIRA" (Sankhya, `sistema=2`, `id_representante=51`) — já usado como exemplo neste
plano/spec. Capturar o número de referência ANTES de criar a conta, usando o gestor/admin (sem
`role='representante'`):

```sql
SELECT * FROM get_dashboard_kpis(
  p_data_inicio := '2026-06-01', p_data_fim := '2026-07-31', p_id_representante := 51
);
```

Guardar esse resultado — é o que a conta de teste deve ver exatamente igual, e é o que qualquer
OUTRO representante (ou o próprio Pedro tentando passar outro `p_id_representante`) **não** deve
conseguir ver.

- [ ] **Step 2: Criar o usuário no Supabase Auth (senha temporária)**

Não há ferramenta MCP para criação de usuário de Auth neste ambiente — usar o painel do Supabase:
Authentication → Users → Add user, preenchendo e-mail e a senha temporária definida. Anotar o `id`
(UUID) do usuário criado — vamos chamá-lo de `<PROFILE_ID>` nos passos seguintes.

Verificar se um trigger existente já cria a linha correspondente em `public.profiles`
automaticamente (padrão comum em projetos Supabase — trigger em `auth.users` que popula
`profiles`):

```sql
SELECT * FROM public.profiles WHERE id = '<PROFILE_ID>';
```

Se a linha não existir, criar manualmente antes do próximo passo:

```sql
INSERT INTO public.profiles (id, email, role, ativo) VALUES ('<PROFILE_ID>', '<email>', 'user', true);
```

- [ ] **Step 3: Marcar o profile como representante e criar o vínculo**

```sql
UPDATE public.profiles SET role = 'representante' WHERE id = '<PROFILE_ID>';

INSERT INTO public.representante_contas (profile_id, sistema, id_representante)
VALUES ('<PROFILE_ID>', 2, 51);
```

- [ ] **Step 4: Validar o caminho "representante" da função auxiliar diretamente**

```sql
SET LOCAL request.jwt.claims = '{"sub": "<PROFILE_ID>"}';
SELECT public._dashboard_rep_visible(2, 51, NULL);   -- esperado: true (é o próprio vínculo)
SELECT public._dashboard_rep_visible(2, 51, 999);    -- esperado: true (ignora o filtro recebido)
SELECT public._dashboard_rep_visible(1, 51, NULL);   -- esperado: false (sistema errado, mesmo id)
SELECT public._dashboard_rep_visible(2, 999, NULL);  -- esperado: false (outro representante)
RESET request.jwt.claims;
```

(`SET LOCAL request.jwt.claims` simula, dentro da própria sessão SQL, o que o PostgREST faz de
verdade quando a pessoa loga pelo app — é a forma de testar `auth.uid()` sem precisar logar no
navegador ainda.)

- [ ] **Step 5: Validar a RPC completa com a sessão simulada**

```sql
SET LOCAL request.jwt.claims = '{"sub": "<PROFILE_ID>"}';
SELECT * FROM get_dashboard_kpis(p_data_inicio := '2026-06-01', p_data_fim := '2026-07-31');
SELECT * FROM get_dashboard_kpis(p_data_inicio := '2026-06-01', p_data_fim := '2026-07-31', p_id_representante := 999);
RESET request.jwt.claims;
```

Esperado: as duas chamadas retornam **exatamente o mesmo resultado**, igual ao capturado no Step 1
— a segunda chamada tenta se passar por outro representante (`999`) e a RPC ignora isso.

- [ ] **Step 6: Login real no navegador**

Logar na aplicação com o e-mail/senha temporária dessa conta e confirmar visualmente que o
dashboard mostra os números de Pedro Figueira.

Sem commit nesta task (operação manual no Supabase, sem arquivo de repositório).

---

### Task 11: Confirmação visual de "de quem são estes dados" no frontend (ajuste mínimo)

**Files:**
- Modify: `src/pages/dashboard/dashboard-page.tsx`

**Interfaces:**
- Consome: `getMyProfile()` (`src/lib/profile.ts`, já existente, já retorna `role`).
- Produz: pequeno texto de contexto na página, sem novo componente/rota.

Achado durante o planejamento: **não existe hoje nenhum seletor de representante na UI** — o campo
`idRepresentante` existe no schema de filtros (`use-dashboard-filters.ts`) mas nenhum componente
`.tsx` o define ou altera; ele sempre viaja como `null`. Isso significa que o reforço nas RPCs
(Tasks 4-9) já é suficiente por si só: um usuário `role='representante'` logado vê automaticamente
só os próprios dados, mesmo sem nenhuma mudança no frontend, porque a RPC ignora o `null` recebido
e usa o vínculo da própria conta. Este task é só um toque de clareza, não uma correção funcional.

- [ ] **Step 1: Buscar o profile e mostrar um aviso contextual quando `role === 'representante'`**

Em `src/pages/dashboard/dashboard-page.tsx`, adicionar a busca do profile e renderizar um aviso
simples acima dos KPIs:

```tsx
import { useEffect, useState } from "react"
import { getMyProfile } from "@/lib/profile"

// dentro de DashboardPage(), junto aos outros hooks:
const [isRepresentanteView, setIsRepresentanteView] = useState(false)

useEffect(() => {
  getMyProfile()
    .then((profile) => setIsRepresentanteView(profile.role === "representante"))
    .catch(() => setIsRepresentanteView(false))
}, [])
```

E no JSX, antes da renderização de `DashboardKpisSection`:

```tsx
{isRepresentanteView && (
  <div className="mb-4 rounded-xl border border-[#D0D9D6] bg-[#F0F7F2] px-4 py-2 text-sm text-[#006426]">
    Você está vendo seus próprios números de desempenho.
  </div>
)}
```

- [ ] **Step 2: Testar manualmente**

```bash
cd "c:\Users\Power BI\Projeto Web\bionatus-web-app"
npm run dev
```

Logar com a conta de teste da Task 10 e confirmar que o aviso aparece; logar com uma conta
`role='user'` (admin/gestor) e confirmar que o aviso **não** aparece.

- [ ] **Step 3: Commit**

```bash
git add src/pages/dashboard/dashboard-page.tsx
git commit -m "feat: exibir aviso quando representante vê seus próprios dados"
```

---

### Task 12: Runbook de provisionamento em lote (documentação operacional)

**Files:**
- Create: `docs/superpowers/runbooks/provisionar-representante.md`

**Interfaces:**
- Consome: Tasks 2-10 (schema e validação já prontos).
- Produz: documento de referência para o usuário criar as demais contas sem precisar reler o plano
  inteiro.

- [ ] **Step 1: Escrever o runbook**

```markdown
# Runbook: provisionar login de representante

Pré-requisito: você já tem o e-mail do representante e sabe o `codvend` (Sankhya) e/ou `pescod`
(Nexus) dele. Para descobrir o código, se precisar:

​```sql
SELECT codvend, vendedor FROM sankhya_vendedores WHERE vendedor ILIKE '%nome do representante%';
SELECT pescod, pesnomfan FROM nexus_pessoas WHERE pesnomfan ILIKE '%nome do representante%';
​```

1. Criar o usuário no Supabase Auth (painel → Authentication → Users → Add user), com o e-mail
   fornecido e uma senha temporária. Anotar o UUID gerado (`<PROFILE_ID>`).
2. Rodar no SQL Editor do Supabase:

​```sql
UPDATE public.profiles SET role = 'representante' WHERE id = '<PROFILE_ID>';

INSERT INTO public.representante_contas (profile_id, sistema, id_representante) VALUES
  ('<PROFILE_ID>', 2, <codvend_sankhya>),  -- se atua no Sankhya
  ('<PROFILE_ID>', 1, <pescod_nexus>);     -- se atua no Nexus (remova a linha que não se aplicar)
​```

3. Validar:

​```sql
SELECT p.email, p.role, rc.sistema, rc.id_representante
FROM public.profiles p
JOIN public.representante_contas rc ON rc.profile_id = p.id
WHERE p.id = '<PROFILE_ID>';
​```

4. Passar a senha temporária para o representante por fora (WhatsApp, verbal, etc.) e confirmar
   que ele consegue logar em `/login` e ver o próprio dashboard.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/runbooks/provisionar-representante.md
git commit -m "docs: runbook de provisionamento de login de representante"
```
