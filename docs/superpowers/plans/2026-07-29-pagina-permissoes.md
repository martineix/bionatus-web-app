# Página de permissões por papel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os 3 bloqueios hardcoded de `role='representante'` (Remoções, checkbox de Projeção, seção de Simulação) por uma tabela de permissões configurável via uma nova tela `/permissoes`, acessível a qualquer conta `role='user'`.

**Architecture:** Nova tabela `public.role_permissions` (só linhas para `role='representante'`) lida/escrita por 3 novas RPCs (`get_my_permissions`, `list_role_permissions`, `update_role_permission`). As RPCs de remoções passam a consultar essa tabela em vez do check hardcoded. O frontend busca `get_my_permissions()` nos 3 pontos que hoje decidem visibilidade a partir do `role`, e ganha uma tela nova para o gestor editar a tabela via as outras 2 RPCs.

**Tech Stack:** Supabase Postgres (SQL direto via `mcp__supabase__apply_migration`, sem migrations locais), React + TypeScript + react-router-dom + sonner (toasts).

## Global Constraints

- Permissão é por papel (`role='representante'`), nunca por pessoa individual.
- `role='user'` nunca é bloqueado, independente do conteúdo da tabela.
- A tela `/permissoes` é visível para qualquer `role='user'` — sem novo valor de role.
- 3 `feature_key`s fixos: `remocoes`, `dashboard_projecao_checkbox`, `dashboard_simulacao`. Nenhum outro é criado neste plano.
- Trabalho é feito direto na branch `main` do repositório `bionatus-web-app`, com consentimento do usuário (mesmo padrão das features anteriores desta sessão).

---

### Task 1: Criar tabela `role_permissions` e as 3 RPCs de leitura/escrita

**Files:**
- Nenhum arquivo local — tudo via `mcp__supabase__apply_migration` (projeto não usa migrations locais).

**Interfaces:**
- Consumes: `public.profiles.role`, `auth.uid()`.
- Produces: tabela `public.role_permissions(role, feature_key, allowed, updated_at)`; RPC `get_my_permissions() RETURNS TABLE(feature_key text, allowed boolean)`; RPC `list_role_permissions() RETURNS TABLE(feature_key text, allowed boolean)`; RPC `update_role_permission(p_feature_key text, p_allowed boolean) RETURNS void`. Essas 3 assinaturas são consumidas pelo frontend nas Tasks 3-7.

- [ ] **Step 1: Criar a tabela e popular com o estado atual (tudo bloqueado para representante)**

Aplicar via `mcp__supabase__apply_migration` (nome sugerido: `create_role_permissions`):

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

INSERT INTO public.role_permissions (role, feature_key, allowed) VALUES
  ('representante', 'remocoes', false),
  ('representante', 'dashboard_projecao_checkbox', false),
  ('representante', 'dashboard_simulacao', false);
```

- [ ] **Step 2: Criar `get_my_permissions()`**

Aplicar via `mcp__supabase__apply_migration` (nome sugerido: `create_get_my_permissions`):

```sql
CREATE OR REPLACE FUNCTION public.get_my_permissions()
 RETURNS TABLE(feature_key text, allowed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role text;
begin
  select prof.role into v_role from public.profiles prof where prof.id = auth.uid();

  return query
  select k.feature_key,
    case
      when v_role = 'representante' then coalesce(rp.allowed, true)
      else true
    end as allowed
  from (values ('remocoes'), ('dashboard_projecao_checkbox'), ('dashboard_simulacao')) as k(feature_key)
  left join public.role_permissions rp
    on rp.role = 'representante' and rp.feature_key = k.feature_key;
end;
$function$;

REVOKE ALL ON FUNCTION public.get_my_permissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated, service_role;
```

- [ ] **Step 3: Criar `list_role_permissions()` e `update_role_permission()`**

Aplicar via `mcp__supabase__apply_migration` (nome sugerido: `create_role_permissions_admin_rpcs`):

```sql
CREATE OR REPLACE FUNCTION public.list_role_permissions()
 RETURNS TABLE(feature_key text, allowed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (select prof.role from public.profiles prof where prof.id = auth.uid()) = 'representante' then
    raise exception 'Acesso não permitido para este perfil.';
  end if;

  return query
  select rp.feature_key, rp.allowed
  from public.role_permissions rp
  where rp.role = 'representante'
  order by rp.feature_key;
end;
$function$;

REVOKE ALL ON FUNCTION public.list_role_permissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_role_permissions() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_role_permission(p_feature_key text, p_allowed boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (select prof.role from public.profiles prof where prof.id = auth.uid()) = 'representante' then
    raise exception 'Acesso não permitido para este perfil.';
  end if;

  if p_feature_key not in ('remocoes', 'dashboard_projecao_checkbox', 'dashboard_simulacao') then
    raise exception 'feature_key inválido: %', p_feature_key;
  end if;

  insert into public.role_permissions (role, feature_key, allowed, updated_at)
  values ('representante', p_feature_key, p_allowed, now())
  on conflict (role, feature_key)
  do update set allowed = excluded.allowed, updated_at = excluded.updated_at;
end;
$function$;

REVOKE ALL ON FUNCTION public.update_role_permission(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_role_permission(text, boolean) TO authenticated, service_role;
```

- [ ] **Step 4: Validar `get_my_permissions()` para representante e para gestor**

No SQL Editor do Supabase, simulando a sessão do representante de teste (UUID `259d1a91-2a73-449a-be92-b7e780504d34`):

```sql
BEGIN;
SET LOCAL request.jwt.claims = '{"sub": "259d1a91-2a73-449a-be92-b7e780504d34"}';
SELECT * FROM get_my_permissions();
ROLLBACK;
```

Expected: 3 linhas, todas com `allowed = false` (reflete o seed do Step 1).

Rodar `SELECT * FROM get_my_permissions();` sem simular sessão (como gestor/admin) — expected: 3 linhas, todas `allowed = true`.

- [ ] **Step 5: Validar `list_role_permissions()` e `update_role_permission()`**

Bloqueio para representante:

```sql
BEGIN;
SET LOCAL request.jwt.claims = '{"sub": "259d1a91-2a73-449a-be92-b7e780504d34"}';
SELECT * FROM list_role_permissions();
ROLLBACK;
```

Expected: erro `Acesso não permitido para este perfil.`.

Fluxo normal (gestor) — alternar e conferir:

```sql
SELECT * FROM list_role_permissions();
SELECT update_role_permission('remocoes', true);
SELECT * FROM list_role_permissions();
SELECT update_role_permission('remocoes', false);
SELECT * FROM list_role_permissions();
```

Expected: a segunda consulta mostra `remocoes` com `allowed = true`; a última mostra `allowed = false` de volta (estado original restaurado).

---

### Task 2: Trocar o bloqueio hardcoded das RPCs de remoções pela tabela de permissões

**Files:**
- Nenhum arquivo local — via `mcp__supabase__apply_migration`.

**Interfaces:**
- Consumes: `public.role_permissions` (Task 1).
- Produces: nenhuma assinatura muda. `list_removals()`, `insert_removal(...)`, `delete_removal(...)` continuam iguais — só a condição de bloqueio interna muda de "sempre bloqueia representante" para "bloqueia representante só se `role_permissions` para `feature_key='remocoes'` estiver `allowed=false`".

- [ ] **Step 1: Reescrever as 3 RPCs**

Aplicar via `mcp__supabase__apply_migration` (nome sugerido: `gate_removals_by_role_permissions`):

```sql
CREATE OR REPLACE FUNCTION public.list_removals()
 RETURNS TABLE(id bigint, sistema integer, pedido bigint, motivo text, removed_by uuid, removed_by_nome text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (select prof.role from public.profiles prof where prof.id = auth.uid()) = 'representante'
     and not coalesce(
       (select rp.allowed from public.role_permissions rp where rp.role = 'representante' and rp.feature_key = 'remocoes'),
       true
     )
  then
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

CREATE OR REPLACE FUNCTION public.insert_removal(p_sistema integer, p_pedido bigint, p_motivo text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, sistema integer, pedido bigint, motivo text, removed_by uuid, removed_by_nome text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id bigint;
begin
  if (select prof.role from public.profiles prof where prof.id = auth.uid()) = 'representante'
     and not coalesce(
       (select rp.allowed from public.role_permissions rp where rp.role = 'representante' and rp.feature_key = 'remocoes'),
       true
     )
  then
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

CREATE OR REPLACE FUNCTION public.delete_removal(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (select prof.role from public.profiles prof where prof.id = auth.uid()) = 'representante'
     and not coalesce(
       (select rp.allowed from public.role_permissions rp where rp.role = 'representante' and rp.feature_key = 'remocoes'),
       true
     )
  then
    raise exception 'Acesso não permitido para este perfil.';
  end if;

  delete from public.removals where id = p_id;
end;
$function$;
```

- [ ] **Step 2: Validar o bloqueio (estado atual: `remocoes` allowed=false)**

```sql
BEGIN;
SET LOCAL request.jwt.claims = '{"sub": "259d1a91-2a73-449a-be92-b7e780504d34"}';
SELECT * FROM list_removals();
ROLLBACK;
```

Expected: erro `Acesso não permitido para este perfil.` (igual a antes — nada mudou no comportamento observável ainda).

- [ ] **Step 3: Validar que liberar a permissão libera a RPC**

```sql
SELECT update_role_permission('remocoes', true);

BEGIN;
SET LOCAL request.jwt.claims = '{"sub": "259d1a91-2a73-449a-be92-b7e780504d34"}';
SELECT count(*) AS total FROM list_removals();
ROLLBACK;

SELECT update_role_permission('remocoes', false);
```

Expected: a consulta dentro do `BEGIN`/`ROLLBACK` retorna a contagem normal (sem erro) enquanto `allowed=true`; a última linha restaura `allowed=false`.

---

### Task 3: Criar `src/lib/permissions.ts`

**Files:**
- Create: `src/lib/permissions.ts`

**Interfaces:**
- Consumes: RPCs `get_my_permissions`, `list_role_permissions`, `update_role_permission` (Tasks 1-2).
- Produces: `type Permissions = { remocoes: boolean; dashboardProjecaoCheckbox: boolean; dashboardSimulacao: boolean }`; `getMyPermissions(): Promise<Permissions>`; `type RolePermissionRow = { feature_key: string; allowed: boolean }`; `listRolePermissions(): Promise<RolePermissionRow[]>`; `updateRolePermission(featureKey: string, allowed: boolean): Promise<void>`. Usadas pelas Tasks 4-7.

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/lib/permissions.ts
import { supabase } from "./supabase"

export type Permissions = {
  remocoes: boolean
  dashboardProjecaoCheckbox: boolean
  dashboardSimulacao: boolean
}

export type RolePermissionRow = {
  feature_key: string
  allowed: boolean
}

export async function getMyPermissions(): Promise<Permissions> {
  const { data, error } = await supabase.rpc("get_my_permissions")

  if (error) {
    throw error
  }

  const rows = (data ?? []) as RolePermissionRow[]
  const byKey = new Map(rows.map((row) => [row.feature_key, row.allowed]))

  return {
    remocoes: byKey.get("remocoes") ?? true,
    dashboardProjecaoCheckbox: byKey.get("dashboard_projecao_checkbox") ?? true,
    dashboardSimulacao: byKey.get("dashboard_simulacao") ?? true,
  }
}

export async function listRolePermissions(): Promise<RolePermissionRow[]> {
  const { data, error } = await supabase.rpc("list_role_permissions")

  if (error) {
    throw error
  }

  return (data ?? []) as RolePermissionRow[]
}

export async function updateRolePermission(
  featureKey: string,
  allowed: boolean
): Promise<void> {
  const { error } = await supabase.rpc("update_role_permission", {
    p_feature_key: featureKey,
    p_allowed: allowed,
  })

  if (error) {
    throw error
  }
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npx tsc -b --noEmit`
Expected: sem erros.

Run: `npx eslint src/lib/permissions.ts`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/permissions.ts
git commit -m "feat: adicionar lib de permissoes por papel"
```

---

### Task 4: `RoleProtectedRoute` aceita `featureKey` opcional e é aplicado em `/remocoes`

**Files:**
- Modify: `src/routes/role-protected-route.tsx`
- Modify: `src/App.tsx:41-50` (rota `/remocoes`)

**Interfaces:**
- Consumes: `getMyProfile()` (`src/lib/profile.ts`), `getMyPermissions()` (Task 3).
- Produces: `RoleProtectedRoute` passa a aceitar `{ children: React.ReactNode; featureKey?: "remocoes" }`. Sem `featureKey`, comportamento igual a hoje (bloqueia qualquer `representante`) — usado pela Task 7 na rota `/permissoes`.

- [ ] **Step 1: Reescrever `src/routes/role-protected-route.tsx`**

```tsx
import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { getMyProfile } from "@/lib/profile"
import { getMyPermissions } from "@/lib/permissions"

type Props = {
  children: React.ReactNode
  featureKey?: "remocoes"
}

export default function RoleProtectedRoute({ children, featureKey }: Props) {
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    let mounted = true

    async function check() {
      try {
        const profile = await getMyProfile()

        if (profile.role !== "representante") {
          if (mounted) {
            setBlocked(false)
            setLoading(false)
          }
          return
        }

        if (!featureKey) {
          if (mounted) {
            setBlocked(true)
            setLoading(false)
          }
          return
        }

        const permissions = await getMyPermissions()

        if (mounted) {
          setBlocked(!permissions[featureKey])
          setLoading(false)
        }
      } catch {
        if (mounted) {
          setBlocked(false)
          setLoading(false)
        }
      }
    }

    check()

    return () => {
      mounted = false
    }
  }, [featureKey])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Carregando...</div>
  }

  if (blocked) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Aplicar `featureKey="remocoes"` na rota `/remocoes` em `src/App.tsx`**

Trocar:

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

por:

```tsx
      <Route
        path="/remocoes"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute featureKey="remocoes">
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
git commit -m "feat: bloqueio de /remocoes passa a respeitar role_permissions"
```

---

### Task 5: `AppShell`/`Sidebar` usam permissões e ganham o item "Permissões"

**Files:**
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `getMyPermissions()` (Task 3).
- Produces: `Sidebar` ganha uma nova prop opcional `hideAdminItems?: boolean`; a prop existente `hideRemocoes` passa a ser alimentada pela permissão em vez do `role` puro.

- [ ] **Step 1: Buscar permissões em `AppShell` e repassar para `Sidebar`**

Em `src/components/layout/app-shell.tsx`, adicionar o import:

```tsx
import { getMyPermissions, type Permissions } from "@/lib/permissions"
```

Adicionar estado (junto do `isRepresentanteView` já existente) e buscar permissões no mesmo `useEffect`:

```tsx
  const [isRepresentanteView, setIsRepresentanteView] = useState(false)
  const [permissions, setPermissions] = useState<Permissions>({
    remocoes: true,
    dashboardProjecaoCheckbox: true,
    dashboardSimulacao: true,
  })

  useEffect(() => {
    getMyProfile()
      .then((profile) => setIsRepresentanteView(profile.role === "representante"))
      .catch(() => setIsRepresentanteView(false))

    getMyPermissions()
      .then(setPermissions)
      .catch(() => {})
  }, [])
```

Atualizar o JSX do `Sidebar` de:

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

para:

```tsx
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileOpen}
        onCloseMobile={handleCloseMobileMenu}
        asideRef={asideRef}
        closeButtonRef={closeButtonRef}
        hideRemocoes={!permissions.remocoes}
        hideAdminItems={isRepresentanteView}
      />
```

- [ ] **Step 2: Adicionar o item "Permissões" e o filtro por `hideAdminItems` em `Sidebar`**

Em `src/components/layout/sidebar.tsx`, adicionar `ShieldCheck` ao import de ícones:

```tsx
import {
  LayoutDashboard,
  Package,
  Users,
  Ban,
  ShieldCheck,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react"
```

Adicionar o item ao array `navItems`:

```tsx
const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/clientes",
    label: "Clientes",
    icon: Users,
  },
  {
    to: "/produtos",
    label: "Produtos",
    icon: Package,
  },
  {
    to: "/remocoes",
    label: "Remoções",
    icon: Ban,
  },
  {
    to: "/permissoes",
    label: "Permissões",
    icon: ShieldCheck,
  },
]
```

Adicionar `hideAdminItems` ao type e à assinatura da função:

```tsx
type SidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  asideRef?: RefObject<HTMLElement | null>
  closeButtonRef?: RefObject<HTMLButtonElement | null>
  hideRemocoes?: boolean
  hideAdminItems?: boolean
}
```

```tsx
export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  asideRef,
  closeButtonRef,
  hideRemocoes = false,
  hideAdminItems = false,
}: SidebarProps) {
  const showLabels = mobileOpen || !collapsed
  const visibleNavItems = navItems.filter((item) => {
    if (item.to === "/remocoes" && hideRemocoes) return false
    if (item.to === "/permissoes" && hideAdminItems) return false
    return true
  })
```

(O resto do componente já usa `visibleNavItems.map(...)` desde a feature anterior — nenhuma outra mudança necessária.)

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc -b --noEmit`
Expected: sem erros.

Run: `npx eslint src/components/layout/app-shell.tsx src/components/layout/sidebar.tsx`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-shell.tsx src/components/layout/sidebar.tsx
git commit -m "feat: menu usa permissoes configuraveis e ganha item Permissoes"
```

---

### Task 6: Dashboard usa permissões em vez de `isRepresentanteView` para projeção/simulação

**Files:**
- Modify: `src/pages/dashboard/dashboard-page.tsx`

**Interfaces:**
- Consumes: `getMyPermissions()` (Task 3).
- Produces: nenhuma interface nova — `isRepresentanteView` continua existindo (só para o aviso de boas-vindas), mas as duas condições de projeção passam a usar `permissions`.

- [ ] **Step 1: Buscar permissões junto do profile**

Adicionar o import:

```tsx
import { getMyPermissions, type Permissions } from "@/lib/permissions"
```

Trocar o bloco de estado/efeito atual:

```tsx
  const [isRepresentanteView, setIsRepresentanteView] = useState(false)

  useEffect(() => {
    getMyProfile()
      .then((profile) => setIsRepresentanteView(profile.role === "representante"))
      .catch(() => setIsRepresentanteView(false))
  }, [])
```

por:

```tsx
  const [isRepresentanteView, setIsRepresentanteView] = useState(false)
  const [permissions, setPermissions] = useState<Permissions>({
    remocoes: true,
    dashboardProjecaoCheckbox: true,
    dashboardSimulacao: true,
  })

  useEffect(() => {
    getMyProfile()
      .then((profile) => setIsRepresentanteView(profile.role === "representante"))
      .catch(() => setIsRepresentanteView(false))

    getMyPermissions()
      .then(setPermissions)
      .catch(() => {})
  }, [])
```

- [ ] **Step 2: Atualizar as duas condições que hoje usam `isRepresentanteView`**

Trocar:

```tsx
          hideProjecao={isRepresentanteView}
```

por:

```tsx
          hideProjecao={!permissions.dashboardProjecaoCheckbox}
```

E trocar:

```tsx
        {canShowProjectionControls && !isRepresentanteView && <DashboardSimulationSection {...simulations} />}
```

por:

```tsx
        {canShowProjectionControls && permissions.dashboardSimulacao && <DashboardSimulationSection {...simulations} />}
```

(O aviso `{isRepresentanteView && (...)}` de boas-vindas continua exatamente como está — não muda.)

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc -b --noEmit`
Expected: sem erros.

Run: `npx eslint src/pages/dashboard/dashboard-page.tsx`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/dashboard-page.tsx
git commit -m "feat: dashboard usa role_permissions para projecao e simulacao"
```

---

### Task 7: Criar a página `/permissoes`

**Files:**
- Create: `src/pages/permissoes/permissoes-page.tsx`
- Modify: `src/App.tsx` (nova rota)

**Interfaces:**
- Consumes: `listRolePermissions()`, `updateRolePermission()` (Task 3); `AppShell` (`src/components/layout/app-shell.tsx`); `toast` de `sonner`.
- Produces: componente `PermissoesPage`, usado pela rota `/permissoes`.

- [ ] **Step 1: Criar `src/pages/permissoes/permissoes-page.tsx`**

```tsx
// src/pages/permissoes/permissoes-page.tsx
import { useEffect, useState } from "react"
import { toast } from "sonner"
import AppShell from "@/components/layout/app-shell"
import {
  listRolePermissions,
  updateRolePermission,
  type RolePermissionRow,
} from "@/lib/permissions"

const FEATURE_LABELS: Record<string, string> = {
  remocoes: "Acesso à tela de Remoções",
  dashboard_projecao_checkbox: "Checkbox de Projeção no gráfico",
  dashboard_simulacao: "Seção de simulação de projeção",
}

export default function PermissoesPage() {
  const [permissions, setPermissions] = useState<RolePermissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    listRolePermissions()
      .then(setPermissions)
      .catch(() => toast.error("Não foi possível carregar as permissões."))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(featureKey: string, allowed: boolean) {
    setSavingKey(featureKey)

    try {
      await updateRolePermission(featureKey, allowed)
      setPermissions((prev) =>
        prev.map((row) => (row.feature_key === featureKey ? { ...row, allowed } : row))
      )
      toast.success("Permissão atualizada.")
    } catch {
      toast.error("Não foi possível atualizar a permissão.")
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <AppShell title="Permissões" subtitle="Controle o que representantes podem acessar">
      <div className="space-y-3">
        {loading && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
        )}

        {!loading &&
          permissions.map((row) => (
            <label
              key={row.feature_key}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {FEATURE_LABELS[row.feature_key] ?? row.feature_key}
              </span>

              <input
                type="checkbox"
                checked={row.allowed}
                disabled={savingKey === row.feature_key}
                onChange={(e) => handleToggle(row.feature_key, e.target.checked)}
              />
            </label>
          ))}
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2: Adicionar a rota em `src/App.tsx`**

Adicionar o import:

```tsx
import PermissoesPage from "@/pages/permissoes/permissoes-page"
```

Adicionar a rota (sem `featureKey` — qualquer representante é bloqueado, independente dos toggles que ela mesma controla):

```tsx
      <Route
        path="/permissoes"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute>
              <PermissoesPage />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />
```

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc -b --noEmit`
Expected: sem erros.

Run: `npx eslint src/pages/permissoes/permissoes-page.tsx src/App.tsx`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/permissoes/permissoes-page.tsx src/App.tsx
git commit -m "feat: criar pagina de permissoes para admin/gestor"
```

---

### Task 8: Verificação end-to-end no navegador

**Files:**
- Nenhum arquivo — só validação manual (mesmo formato usado nas features anteriores desta sessão, sem `chromium-cli` disponível neste ambiente).

**Interfaces:**
- Consumes: todas as mudanças das Tasks 1-7.
- Produces: confirmação de que o comportamento combinado (backend + frontend) funciona nos dois sentidos do toggle, para os dois perfis.

- [ ] **Step 1: Subir o servidor de dev local**

Run: `npm run dev` (matar qualquer processo antigo na porta 5173 antes, se necessário).

- [ ] **Step 2: Como gestor/admin, abrir `/permissoes` e liberar "Acesso à tela de Remoções"**

Confirmar visualmente:
- O item "Permissões" aparece no menu.
- A tela lista os 3 toggles, todos desligados (estado inicial).
- Ligar o toggle de Remoções mostra o toast de sucesso.

- [ ] **Step 3: Como representante (conta `pedro.figueira@bionatus.com.br`), confirmar que Remoções ficou acessível**

Confirmar visualmente:
- O item "Remoções" volta a aparecer no menu.
- `/remocoes` carrega normalmente (sem redirecionar).
- O item "Permissões" continua **não** aparecendo no menu (é exclusivo de `role='user'`).
- Acessar `/permissoes` diretamente pela URL redireciona para `/dashboard`.
- O checkbox "Projeção" e a seção de simulação continuam ocultos (esses toggles ainda estão desligados).

- [ ] **Step 4: Voltar como gestor/admin e desligar "Acesso à tela de Remoções" de novo**

Confirmar que, ao desligar, a conta do representante volta a perder acesso a `/remocoes` (repetir o Step 3 rapidamente para confirmar o redirecionamento de volta).

- [ ] **Step 5: Repetir Steps 2-4 para os outros dois toggles** (`dashboard_projecao_checkbox`, `dashboard_simulacao`), confirmando que cada um controla exatamente o elemento correspondente no Dashboard, sem afetar os outros dois.

- [ ] **Step 6: Finalizar a branch**

Anunciar: "Usando a skill finishing-a-development-branch para concluir este trabalho."
**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch — apresentar as opções de push/manter local ao usuário e seguir a escolha dele.
