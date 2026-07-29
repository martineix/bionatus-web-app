# Página de permissões por papel — Design

## Contexto

Nas duas features anteriores desta sessão implementamos bloqueios *hardcoded* baseados em
`role='representante'`:

- `docs/superpowers/specs/2026-07-28-login-individual-representante-design.md` — filtro de dados por
  representante nas RPCs `get_dashboard_*` (`_dashboard_rep_visible`).
- `docs/superpowers/specs/2026-07-28-bloqueio-telas-representante-design.md` — bloqueio total das RPCs
  de remoções, redirecionamento da rota `/remocoes`, ocultação do item "Remoções" no menu, do checkbox
  "Projeção" do gráfico e da seção de simulação do dashboard.

O usuário quer transformar os 3 últimos bloqueios (Remoções, checkbox de Projeção, seção de
Simulação) em algo configurável pelo admin/gestor via uma tela, em vez de exigir uma migração SQL
cada vez que uma permissão precisa mudar. O filtro de dados por representante
(`_dashboard_rep_visible`) fica fora de escopo — não é um "liga/desliga" de tela, é a identidade dos
dados que aquele representante pode ver, e não foi pedido para ser configurável.

## Decisões

- **Granularidade: por papel (role), não por pessoa.** Uma configuração vale para todos os
  representantes. Não existe hoje diferenciação entre representantes, e não foi pedida.
- **3 toggles independentes**, um por bloqueio já existente:
  - `remocoes` — acesso à tela `/remocoes` e às RPCs `list_removals`/`insert_removal`/`delete_removal`.
  - `dashboard_projecao_checkbox` — checkbox "Projeção" no gráfico do dashboard.
  - `dashboard_simulacao` — seção de simulação (formulário + tabela) do dashboard.
- **Quem acessa a tela de permissões:** qualquer conta `role='user'` — mesmo nível de acesso que já
  têm hoje a outras telas administrativas. Sem novo papel `admin` (só existem 2 roles hoje, sem pedido
  de um terceiro).
- **`role='user'` nunca é bloqueado**, independente do conteúdo da tabela — só `representante` é
  afetado pelas permissões. Isso preserva o comportamento de hoje (gestor sempre vê tudo) sem
  depender de linhas "sempre `true`" na tabela para o papel `user`.

## Modelo de dados

Nova tabela `public.role_permissions`:

```sql
CREATE TABLE public.role_permissions (
  role text NOT NULL CHECK (role = 'representante'),
  feature_key text NOT NULL CHECK (feature_key IN ('remocoes', 'dashboard_projecao_checkbox', 'dashboard_simulacao')),
  allowed boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, feature_key)
);

REVOKE ALL ON TABLE public.role_permissions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.role_permissions TO service_role;
```

O `CHECK (role = 'representante')` documenta explicitamente, no próprio schema, a decisão de que só
esse papel é afetado — evita que alguém insira por engano uma linha para `role='user'` que nunca
seria lida.

Seed inicial (replica o comportamento hardcoded atual — hoje os 3 recursos estão bloqueados para
representante):

```sql
INSERT INTO public.role_permissions (role, feature_key, allowed) VALUES
  ('representante', 'remocoes', false),
  ('representante', 'dashboard_projecao_checkbox', false),
  ('representante', 'dashboard_simulacao', false);
```

Acesso só via RPCs `SECURITY DEFINER` (mesmo padrão do resto do projeto) — sem grants diretos para
`anon`/`authenticated`.

## Backend (RPCs)

- **`get_my_permissions()`** — `RETURNS TABLE(feature_key text, allowed boolean)`. Para
  `role <> 'representante'` (ou perfil não encontrado), retorna os 3 `feature_key`s conhecidos com
  `allowed = true`. Para `role = 'representante'`, faz `LEFT JOIN` da lista fixa de `feature_key`s
  contra `role_permissions` com `COALESCE(rp.allowed, true)` — fallback seguro (permissivo) caso um
  `feature_key` futuro ainda não tenha linha na tabela. Chamável por qualquer `authenticated`.
- **`list_role_permissions()`** — `RETURNS TABLE(feature_key text, allowed boolean)`, sempre as 3
  linhas de `role='representante'` (só existe esse papel na tabela). Bloqueia
  `role = 'representante'` com `raise exception`, mesmo padrão de `list_removals`.
- **`update_role_permission(p_feature_key text, p_allowed boolean)`** — upsert em
  `role_permissions` para `role='representante'` (não recebe `p_role` — só existe um papel afetado,
  então o parâmetro seria sempre o mesmo valor e só criaria risco de uso incorreto). Bloqueia
  `role = 'representante'` do mesmo jeito.
- **RPCs de remoções** (`list_removals`, `insert_removal`, `delete_removal`): a guarda
  `if (select role from profiles ...) = 'representante' then raise exception ...` é substituída por
  uma consulta a `role_permissions` para o `feature_key = 'remocoes'`, bloqueando só quando
  `allowed = false` (hoje sempre bloqueia; passa a respeitar o toggle).

## Frontend

- **`src/lib/permissions.ts`** (novo) — `getMyPermissions()`, que chama `get_my_permissions()` e
  retorna um objeto `{ remocoes: boolean, dashboardProjecaoCheckbox: boolean, dashboardSimulacao: boolean }`
  (todas representando "permitido", já invertido de qualquer lógica de "esconder").
- **`AppShell`**: troca a chamada a `getMyProfile()` (só para saber `role`) por, adicionalmente,
  `getMyPermissions()` — passa `hideRemocoes={!permissions.remocoes}` para `Sidebar` (em vez de
  `isRepresentanteView` puro). O item "Permissões" no menu (novo) é visível quando
  `role === 'user'` (reaproveita o mesmo mecanismo que hoje escondia "Remoções" — agora com a lógica
  invertida: novo item só aparece para quem NÃO é representante).
- **`dashboard-page.tsx`**: troca `!isRepresentanteView` nas condições dos dois elementos por
  `permissions.dashboardProjecaoCheckbox`/`dashboardSimulacao` (via `getMyPermissions()`); o aviso
  "Você está vendo seus próprios números..." continua vindo só de `getMyProfile().role`, sem mudança.
- **`RoleProtectedRoute`**: passa a aceitar uma prop `featureKey?: "remocoes"` — quando informada,
  em vez de bloquear todo `role='representante'`, consulta `getMyPermissions()` e bloqueia (redireciona
  para `/dashboard`) só se aquela permissão específica estiver `false`. Sem `featureKey`, mantém o
  comportamento atual (bloqueia qualquer representante) — usado pela nova rota `/permissoes`, que
  deve ficar fora do alcance de qualquer representante independente de toggle.
- **Nova página `src/pages/permissoes/permissoes-page.tsx`**: usa `AppShell` (título "Permissões",
  subtítulo "Controle o que representantes podem acessar"). Busca `list_role_permissions()` no mount;
  renderiza 3 linhas com rótulo amigável e um `<input type="checkbox">` estilizado (não existe um
  componente `Switch` reutilizável no projeto hoje — segue o mesmo padrão visual de
  `dashboard-sales-chart.tsx`, label com borda envolvendo o checkbox) refletindo `allowed`; ao
  alternar, chama
  `update_role_permission(feature_key, novo_valor)` e usa `sonner` (`toast.success`/`toast.error`)
  para feedback, mesmo padrão de `use-removals.ts`.
- **Nova rota `/permissoes`** em `App.tsx`, dentro de `ProtectedRoute` + `RoleProtectedRoute` (sem
  `featureKey`, já que qualquer representante deve ser bloqueado da tela inteira, independente dos
  toggles que ela mesma controla).
- **`src/components/layout/sidebar.tsx`**: novo item de menu "Permissões" (ícone sugerido:
  `ShieldCheck` do `lucide-react`, já usado em outros ícones do projeto), condicionado a
  `!hideRemocoes`-like flag — na prática, reaproveita a mesma prop booleana repensada como
  "esconder itens exclusivos de gestor", já que agora ela reflete `role`, não uma permissão
  específica.

## Fora de escopo (YAGNI)

- Permissões por pessoa individual — decisão explícita por papel.
- Um terceiro valor de `role` (`admin` separado de `user`) — não foi pedido.
- Configurar o filtro de dados por representante (`_dashboard_rep_visible`) — isso é identidade de
  dados, não visibilidade de tela/elemento, e não foi solicitado.
- Badges "a faturar" para Pedidos/Positivações — abandonado nesta sessão por falta de uma
  classificação confiável de venda/bonificação para pedidos ainda não faturados no Sankhya.
- Histórico/auditoria de quem mudou qual permissão e quando — não foi pedido; `updated_at` na tabela
  já dá um mínimo de rastreabilidade (quando mudou), sem exigir uma tabela de log dedicada.
