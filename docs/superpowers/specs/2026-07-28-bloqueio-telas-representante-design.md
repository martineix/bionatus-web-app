# Bloqueio de telas/funcionalidades para representante — Design

## Contexto

Depois de implementar o login individual por representante
(`docs/superpowers/specs/2026-07-28-login-individual-representante-design.md`), o enforcement hoje
é só a nível de dados (RPCs do dashboard filtram por `_dashboard_rep_visible`). Mas nem toda
tela/funcionalidade do app deveria estar disponível para um representante — dois exemplos apontados
pelo usuário:

1. O checkbox/seção de projeção no Dashboard (`canShowProjectionControls` /
   `DashboardSimulationSection`, `src/pages/dashboard/dashboard-page.tsx:62-66,125`).
2. A tela de Remoções (`/remocoes`) inteira, incluindo suas 3 RPCs (`list_removals`,
   `insert_removal`, `delete_removal`), hoje liberadas para qualquer usuário `authenticated` sem
   checagem de role.

## Achados

- `Clientes` e `Produtos` são páginas placeholder sem conteúdo real (`src/pages/clientes/clientes-page.tsx`,
  `src/pages/produtos/produtos-page.tsx`) — fora de escopo, nada para bloquear ainda.
- As 3 RPCs de remoções (`list_removals`, `insert_removal`, `delete_removal`) são `SECURITY DEFINER`
  e hoje têm `GRANT EXECUTE` para `authenticated` sem nenhuma checagem de `role` — qualquer
  representante logado já consegue listar, inserir e apagar remoções via `supabase-js`, ignorando
  qualquer bloqueio puramente visual.
- Só existem dois valores de `profiles.role` hoje (`'user'`, `'representante'`) e não há plano de
  adicionar um terceiro papel no curto prazo — confirmado com o usuário.
- O roteamento (`src/App.tsx`) usa um único `ProtectedRoute` (`src/routes/protected-route.tsx`) que
  só checa sessão autenticada, sem noção de role.
- `Sidebar` (`src/components/layout/sidebar.tsx`) é uma lista estática `navItems`, sem lógica
  condicional hoje.

## Decisões

- **Sem tabela de permissões genérica.** Checagens diretas `role = 'representante'`, no mesmo
  espírito do padrão já usado em `_dashboard_rep_visible`. YAGNI — generalizar só se/quando surgir
  um terceiro papel.
- **Enforcement real fica no backend (RPCs), UX fica no frontend.** Mesmo padrão do projeto: o
  frontend nunca é a única barreira.

### Backend

Adicionar, no início de cada uma das 3 RPCs de remoções, um bloqueio para `role = 'representante'`:

```sql
if (select role from public.profiles where id = auth.uid()) = 'representante' then
  raise exception 'Acesso não permitido para este perfil.';
end if;
```

- `list_removals`: mesmo bloqueio, mas como é `LANGUAGE sql` (sem `IF`/`RAISE`), a função é
  reescrita para `LANGUAGE plpgsql` para poder ter a guarda condicional, retornando `raise
  exception` em vez de lista vazia — consistente com `insert_removal`/`delete_removal`, que já
  levantam exceção para outras validações. O corpo do `select` existente não muda.
- Assinaturas e formato de retorno das 3 funções não mudam — apenas comportamento para
  `role='representante'`.

### Frontend

1. **Novo guard de rota**, `src/routes/role-protected-route.tsx`, que envolve `ProtectedRoute`:
   busca `getMyProfile()` e, se `role === 'representante'`, redireciona para `/dashboard`; senão
   renderiza os filhos. Usado em `/remocoes` no `App.tsx`.
2. **`Sidebar`**: recebe uma prop `hideRemocoes?: boolean` (calculada em `AppShell` ou no próprio
   `App.tsx`/layout raiz a partir de `getMyProfile()`) e filtra o item "Remoções" de `navItems`
   quando `true`.
3. **Dashboard**: em `dashboard-page.tsx`, a seção `{canShowProjectionControls &&
   <DashboardSimulationSection ... />}` (linha 125) passa a checar também `!isRepresentanteView`
   (estado que já existe desde a feature de login) — vira `{canShowProjectionControls &&
   !isRepresentanteView && <DashboardSimulationSection ... />}`.

Como `getMyProfile()` já é chamado em `dashboard-page.tsx` e precisa ser chamado de novo para o
guard de rota e para a sidebar, evita-se duplicar a chamada de rede subindo o resultado de role
para um nível compartilhado (ex: `AppShell` já é o wrapper comum a todas as páginas protegidas —
buscar o profile ali uma vez e repassar `role`/`isRepresentanteView` via prop para `Sidebar`, e
manter a busca própria em `dashboard-page.tsx` como está hoje, sem introduzir contexto global de
auth que não foi pedido).

## Fora de escopo (YAGNI)

- Tabela de permissões genérica por role/feature — só 2 roles existem, sem terceiro previsto.
- Bloqueio de Clientes/Produtos — são páginas vazias, nada a proteger ainda.
- Página dedicada de "acesso negado" — redirecionamento silencioso para `/dashboard`, mesmo padrão
  do `ProtectedRoute` atual.
- Qualquer mudança no modelo de `representante_contas`/`_dashboard_rep_visible` — este documento é
  só sobre bloqueio de telas/ações, não sobre o filtro de dados já existente.
