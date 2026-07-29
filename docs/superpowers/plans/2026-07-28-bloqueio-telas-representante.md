# Bloqueio de telas/funcionalidades para representante Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir que uma conta `role='representante'` acesse a tela de Remoções (rota, menu e as 3 RPCs) e veja o checkbox/seção de projeção no Dashboard, com enforcement real no backend e ocultação no frontend.

**Architecture:** Duas camadas independentes — (1) as 3 RPCs de remoções ganham uma guarda de `role` no início do corpo (mesmo padrão de `raise exception` já usado nelas para outras validações); (2) o frontend usa `getMyProfile()` (já existente, `src/lib/profile.ts`) em três pontos: um novo route guard para `/remocoes`, o `AppShell` (que repassa a informação para a `Sidebar` esconder o item de menu), e o `dashboard-page.tsx` (que já tem esse estado, só precisa usá-lo para esconder a seção de projeção).

**Tech Stack:** Supabase Postgres (SQL direto via `mcp__supabase__apply_migration`, sem migrations locais), React + TypeScript + react-router-dom (frontend já existente).

## Global Constraints

- Sem tabela de permissões genérica — checagem direta `role = 'representante'` (só 2 roles existem hoje: `user`, `representante`).
- Sem página de "acesso negado" — bloqueio de rota é redirecionamento silencioso para `/dashboard`, mesmo padrão do `ProtectedRoute` (`src/routes/protected-route.tsx`) já existente.
- Clientes/Produtos ficam fora de escopo (são páginas placeholder sem conteúdo real).
- Trabalho é feito direto na branch `main` do repositório `bionatus-web-app` (mesmo padrão das features anteriores desta sessão), com consentimento do usuário.

---

### Task 1: Bloquear as 3 RPCs de remoções para `role='representante'`

**Files:**
- Nenhum arquivo local — mudança aplicada direto no Supabase via `mcp__supabase__apply_migration` (projeto não usa migrations locais).

**Interfaces:**
- Consumes: `public.profiles.role` (coluna já existente, valores `'user'`/`'representante'`), `auth.uid()`.
- Produces: nenhuma assinatura muda. `list_removals()`, `insert_removal(p_sistema integer, p_pedido bigint, p_motivo text)`, `delete_removal(p_id bigint)` continuam com os mesmos parâmetros e formatos de retorno — só passam a levantar `raise exception 'Acesso não permitido para este perfil.'` quando quem chama tem `role='representante'`.

- [ ] **Step 1: Reescrever `list_removals` (de `LANGUAGE sql` para `LANGUAGE plpgsql`, para poder usar `IF`/`RAISE`)**

Aplicar via `mcp__supabase__apply_migration` (nome sugerido: `block_removals_for_representante`):

```sql
CREATE OR REPLACE FUNCTION public.list_removals()
 RETURNS TABLE(id bigint, sistema integer, pedido bigint, motivo text, removed_by uuid, removed_by_nome text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (select role from public.profiles where id = auth.uid()) = 'representante' then
    raise exception 'Acesso não permitido para este perfil.';
  end if;

  return query
  select
    r.id,
    r.sistema,
    r.pedido,
    r.motivo,
    r.removed_by,
    coalesce(p.nome, p.email, 'Desconhecido') as removed_by_nome,
    r.created_at
  from public.removals r
  left join public.profiles p on p.id = r.removed_by
  order by r.created_at desc;
end;
$function$;
```

- [ ] **Step 2: Reescrever `insert_removal` acrescentando a guarda no topo do `begin`, corpo existente inalterado**

```sql
CREATE OR REPLACE FUNCTION public.insert_removal(p_sistema integer, p_pedido bigint, p_motivo text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, sistema integer, pedido bigint, motivo text, removed_by uuid, removed_by_nome text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id bigint;
begin
  if (select role from public.profiles where id = auth.uid()) = 'representante' then
    raise exception 'Acesso não permitido para este perfil.';
  end if;

  if p_sistema not in (1, 2) then
    raise exception 'Sistema inválido. Valores permitidos: 1 (Nexus), 2 (Sankhya)';
  end if;

  if p_pedido is null or p_pedido <= 0 then
    raise exception 'Pedido inválido. Informe um número de pedido maior que zero';
  end if;

  begin
    insert into public.removals (sistema, pedido, motivo, removed_by)
    values (p_sistema, p_pedido, p_motivo, auth.uid())
    returning removals.id into v_id;
  exception
    when unique_violation then
      raise exception 'Este pedido já está na lista de remoções.';
  end;

  return query
  select
    r.id,
    r.sistema,
    r.pedido,
    r.motivo,
    r.removed_by,
    coalesce(p.nome, p.email, 'Desconhecido') as removed_by_nome,
    r.created_at
  from public.removals r
  left join public.profiles p on p.id = r.removed_by
  where r.id = v_id;
end;
$function$;
```

- [ ] **Step 3: Reescrever `delete_removal` acrescentando a guarda no topo do `begin`**

```sql
CREATE OR REPLACE FUNCTION public.delete_removal(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (select role from public.profiles where id = auth.uid()) = 'representante' then
    raise exception 'Acesso não permitido para este perfil.';
  end if;

  delete from public.removals where id = p_id;
end;
$function$;
```

- [ ] **Step 4: Validar bloqueio simulando a sessão da conta de teste (`role='representante'`)**

No SQL Editor do Supabase, usando o UUID de teste já existente (`259d1a91-2a73-449a-be92-b7e780504d34`, Pedro Figueira, `role='representante'`):

```sql
SET LOCAL request.jwt.claims = '{"sub": "259d1a91-2a73-449a-be92-b7e780504d34"}';
SELECT * FROM list_removals();
RESET request.jwt.claims;
```

Expected: erro `Acesso não permitido para este perfil.` (não uma lista vazia — confirma que é bloqueio, não filtro).

Repetir para `insert_removal(2, 999999, 'teste')` e `delete_removal(1)` — mesmo erro esperado em ambas, sem side-effect (nenhuma linha deve ser inserida/apagada).

- [ ] **Step 5: Validar que o fluxo normal (gestor/admin, `role='user'`) continua funcionando**

Rodar `SELECT * FROM list_removals();` sem simular sessão de representante (ou simulando um profile com `role='user'`) — deve retornar a lista normalmente, sem erro. Isso confirma que a mudança não regrediu o caminho existente.

---

### Task 2: Criar `RoleProtectedRoute` e aplicá-lo em `/remocoes`

**Files:**
- Create: `src/routes/role-protected-route.tsx`
- Modify: `src/App.tsx:41-48` (rota `/remocoes`)

**Interfaces:**
- Consumes: `getMyProfile()` de `src/lib/profile.ts` (retorna objeto com campo `role: string`, já usado em `dashboard-page.tsx`).
- Produces: componente `RoleProtectedRoute` (`{ children: React.ReactNode }` → `JSX.Element`), usado por `App.tsx` para envolver `<RemocoesPage />` por dentro do `ProtectedRoute` já existente.

- [ ] **Step 1: Criar `src/routes/role-protected-route.tsx`**

```tsx
import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { getMyProfile } from "@/lib/profile"

type Props = {
  children: React.ReactNode
}

export default function RoleProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    let mounted = true

    getMyProfile()
      .then((profile) => {
        if (!mounted) return
        setBlocked(profile.role === "representante")
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setBlocked(false)
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Carregando...</div>
  }

  if (blocked) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Aplicar o guard na rota `/remocoes` em `src/App.tsx`**

Adicionar o import:

```tsx
import RoleProtectedRoute from "@/routes/role-protected-route"
```

Substituir o bloco da rota `/remocoes` (atualmente):

```tsx
      <Route
        path="/remocoes"
        element={
          <ProtectedRoute>
            <RemocoesPage />
          </ProtectedRoute>
        }
      />
```

por:

```tsx
      <Route
        path="/remocoes"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute>
              <RemocoesPage />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />
```

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc -b --noEmit`
Expected: sem erros.

Run: `npx eslint src/routes/role-protected-route.tsx src/App.tsx`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/routes/role-protected-route.tsx src/App.tsx
git commit -m "feat: bloquear rota /remocoes para representante"
```

---

### Task 3: Esconder o item "Remoções" do menu para representante

**Files:**
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `getMyProfile()` (mesma interface da Task 2).
- Produces: `Sidebar` passa a aceitar uma nova prop opcional `hideRemocoes?: boolean`; `AppShell` não expõe nenhuma prop nova (a busca de profile é interna).

- [ ] **Step 1: Buscar o profile em `AppShell` e repassar para `Sidebar`**

Em `src/components/layout/app-shell.tsx`, adicionar o import e o estado (mesmo padrão já usado em `dashboard-page.tsx`):

```tsx
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import Sidebar from "./sidebar"
import Topbar from "./topbar"
import { getMyProfile } from "@/lib/profile"
```

Dentro do componente, após as declarações de estado existentes (`wasMobileOpenRef`), adicionar:

```tsx
  const [isRepresentanteView, setIsRepresentanteView] = useState(false)

  useEffect(() => {
    getMyProfile()
      .then((profile) => setIsRepresentanteView(profile.role === "representante"))
      .catch(() => setIsRepresentanteView(false))
  }, [])
```

E no JSX, passar a prop para `Sidebar`:

```tsx
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileOpen}
        onCloseMobile={handleCloseMobileMenu}
        asideRef={asideRef}
        closeButtonRef={closeButtonRef}
        hideRemocoes={isRepresentanteView}
      />
```

- [ ] **Step 2: Filtrar o item "Remoções" em `Sidebar`**

Em `src/components/layout/sidebar.tsx`, adicionar `hideRemocoes` ao type `SidebarProps`:

```tsx
type SidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  asideRef?: RefObject<HTMLElement | null>
  closeButtonRef?: RefObject<HTMLButtonElement | null>
  hideRemocoes?: boolean
}
```

Adicionar o parâmetro na desestruturação da função e calcular a lista filtrada antes do `return`:

```tsx
export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  asideRef,
  closeButtonRef,
  hideRemocoes = false,
}: SidebarProps) {
  const showLabels = mobileOpen || !collapsed
  const visibleNavItems = hideRemocoes
    ? navItems.filter((item) => item.to !== "/remocoes")
    : navItems
```

E trocar `navItems.map(...)` por `visibleNavItems.map(...)` no `<nav>` (linha onde hoje é `{navItems.map((item) => {`).

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc -b --noEmit`
Expected: sem erros.

Run: `npx eslint src/components/layout/app-shell.tsx src/components/layout/sidebar.tsx`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-shell.tsx src/components/layout/sidebar.tsx
git commit -m "feat: esconder item Remoções do menu para representante"
```

---

### Task 4: Esconder a seção de projeção do Dashboard para representante

**Files:**
- Modify: `src/pages/dashboard/dashboard-page.tsx:125`

**Interfaces:**
- Consumes: `isRepresentanteView` (estado já existente em `dashboard-page.tsx`, criado na feature de login individual — não precisa ser recriado).
- Produces: nenhuma interface nova.

- [ ] **Step 1: Atualizar a condição de renderização de `DashboardSimulationSection`**

Em `src/pages/dashboard/dashboard-page.tsx`, trocar a linha 125 de:

```tsx
        {canShowProjectionControls && <DashboardSimulationSection {...simulations} />}
```

para:

```tsx
        {canShowProjectionControls && !isRepresentanteView && <DashboardSimulationSection {...simulations} />}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npx tsc -b --noEmit`
Expected: sem erros.

Run: `npx eslint src/pages/dashboard/dashboard-page.tsx`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/pages/dashboard/dashboard-page.tsx
git commit -m "feat: esconder secao de projecao do dashboard para representante"
```

---

### Task 5: Verificação end-to-end no navegador

**Files:**
- Nenhum arquivo — só validação manual.

**Interfaces:**
- Consumes: todas as mudanças das Tasks 1-4.
- Produces: confirmação de que o comportamento combinado (backend + frontend) funciona para os dois perfis.

- [ ] **Step 1: Subir o servidor de dev local**

Run: `npm run dev` (matar qualquer processo antigo na porta 5173 antes, se necessário).

- [ ] **Step 2: Logar como representante (conta de teste `pedro.figueira@bionatus.com.br`)**

Confirmar visualmente:
- O item "Remoções" **não aparece** no menu lateral.
- Acessar `http://localhost:5173/remocoes` diretamente pela URL redireciona para `/dashboard`.
- No Dashboard, ativar as opções que normalmente mostrariam a seção de projeção (`chartPreferences.showProjecao` + modo cumulativo + `dayMode="business"` + `metricMode="faturamento"`) — a seção `DashboardSimulationSection` **não aparece**.
- Nenhum erro no console do navegador.

- [ ] **Step 3: Logar como gestor/admin (conta `role='user'`)**

Confirmar visualmente:
- O item "Remoções" aparece normalmente no menu.
- `/remocoes` carrega normalmente, CRUD de remoções funciona (listar/inserir/excluir).
- No Dashboard, com as mesmas opções de projeção ativadas, a seção `DashboardSimulationSection` aparece normalmente — sem regressão.

- [ ] **Step 4: Finalizar a branch**

Anunciar: "Usando a skill finishing-a-development-branch para concluir este trabalho."
**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch — apresentar as opções de merge/push/manter local ao usuário e seguir a escolha dele.
