# Login individual por representante — Design

## Contexto

Depois de migrar `vw_pedidos` → `vw_pedidos_v2` (ver `docs/superpowers/plans/2026-07-28-vw-pedidos-v2-cutover.md`,
no repositório backend), o próximo pedido do usuário foi: criar conteúdo de acompanhamento de
performance para apresentar aos representantes de vendas. Ao explorar isso, o pedido se dividiu em
dois subprojetos independentes:

1. **Autenticação/acesso** (este documento): cada representante loga e vê só os próprios números.
2. **Conteúdo/relatório** (fora de escopo aqui, brainstorm futuro): quais métricas mostrar, visão
   individual vs ranking do gestor, gráficos, etc.

Este spec cobre só o subprojeto 1 — a fundação de acesso, sem a qual a visão individual não pode
ser self-service de verdade.

## Achados que moldam o design

- **`id_representante` colide entre sistemas.** Confirmado cruzando `sankhya_vendedores.codvend`
  com `nexus_pessoas.pescod`: o código `51` é "PEDRO FIGUEIRA" (representante real) no Sankhya, mas
  é uma entidade completamente não relacionada no Nexus. `id_representante` só é uma identidade
  única quando combinado com `sistema` (`1`=Nexus, `2`=Sankhya).
- **As 8 RPCs `get_dashboard_*` são `SECURITY DEFINER` e confiam 100% no `p_id_representante` que o
  cliente envia.** Hoje, qualquer usuário autenticado pode passar qualquer valor e ver os dados de
  qualquer representante — não há enforcement no servidor amarrando "quem está logado" a "quais
  dados pode ver".
- **Falha de segurança pré-existente, achada durante a investigação (bloqueante, corrigir de
  qualquer forma):** `anon` tem `SELECT/INSERT/UPDATE/DELETE/TRUNCATE` em `public.vw_pedidos`, e
  `authenticated` tem o mesmo pacote completo em `public.vw_pedidos_v2`. Isso permite bypass total de
  qualquer regra que a gente coloque nas RPCs — bastaria o cliente consultar a view diretamente pelo
  `supabase-js`. As materialized views (`mv_dashboard_kpis_diario`/`mv_dashboard_clientes_diario`)
  não têm esse problema — zero grants pra `anon`/`authenticated`, só alcançáveis via RPC.
- **Não existe e-mail cadastrado para representantes** em `sankhya_vendedores` (sem coluna de
  e-mail). Resolvido: o usuário vai fornecer os e-mails manualmente durante o provisionamento.
- `profiles.role` hoje só tem um valor (`'user'`) — não existe distinção de papel ainda.
- Um representante pode, em tese, ter código em ambos os sistemas (Sankhya e Nexus) — o modelo
  precisa suportar múltiplos vínculos por pessoa, não assumir 1:1.

## Decisões

- **Modelo de dados:** nova tabela `public.representante_contas (profile_id uuid PK REFERENCES
  profiles(id), sistema integer CHECK IN (1,2), id_representante bigint, UNIQUE(sistema,
  id_representante))`. `profile_id` como PK permite múltiplas linhas por pessoa (uma por sistema em
  que ela atua); `UNIQUE(sistema, id_representante)` impede dois logins apontando pro mesmo
  representante.
- **Novo valor de role:** `profiles.role` passa a aceitar `'representante'` além do `'user'`
  existente. Comportamento por role:
  - `role = 'user'` (gestor/admin): inalterado — filtro de representante livre, como hoje.
  - `role = 'representante'`: as RPCs ignoram qualquer `p_id_representante` recebido do cliente e
    usam o(s) vínculo(s) da própria pessoa em `representante_contas`.
- **Enforcement vive nas RPCs, não em RLS nas materialized views.** Postgres não permite habilitar
  RLS em materialized views — abordagem descartada por inviabilidade técnica com a arquitetura
  atual (MVs pré-calculadas). O padrão a aplicar nas 8 RPCs `get_dashboard_*`:
  ```sql
  DECLARE
    v_role text;
    v_ids_representante bigint[];
  BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

    IF v_role = 'representante' THEN
      SELECT array_agg(id_representante) INTO v_ids_representante
      FROM public.representante_contas WHERE profile_id = auth.uid();
      -- usa v_ids_representante no WHERE, ignora p_id_representante recebido
    ELSE
      -- corpo atual da função, inalterado
    END IF;
  END;
  ```
  O branch `ELSE` é uma cópia exata do corpo atual de cada função — zero risco de regressão pro
  fluxo de gestor/admin.
- **Pré-requisito bloqueante (independente deste projeto):** revogar os grants excessivos em
  `vw_pedidos`/`vw_pedidos_v2`:
  ```sql
  REVOKE ALL ON public.vw_pedidos FROM anon, authenticated;
  REVOKE ALL ON public.vw_pedidos_v2 FROM anon, authenticated;
  ```
  Sem isso, o reforço nas RPCs é decorativo — um representante logado poderia ler a view direto via
  `supabase-js`, ignorando a RPC inteiramente. Confirmar durante a implementação se algum processo
  legítimo (backend/n8n) depende de acesso direto via role `authenticated`/`anon` antes de revogar —
  pela investigação até aqui, o consumo real é todo via RPC ou via `service_role` (backend), então
  não deveria haver quebra, mas vale checar.
- **Frontend:** nenhuma página ou rota nova. `getMyProfile()` (`src/lib/profile.ts`, já existente)
  já retorna o `role` do usuário logado — a página de dashboard atual passa a esconder o seletor de
  representante quando `role = 'representante'` (o parâmetro não teria efeito mesmo, já que a RPC o
  ignora nesse caso).
- **Provisionamento:** (1) levantar representantes ativos (`sankhya_vendedores.ativo='S'` +
  equivalente Nexus) cruzando com quem aparece em `vw_pedidos_v2` recentemente; (2) usuário fornece
  e-mail de cada um; (3) criar conta via Supabase Auth com **senha temporária definida pelo
  usuário** (não convite por e-mail) + linha em `profiles` com `role='representante'` — a senha
  inicial é repassada por fora (WhatsApp, verbal, etc.), sem exigir troca obrigatória no primeiro
  login (não solicitado); (4) inserir vínculo em `representante_contas`; (5) validar login de teste
  contra os números esperados daquele representante.

## Fora de escopo (YAGNI)

- A visão de ranking do gestor comparando representantes entre si (subprojeto 2, brainstorm
  separado).
- Qualquer métrica ou conteúdo novo — este documento é só a fundação de acesso, reaproveitando as
  RPCs e páginas já existentes.
- Fluxo de "esqueci minha senha" / recuperação de conta customizado — usa o fluxo padrão do
  Supabase Auth já em uso pelo restante do app.
- Suporte a um representante ver dados de outro (ex: supervisor vendo sua equipe) — não foi pedido;
  se surgir, é extensão futura da mesma tabela `representante_contas` (múltiplos vínculos por
  profile, hoje limitados a 1 pessoa = 1 ou mais `(sistema, id_representante)` dela mesma).
