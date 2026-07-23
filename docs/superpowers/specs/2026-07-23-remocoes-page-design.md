# Página de Remoções — Design

## Contexto

A tabela `public.removals` já existe e é usada para excluir notas/pedidos de cancelamento
das agregações do dashboard (`vw_pedidos` faz `LEFT JOIN removals ... WHERE r.id IS NULL`).
Hoje o único jeito de inserir um registro é rodando SQL manualmente no Supabase:

```sql
insert into public.removals (sistema, pedido, motivo, removed_by)
values (2, 262170, 'Solicitado por Moiseis Araujo - Financeiro', '3588ce28-3f57-41cc-98e0-84742cde8cc9')
on conflict (sistema, pedido) do nothing;
```

Objetivo: criar uma página no app para adicionar (e listar/excluir) remoções sem precisar
mexer no banco diretamente.

### Schema atual de `public.removals`

| coluna | tipo | observação |
|---|---|---|
| id | bigint | PK, auto |
| sistema | integer | 1 = Nexus, 2 = Sankhya (só esses dois existem hoje) |
| pedido | bigint | número do pedido/nota no sistema de origem |
| motivo | text | texto livre |
| removed_by | uuid | FK → `profiles.id` |
| created_at | timestamptz | auto |

Constraint única: `removals_sistema_pedido_key UNIQUE (sistema, pedido)`.
RLS: habilitado, **zero políticas** — hoje nada consegue gravar via API além de acesso direto ao banco.

## Decisões (confirmadas com o usuário)

- **Escopo:** formulário de adicionar + lista das remoções já cadastradas + exclusão (com confirmação). Sem edição.
- **`removed_by`:** preenchido automaticamente com `auth.uid()` do usuário logado — não é selecionável no formulário.
- **`motivo`:** campo de texto livre único (mantém o formato atual, ex: "Solicitado por Fulano - Financeiro"), sem separar em "solicitante"/"motivo".
- **Localização:** nova página de primeiro nível, `/remocoes`, com entrada própria no menu lateral.
- **Controle de acesso:** nenhum por enquanto — qualquer usuário autenticado pode acessar, mesmo padrão do resto do app hoje (`ProtectedRoute` só exige login). O usuário confirmou que hoje só existe uma conta (admin) e que restrição por papel (`profiles.role`) será tratada depois, quando houver mais perfis — **fora de escopo desta entrega**.
- **Padrão de acesso a dados:** segue a convenção já usada em `dashboard_projecoes` — todo acesso via functions `SECURITY DEFINER`, nunca `supabase.from('removals')` direto (compatível com RLS sem políticas).

## Banco de dados

Três functions novas, no mesmo estilo de `insert_dashboard_projecao` (`SECURITY DEFINER`,
`SET search_path = public`, `raise exception` para validação):

### `insert_removal(p_sistema integer, p_pedido bigint, p_motivo text default null)`

- Valida `p_sistema in (1, 2)`, senão `raise exception`.
- Valida `p_pedido is not null and p_pedido > 0`, senão `raise exception`.
- Insere com `removed_by = auth.uid()`.
- Se violar a unique constraint `(sistema, pedido)`, captura a exceção (`unique_violation`) e relança uma mensagem amigável: `'Este pedido já está na lista de remoções.'`
- Retorna a linha inserida com o nome do usuário (`left join public.profiles p on p.id = removed_by`, usando `coalesce(p.nome, p.email, 'Desconhecido')` como `removed_by_nome`, já que `profiles.nome` é opcional).

### `list_removals()`

- `select` de `removals` com `left join profiles` para trazer `removed_by_nome` (mesmo `coalesce(nome, email, 'Desconhecido')` acima).
- Ordenado por `created_at desc`.

### `delete_removal(p_id bigint)`

- Apaga por `id`. Sem checagem de dono (qualquer usuário autenticado pode excluir qualquer remoção, consistente com a decisão de não ter controle de acesso por papel ainda).

**Segurança:** as três functions serão criadas e imediatamente terá o `EXECUTE` revogado de
`PUBLIC`, com grant explícito só para `authenticated` — mesmo cuidado que já tomamos com as
functions de dashboard (o grant default do Postgres para `PUBLIC` foi a causa da exposição
anônima que corrigimos antes).

## Frontend

Estrutura nova, espelhando exatamente o padrão já usado em `use-dashboard-simulations.ts` /
`simulation-form.tsx` / `simulation-table.tsx`:

- `src/lib/removals.ts` — tipos (`RemovalRow`, tipo de input) + `getRemovals()`, `insertRemoval(sistema, pedido, motivo)`, `deleteRemoval(id)`, todas via `supabase.rpc(...)`.
- `src/hooks/removals/use-removals.ts` — estado da lista (`removals`, `loading`), estado do formulário (`sistema`, `pedido`, `motivo`, `saving`), `loadRemovals()`, `handleSubmit()`, `handleDelete(id)`. Erros com `logger.error` + `toast.error` (padrão `sonner` já usado no app). Recarrega a lista após inserir/excluir.
- `src/components/removals/removal-form.tsx` — campos:
  - Sistema: `<select>` com opções "1 - Nexus" / "2 - Sankhya".
  - Pedido: `<input type="number" min="1" step="1">`.
  - Motivo: `<input type="text">`, placeholder `"Ex: Solicitado por Fulano - Financeiro"`.
  - Botão "Adicionar remoção", desabilitado durante `saving`.
- `src/components/removals/removal-table.tsx` — tabela (com variante mobile, como `simulation-table.tsx`) com colunas Sistema, Pedido, Motivo, Removido por, Data, e botão excluir por linha. Exclusão pede confirmação via `window.confirm(...)` antes de chamar `handleDelete` (não há componente de modal customizado no app; `window.confirm` é a opção mais simples sem introduzir dependência nova).
- `src/pages/remocoes/remocoes-page.tsx` — página com `AppShell`, título "Remoções", monta form + tabela.
- `src/App.tsx` — nova rota `/remocoes`, dentro de `ProtectedRoute`.
- `src/components/layout/sidebar.tsx` — novo item de navegação (ícone `Ban` do `lucide-react`, rótulo "Remoções").

## Validação e tratamento de erro

- Sistema: só aceita 1 ou 2 no `<select>` (não dá pra digitar valor inválido).
- Pedido: `<input type="number">`, valida `> 0` no client antes de chamar a RPC (evita round-trip desnecessário), e a RPC valida de novo no servidor (defesa em profundidade).
- Duplicata: erro da RPC (`'Este pedido já está na lista de remoções.'`) é capturado e mostrado via `toast.error`.
- Falha de rede/RPC: `logger.error` + `toast.error` genérico, sem quebrar a página.

## Fora de escopo (YAGNI)

- Edição de remoções existentes.
- Checagem de papel/role (`profiles.role`) — vira decisão futura do usuário, quando houver mais perfis.
- Validar se o `pedido` realmente existe no sistema de origem (Nexus/Sankhya) antes de permitir a remoção.
- Paginação/busca na lista (volume esperado é baixo).

## Testes / verificação

- `tsc --noEmit`, `eslint`, `npm run build` depois de implementado.
- Testar manualmente: inserir remoção válida, tentar duplicata (deve mostrar erro amigável), excluir com confirmação, conferir que o dashboard (`vw_pedidos`/materialized views) reflete a remoção depois de um refresh.
