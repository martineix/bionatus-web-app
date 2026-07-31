# Histórico de Compras — Design

## Objetivo

Nova aba "Histórico de Compras" no accordion Clientes: busca um cliente por nome/CNPJ/código e mostra todo o histórico de itens comprados por ele — data, produto, quantidade, valor unitário, valor total, tipo de movimento (venda/bonificação/devolução) e representante. É uma tela de consulta/dossiê de um único cliente por vez, diferente das outras 6 telas de Clientes (que listam todos os clientes de uma vez com métricas agregadas).

## RLS — obrigatório

Mesma regra de todas as telas de Clientes: `_dashboard_rep_visible` aplicado nas duas RPCs novas, usando `sistema`/`id_representante` de cada pedido. Um representante logado só encontra e só vê histórico de clientes que ele já veria em qualquer outra tela de Clientes — nunca a carteira completa. Antes de considerar a task de backend concluída, testar simulando login de um representante (mesmo mecanismo de `set_config('request.jwt.claims', ...)` já usado para `get_clientes_agenda`) e confirmar que a busca e o histórico só retornam clientes/itens visíveis a ele.

## Backend — RPCs novas

### `buscar_clientes_historico(p_termo text)`

Retorna `cnpj, nome, codigo_cliente` — até 20 clientes cujo nome, CNPJ ou código bate (`ILIKE`) com `p_termo`, restritos à visibilidade do usuário logado. Fonte: `mv_clientes_pedidos` (para RLS) + `mv_clientes_nomes` (para nome/código).

### `get_cliente_historico_compras(p_cnpj text)`

Retorna, por item de pedido, ordenado por data decrescente: `data_pedido, pedido, sistema, tipo, produto, marca, quantidade, valor_unitario, valor_total, representante`.

- Fonte primária: `nexus_itens`/`nexus_produtos`/`nexus_cabecalhos`/`nexus_pessoas` e `sankhya_itens`/`sankhya_produtos`/`sankhya_cabecalhos`/`sankhya_parceiros`/`sankhya_vendedores` (join direto — não via `vw_pedidos_v2`, que não expõe `vlrunit` nem descrição/marca do produto).
- `tipo`: `'devolucao'` quando `sankhya_cabecalhos.tipmov = 'D'`; senão `'bonificacao'` quando a classificação do tipo de operação é bonificação; senão `'venda'`. Nexus nunca tem devolução (sem `tipmov`), só venda/bonificação.
- `quantidade`/`valor_total` levam o sinal da devolução (negativo), replicando a mesma lógica de `sinal` já usada em `vw_pedidos_v2`.
- `valor_total` já líquido de desconto (mesma fórmula de `vw_pedidos_v2`: nexus usa `vlrtot` direto; sankhya usa `vlrtot - vlrdesc`), pra bater com os totais mostrados em qualquer outra tela do app. `valor_unitario` é o preço unitário do item, sem ajuste.
- `representante` = nome canônico (via `vw_representantes_canonicos`, já existente), com fallback pro nome bruto.
- Aplica as mesmas exclusões de `vw_pedidos_v2`: `id_cliente` fora do intervalo 1–4, CNPJs internos hardcoded excluídos, `representante <> 'FUNCIONARIOS'`.
- Sem paginação no banco — a tabela renderiza tudo no frontend (reaproveitando a paginação client-side já existente em `ClientesDataTable`).

## Frontend

**Rota:** `/clientes/historico-compras`, item "Histórico de Compras" no accordion Clientes — por ordem alfabética, fica depois de "Frequência" (última posição).

**Busca:** campo de texto com debounce (~300ms, mínimo 2 caracteres) chamando `buscar_clientes_historico`. Resultados aparecem como uma lista curta clicável (nome, CNPJ, código) abaixo do campo — sem paginação, é sempre até 20 itens.

**Seleção:** clicar num resultado carrega o histórico completo daquele CNPJ (chamando `get_cliente_historico_compras`) na mesma página, substituindo a lista de busca por:
- Um cabeçalho-resumo do cliente: nome, CNPJ, código, e três números calculados no frontend a partir do histórico recebido (sem RPC extra): total gasto (soma de `valor_total` dos itens tipo `venda`), quantidade de pedidos distintos, quantidade de itens.
- A tabela de itens completa, reaproveitando `ClientesDataTable` (paginação, ordenação por coluna, responsivo mobile já existentes).
- Um link "← Nova busca" que limpa a seleção e volta pro campo de busca.

**Tabela de itens — colunas:** Data, Produto (nome + marca, mesmo padrão visual de `ClienteNomeCell`), Quantidade, Valor unitário, Valor total, Tipo (badge: verde "Venda", azul "Bonificação", vermelho "Devolução"), Representante.

## Fora de escopo (confirmado com o usuário)

- Filtro por tipo de movimento (venda/bonificação/devolução) ou por período — mostra tudo, sem filtro adicional nesta versão.
- Exportação (CSV/Excel) do histórico.
- Edição/remoção de itens — é uma visão somente leitura.
