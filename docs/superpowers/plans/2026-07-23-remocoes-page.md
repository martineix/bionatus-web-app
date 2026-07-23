# Página de Remoções Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in user add, list, and delete rows in `public.removals` (order/invoice cancellations excluded from dashboard aggregations) from a page in the app, instead of running SQL manually.

**Architecture:** Three new `SECURITY DEFINER` Postgres functions (`insert_removal`, `list_removals`, `delete_removal`) mirror the existing `dashboard_projecoes` CRUD pattern — no direct `supabase.from('removals')` calls, since the table has RLS enabled with zero policies. A new `src/lib/removals.ts` wraps the RPCs, a new `src/hooks/removals/use-removals.ts` hook owns form + list state, and two new components (`RemovalForm`, `RemovalTable`) render them on a new `/remocoes` page reachable from the sidebar.

**Tech Stack:** React 19, TypeScript, Vite, Supabase (Postgres + supabase-js RPC), Tailwind CSS, `sonner` for toasts, `lucide-react` for icons. No test runner exists in this repo — verification is `tsc --noEmit` + `eslint` + `npm run build` for frontend tasks, and direct SQL execution via the Supabase MCP for the database task.

## Global Constraints

- Every new Postgres function: `SECURITY DEFINER`, `SET search_path = public`, `EXECUTE` revoked from `PUBLIC` immediately and granted explicitly to `authenticated` and `service_role` only (matches the fix already applied to the dashboard functions — never leave a new function on the default `PUBLIC` grant).
- `removed_by` is always `auth.uid()`, set server-side inside the function — never accepted as a parameter from the client.
- `motivo` stays a single free-text field, nullable, no minimum length.
- `sistema` accepts only `1` (Nexus) or `2` (Sankhya) — reject anything else with `raise exception`.
- No role/permission gating beyond `ProtectedRoute` (login required) — this is explicitly out of scope per the approved design (`docs/superpowers/specs/2026-07-23-remocoes-page-design.md`).
- Follow existing file conventions exactly: hooks return plain objects of state + handlers (see `use-dashboard-simulations.ts`), form/table components are presentational and receive all state/handlers as props (see `simulation-form.tsx` / `simulation-table.tsx`).

---

### Task 1: Database layer — `insert_removal`, `list_removals`, `delete_removal`

**Files:**
- No files in the repo — these are Postgres functions created directly in the Supabase project via the `mcp__supabase__execute_sql` tool (this project has no local migration files; schema changes are applied straight to the database, matching how `dashboard_projecoes`'s functions were created).

**Interfaces:**
- Produces: `public.insert_removal(p_sistema integer, p_pedido bigint, p_motivo text default null)` returning one row `(id bigint, sistema integer, pedido bigint, motivo text, removed_by uuid, removed_by_nome text, created_at timestamptz)`.
- Produces: `public.list_removals()` returning the same row shape, zero or more rows, ordered `created_at desc`.
- Produces: `public.delete_removal(p_id bigint)` returning `void`.
- These three names and signatures are exactly what `src/lib/removals.ts` (Task 2) calls via `supabase.rpc(...)`.

- [ ] **Step 1: Create `insert_removal`**

Run via `mcp__supabase__execute_sql`:

```sql
create or replace function public.insert_removal(
  p_sistema integer,
  p_pedido bigint,
  p_motivo text default null
)
returns table (
  id bigint,
  sistema integer,
  pedido bigint,
  motivo text,
  removed_by uuid,
  removed_by_nome text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id bigint;
begin
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

revoke all on function public.insert_removal(integer, bigint, text) from public;
grant execute on function public.insert_removal(integer, bigint, text) to authenticated, service_role;
```

- [ ] **Step 2: Create `list_removals`**

```sql
create or replace function public.list_removals()
returns table (
  id bigint,
  sistema integer,
  pedido bigint,
  motivo text,
  removed_by uuid,
  removed_by_nome text,
  created_at timestamptz
)
language sql
security definer
set search_path to 'public'
as $function$
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
$function$;

revoke all on function public.list_removals() from public;
grant execute on function public.list_removals() to authenticated, service_role;
```

- [ ] **Step 3: Create `delete_removal`**

```sql
create or replace function public.delete_removal(p_id bigint)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  delete from public.removals where id = p_id;
end;
$function$;

revoke all on function public.delete_removal(bigint) from public;
grant execute on function public.delete_removal(bigint) to authenticated, service_role;
```

- [ ] **Step 4: Verify grants are locked down**

Run:

```sql
select
  has_function_privilege('anon', 'public.insert_removal(integer,bigint,text)', 'execute') as anon_insert,
  has_function_privilege('anon', 'public.list_removals()', 'execute') as anon_list,
  has_function_privilege('anon', 'public.delete_removal(bigint)', 'execute') as anon_delete,
  has_function_privilege('authenticated', 'public.insert_removal(integer,bigint,text)', 'execute') as auth_insert,
  has_function_privilege('authenticated', 'public.list_removals()', 'execute') as auth_list,
  has_function_privilege('authenticated', 'public.delete_removal(bigint)', 'execute') as auth_delete;
```

Expected: all three `anon_*` columns `false`, all three `auth_*` columns `true`.

- [ ] **Step 5: Verify validation and duplicate handling**

Run each of these separately and check the result matches:

```sql
-- 1. Invalid sistema -> should raise "Sistema inválido..."
select * from public.insert_removal(3, 123456, 'teste');
```
Expected: error, message starts with `Sistema inválido`.

```sql
-- 2. Invalid pedido -> should raise "Pedido inválido..."
select * from public.insert_removal(2, 0, 'teste');
```
Expected: error, message starts with `Pedido inválido`.

```sql
-- 3. Valid insert -> should return one row
select * from public.insert_removal(2, 999999999, 'Teste de verificação do plano');
```
Expected: one row, `sistema = 2`, `pedido = 999999999`, `removed_by_nome` is your own profile's name/email (not "Desconhecido", since you're authenticated as yourself when running this through the MCP — if it comes back `null`/service-role context, that's fine, the app-level check happens in Task 6).

```sql
-- 4. Duplicate insert -> should raise the friendly message
select * from public.insert_removal(2, 999999999, 'Duplicado de propósito');
```
Expected: error, message exactly `Este pedido já está na lista de remoções.`

```sql
-- 5. list_removals shows the test row
select * from public.list_removals() where pedido = 999999999;
```
Expected: one row.

```sql
-- 6. delete_removal removes it, cleanup
select public.delete_removal((select id from public.removals where pedido = 999999999));
select * from public.list_removals() where pedido = 999999999;
```
Expected: second query returns zero rows.

- [ ] **Step 6: No commit needed**

This task only touches the live database (no repo files changed). Skip the git commit step for this task — proceed to Task 2.

---

### Task 2: `src/lib/removals.ts` — typed RPC wrappers

**Files:**
- Create: `src/lib/removals.ts`

**Interfaces:**
- Consumes: `public.insert_removal`, `public.list_removals`, `public.delete_removal` from Task 1 (called via `supabase.rpc(name, params)`).
- Produces: `RemovalRow` type (`{ id: number, sistema: number, pedido: number, motivo: string | null, removedByNome: string, createdAt: string }`), `getRemovals(): Promise<RemovalRow[]>`, `insertRemoval(sistema: number, pedido: number, motivo: string): Promise<RemovalRow>`, `deleteRemoval(id: number): Promise<void>` — these exact names/signatures are what Task 3's hook imports.

- [ ] **Step 1: Write the file**

```ts
// src/lib/removals.ts
import { supabase } from "./supabase"

export type RemovalRow = {
  id: number
  sistema: number
  pedido: number
  motivo: string | null
  removedByNome: string
  createdAt: string
}

type RemovalRowRaw = {
  id: number | string
  sistema: number | string
  pedido: number | string
  motivo: string | null
  removed_by_nome: string | null
  created_at: string
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapRemovalRow(row: RemovalRowRaw): RemovalRow {
  return {
    id: toNumber(row.id),
    sistema: toNumber(row.sistema),
    pedido: toNumber(row.pedido),
    motivo: row.motivo,
    removedByNome: row.removed_by_nome ?? "Desconhecido",
    createdAt: row.created_at,
  }
}

export async function getRemovals(): Promise<RemovalRow[]> {
  const { data, error } = await supabase.rpc("list_removals")

  if (error) {
    throw error
  }

  return ((data ?? []) as RemovalRowRaw[]).map(mapRemovalRow)
}

export async function insertRemoval(
  sistema: number,
  pedido: number,
  motivo: string
): Promise<RemovalRow> {
  const { data, error } = await supabase.rpc("insert_removal", {
    p_sistema: sistema,
    p_pedido: pedido,
    p_motivo: motivo.trim() === "" ? null : motivo,
  })

  if (error) {
    throw error
  }

  return mapRemovalRow((data as RemovalRowRaw[])[0])
}

export async function deleteRemoval(id: number): Promise<void> {
  const { error } = await supabase.rpc("delete_removal", { p_id: id })

  if (error) {
    throw error
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint src/lib/removals.ts`
Expected: no errors, no warnings.

- [ ] **Step 4: Commit**

```bash
git add src/lib/removals.ts
git commit -m "feat: add removals RPC client (src/lib/removals.ts)"
```

---

### Task 3: `src/hooks/removals/use-removals.ts` — form + list state

**Files:**
- Create: `src/hooks/removals/use-removals.ts`

**Interfaces:**
- Consumes: `getRemovals`, `insertRemoval`, `deleteRemoval`, `RemovalRow` from `@/lib/removals` (Task 2).
- Produces: `useRemovals()` returning `{ removals: RemovalRow[], loading: boolean, saving: boolean, sistema: number | "", pedido: string, motivo: string, setSistema, setPedido, setMotivo, handleSubmit: () => Promise<void>, handleDelete: (id: number) => Promise<void> }` — these exact field names are what Task 4/5's components and Task 6's page destructure.

- [ ] **Step 1: Write the file**

```ts
// src/hooks/removals/use-removals.ts
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { deleteRemoval, getRemovals, insertRemoval, type RemovalRow } from "@/lib/removals"
import { logger } from "@/lib/logger"

export function useRemovals() {
  const [removals, setRemovals] = useState<RemovalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [sistema, setSistema] = useState<number | "">("")
  const [pedido, setPedido] = useState("")
  const [motivo, setMotivo] = useState("")

  const loadRemovals = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getRemovals()
      setRemovals(data)
    } catch (error) {
      logger.error("use-removals/loadRemovals", error)
      toast.error("Não foi possível carregar as remoções.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRemovals()
  }, [loadRemovals])

  function resetForm() {
    setSistema("")
    setPedido("")
    setMotivo("")
  }

  async function handleSubmit() {
    if (sistema === "" || !pedido) {
      toast.warning("Selecione o sistema e informe o número do pedido.")
      return
    }

    const numericPedido = Number(pedido)

    if (!Number.isFinite(numericPedido) || numericPedido <= 0) {
      toast.warning("Informe um número de pedido válido.")
      return
    }

    try {
      setSaving(true)
      await insertRemoval(sistema, numericPedido, motivo)
      resetForm()
      await loadRemovals()
      toast.success("Remoção adicionada.")
    } catch (error) {
      logger.error("use-removals/handleSubmit", error)
      const message =
        error instanceof Error ? error.message : "Não foi possível adicionar a remoção."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteRemoval(id)
      await loadRemovals()
      toast.success("Remoção excluída.")
    } catch (error) {
      logger.error("use-removals/handleDelete", error)
      toast.error("Não foi possível excluir a remoção.")
    }
  }

  return {
    removals,
    loading,
    saving,
    sistema,
    pedido,
    motivo,
    setSistema,
    setPedido,
    setMotivo,
    handleSubmit,
    handleDelete,
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint src/hooks/removals/use-removals.ts`
Expected: no errors, no warnings.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/removals/use-removals.ts
git commit -m "feat: add useRemovals hook"
```

---

### Task 4: `src/components/removals/removal-form.tsx`

**Files:**
- Create: `src/components/removals/removal-form.tsx`

**Interfaces:**
- Consumes: the `sistema`, `pedido`, `motivo`, `saving`, `setSistema`, `setPedido`, `setMotivo`, `handleSubmit` fields produced by `useRemovals()` (Task 3) — passed in as props, this component has no state of its own.
- Produces: `RemovalForm` default export-free named component, imported by Task 6's page as `{ RemovalForm }` from `@/components/removals/removal-form`.

- [ ] **Step 1: Write the file**

```tsx
// src/components/removals/removal-form.tsx
import type { Dispatch, SetStateAction } from "react"

type RemovalFormProps = {
  sistema: number | ""
  pedido: string
  motivo: string
  saving: boolean
  setSistema: Dispatch<SetStateAction<number | "">>
  setPedido: Dispatch<SetStateAction<string>>
  setMotivo: Dispatch<SetStateAction<string>>
  handleSubmit: () => void
}

export function RemovalForm({
  sistema,
  pedido,
  motivo,
  saving,
  setSistema,
  setPedido,
  setMotivo,
  handleSubmit,
}: RemovalFormProps) {
  return (
    <div className="w-full h-full rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Adicionar remoção
      </h3>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Exclui um pedido/nota das agregações do dashboard.
      </p>

      <div className="mt-5 grid gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Sistema
          </label>
          <select
            value={sistema}
            onChange={(e) =>
              setSistema(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#006426] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Selecione o sistema</option>
            <option value={1}>1 - Nexus</option>
            <option value={2}>2 - Sankhya</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Pedido
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={pedido}
            onChange={(e) => setPedido(e.target.value)}
            placeholder="Ex: 262170"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#006426] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Motivo
          </label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: Solicitado por Fulano - Financeiro"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#006426] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-[#006426] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Adicionando..." : "Adicionar remoção"}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint src/components/removals/removal-form.tsx`
Expected: no errors, no warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/removals/removal-form.tsx
git commit -m "feat: add RemovalForm component"
```

---

### Task 5: `src/components/removals/removal-table.tsx`

**Files:**
- Create: `src/components/removals/removal-table.tsx`

**Interfaces:**
- Consumes: `RemovalRow` type from `@/lib/removals` (Task 2), `removals`/`loading`/`handleDelete` fields produced by `useRemovals()` (Task 3).
- Produces: `RemovalTable` named component, imported by Task 6's page as `{ RemovalTable }` from `@/components/removals/removal-table`.

- [ ] **Step 1: Write the file**

```tsx
// src/components/removals/removal-table.tsx
import { X } from "lucide-react"
import type { RemovalRow } from "@/lib/removals"

type RemovalTableProps = {
  removals: RemovalRow[]
  loading: boolean
  handleDelete: (id: number) => void
}

const sistemaLabels: Record<number, string> = {
  1: "Nexus",
  2: "Sankhya",
}

function formatDateTimeBR(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function RemovalTable({ removals, loading, handleDelete }: RemovalTableProps) {
  function confirmDelete(id: number) {
    if (window.confirm("Tem certeza que deseja excluir esta remoção?")) {
      handleDelete(id)
    }
  }

  return (
    <div className="w-full h-full rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Remoções cadastradas
      </h3>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Pedidos/notas excluídos das agregações do dashboard.
      </p>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Carregando...
        </div>
      ) : removals.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nenhuma remoção cadastrada.
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="mt-5 space-y-3 sm:hidden">
            {removals.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {sistemaLabels[item.sistema] ?? item.sistema} · Pedido {item.pedido}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.motivo || "Sem motivo informado"}
                  </p>

                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Removido por {item.removedByNome} em {formatDateTimeBR(item.createdAt)}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => confirmDelete(item.id)}
                    className="rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
                    aria-label="Excluir remoção"
                    title="Excluir"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop / Tablet */}
          <div className="mt-5 hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Sistema
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Pedido
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Motivo
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Removido por
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Data
                  </th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {removals.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 dark:border-slate-900"
                  >
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                      {sistemaLabels[item.sistema] ?? item.sistema}
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                      {item.pedido}
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                      {item.motivo || "-"}
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                      {item.removedByNome}
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                      {formatDateTimeBR(item.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => confirmDelete(item.id)}
                          className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
                          aria-label="Excluir remoção"
                          title="Excluir"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint src/components/removals/removal-table.tsx`
Expected: no errors, no warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/removals/removal-table.tsx
git commit -m "feat: add RemovalTable component"
```

---

### Task 6: Page, route, and sidebar navigation

**Files:**
- Create: `src/pages/remocoes/remocoes-page.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `useRemovals` (Task 3), `RemovalForm` (Task 4), `RemovalTable` (Task 5), `AppShell` (existing, `src/components/layout/app-shell.tsx`).
- Produces: route `/remocoes` reachable from a logged-in session; no other task depends on this one.

- [ ] **Step 1: Write the page**

```tsx
// src/pages/remocoes/remocoes-page.tsx
import AppShell from "@/components/layout/app-shell"
import { RemovalForm } from "@/components/removals/removal-form"
import { RemovalTable } from "@/components/removals/removal-table"
import { useRemovals } from "@/hooks/removals/use-removals"

export default function RemocoesPage() {
  const {
    removals,
    loading,
    saving,
    sistema,
    pedido,
    motivo,
    setSistema,
    setPedido,
    setMotivo,
    handleSubmit,
    handleDelete,
  } = useRemovals()

  return (
    <AppShell
      title="Remoções"
      subtitle="Exclua pedidos/notas de cancelamento das agregações do dashboard"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_2fr] lg:items-start">
        <RemovalForm
          sistema={sistema}
          pedido={pedido}
          motivo={motivo}
          saving={saving}
          setSistema={setSistema}
          setPedido={setPedido}
          setMotivo={setMotivo}
          handleSubmit={handleSubmit}
        />

        <RemovalTable
          removals={removals}
          loading={loading}
          handleDelete={handleDelete}
        />
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2: Add the route**

In `src/App.tsx`, add the import next to the other page imports:

```tsx
import RemocoesPage from "@/pages/remocoes/remocoes-page"
```

Add the route between the `/produtos` route and the `/` redirect:

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

- [ ] **Step 3: Add the sidebar nav item**

In `src/components/layout/sidebar.tsx`, add `Ban` to the `lucide-react` import:

```tsx
import {
  LayoutDashboard,
  Package,
  Users,
  Ban,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react"
```

Add an entry to the `navItems` array, after `Produtos`:

```tsx
  {
    to: "/remocoes",
    label: "Remoções",
    icon: Ban,
  },
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `npx eslint src/pages/remocoes/remocoes-page.tsx src/App.tsx src/components/layout/sidebar.tsx`
Expected: no errors, no warnings.

- [ ] **Step 6: Production build**

Run: `npm run build`
Expected: build succeeds (same chunk-size warning as before is fine; no new errors).

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, log in, and check:
1. Sidebar shows a "Remoções" item; clicking it navigates to `/remocoes`.
2. The page shows the form on one side and an (initially empty, or showing existing rows) table on the other.
3. Fill Sistema = "2 - Sankhya", Pedido = a real or test order number, Motivo = "Teste manual", click "Adicionar remoção" — a success toast appears and the row shows up in the table with your own name/email under "Removido por".
4. Submit the exact same Sistema+Pedido again — an error toast appears with the message "Este pedido já está na lista de remoções." (not a generic error).
5. Click the delete button on the test row, confirm the browser dialog — the row disappears and a success toast appears.
6. Try submitting with Sistema unselected, or Pedido empty — a warning toast appears and nothing is sent to the server.

- [ ] **Step 8: Commit**

```bash
git add src/pages/remocoes/remocoes-page.tsx src/App.tsx src/components/layout/sidebar.tsx
git commit -m "feat: add /remocoes page, route, and sidebar entry"
```

---

## Self-Review Notes

- **Spec coverage:** insert/list/delete RPCs (Task 1), lib wrapper (Task 2), hook (Task 3), form (Task 4), table with confirm-before-delete (Task 5), page + route + sidebar nav (Task 6) — every section of the design doc has a corresponding task. Role/permission gating and edit-in-place are explicitly out of scope per the spec and are not tasked here.
- **Type consistency:** `RemovalRow` (Task 2) is used identically in Task 3 (hook return/state), Task 5 (table props), and transitively Task 6 (page). Field names (`removedByNome`, `createdAt`, `sistema`, `pedido`, `motivo`, `id`) match across every task. `useRemovals()`'s returned field names (`sistema`, `pedido`, `motivo`, `setSistema`, `setPedido`, `setMotivo`, `handleSubmit`, `handleDelete`, `removals`, `loading`, `saving`) match exactly what Task 4/5/6 destructure.
- **No placeholders:** every step has complete, runnable code or an exact command with an expected result.
