# Agenda de Clientes — Design

## Objetivo

Nova aba "Agenda" dentro do accordion Clientes, mostrando um calendário do mês selecionado onde cada dia lista os clientes com previsão de compra naquele dia. Permite ao time comercial planejar contatos proativos (ligar, visitar) antes que o cliente decida não comprar mais, em vez de descobrir isso só quando ele já está "sem comprar há X dias" (Atividade) ou quando a recompra já não veio (Frequência).

## Mecanismo de previsão

Não é um modelo de probabilidade novo — reaproveita o cálculo que já existe na tela de Frequência de Compra (`get_clientes_frequencia`): para cada cliente, `previsao_proxima_compra = data_ultima_compra + intervalo_medio_dias` (intervalo médio entre todas as compras distintas do cliente). Cada cliente cai em **um único dia exato** do calendário — não há faixa/janela de dias. Clientes com uma só compra (sem intervalo calculável) não aparecem, pois não têm previsão.

## Backend — nova RPC

`get_clientes_agenda(p_ano int, p_mes int, p_id_representante bigint default null, p_mercado integer default null, p_contas integer[] default null, p_is_bionatus integer default null, p_representante_nome text default null)`

Retorna: `cnpj, nome, codigo_cliente, representante, data_ultima_compra, intervalo_medio_dias, previsao_proxima_compra`.

- Reaproveita a mesma lógica de `get_clientes_frequencia` (CTEs `compras`/`intervalos`/`agregado`), mas filtra o resultado final para `previsao_proxima_compra` dentro do mês/ano pedido.
- `representante` = vendedor/representante da compra **mais recente** do cliente (não a de abertura), canonicalizado via a view `vw_representantes_canonicos` já criada (mesmo mecanismo usado em Abertura, que resolve nomes divergentes entre sistemas pra uma pessoa só).
- Aplica `_dashboard_rep_visible` normalmente (RLS por representante já usado em todas as RPCs de Clientes) — login como representante só vê os próprios clientes.
- `p_representante_nome`, quando informado, filtra pelo nome canônico do representante da última compra.
- É uma RPC isolada e nova — não modifica `get_clientes_frequencia` nem nenhuma outra RPC existente.

O filtro de representante na tela reaproveita a RPC `get_representantes_abertura()` já existente (lista de nomes visíveis ao usuário logado, já com RLS aplicado) — sem necessidade de criar uma nova RPC de listagem.

## Frontend

**Rota:** `/clientes/agenda`, novo item "Agenda" no accordion Clientes da sidebar (entre os itens já existentes), com ícone próprio (ex: `CalendarClock`, diferente do `CalendarPlus` já usado em Aberturas).

**Filtros:** `ClientesFilters` compartilhado (Mercado/Canal/Fabricante) + um select de "Representante" (mesmo padrão visual já criado em Abertura, via `InlineSelectField`) + navegação de mês (setas Anterior/Próximo + label "Mês/Ano" + botão "Hoje" pra voltar ao mês atual).

**Desktop (≥640px):** grade de calendário tradicional, 7 colunas (dom–sáb), uma linha por semana do mês selecionado. Cada célula de dia mostra o número do dia e, se houver clientes previstos, até 3 nomes (truncados) + badge "+N" quando houver mais. Dias fora do mês (preenchimento da grade) ficam esmaecidos e sem conteúdo. O dia de hoje tem destaque visual (borda/fundo diferenciado, mesmo padrão de cor verde já usado no app).

**Mobile (<640px):** em vez de grade, lista vertical cronológica só com os dias que têm ao menos 1 cliente previsto naquele mês (dias vazios não ocupam espaço). Cada item mostra a data (formatada, com dia da semana) + prévia dos nomes + contagem total.

**Modal de detalhe do dia:** clicar em qualquer dia (com clientes) abre um modal (mesmo componente visual/padrão de `Dialog` já usado em `ClienteDetalheModal`) listando todos os clientes daquele dia: nome, CNPJ/código, representante, intervalo médio, e um indicador textual de quão "em dia" a previsão está (ex: "previsto pra hoje", "3 dias atrás", "em 2 dias" — comparando a data prevista com a data atual, útil quando o usuário revisita um dia passado do mês).

**Estado vazio:** se o mês selecionado não tiver nenhum cliente previsto (após filtros), mostra mensagem central "Nenhuma previsão de compra para este mês." em vez de grade/lista vazia.

## Fora de escopo (confirmado com o usuário)

- Faixa/janela de dias de probabilidade em torno da previsão — só o dia exato.
- Telefone/e-mail de contato no modal (existe só para clientes do sistema Sankhya via `sankhya_parceiros`; pode ser adicionado depois como melhoria).
- Qualquer ação de "marcar como contatado" ou integração com CRM/agenda externa — é uma visão somente leitura por enquanto.
- Alterações em `get_clientes_frequencia` ou na tela de Frequência — ficam exatamente como estão.
