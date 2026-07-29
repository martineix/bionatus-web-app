# Menu accordion "Cadastros" — Design

## Contexto

Depois da feature de página de permissões
(`docs/superpowers/specs/2026-07-29-pagina-permissoes-design.md`), o menu lateral
(`src/components/layout/sidebar.tsx`) tem 5 itens soltos: Dashboard, Clientes, Produtos, Remoções e
Permissões — sendo os 2 últimos exclusivos de `role='user'` (nunca aparecem para `representante`). O
usuário quer agrupar esses 2 itens administrativos num accordion chamado "Cadastros", deixando
Dashboard/Clientes/Produtos como itens soltos, sem mudança.

## Decisões

- **Escopo do grupo:** só "Remoções" e "Permissões" — os únicos 2 itens hoje exclusivos de
  `role='user'`. Nenhum outro item entra no grupo.
- **Estado inicial inteligente, sem persistência:** o `Sidebar` remonta a cada navegação de página
  (cada página envolve seu conteúdo em `<AppShell>`, que renderiza `<Sidebar>` do zero). Sem uma
  regra explícita, o accordion fecharia sozinho ao navegar entre "Remoções" e "Permissões",
  obrigando o usuário a reabri-lo a cada clique. Para evitar isso sem introduzir estado
  persistido (localStorage, contexto global), o estado inicial do accordion é calculado a partir da
  rota atual (`useLocation()`): **aberto se a rota atual for `/remocoes` ou `/permissoes`, fechado
  nas demais**. O usuário pode alternar manualmente depois — esse ajuste vale só para aquela
  montagem da página, sem persistir.
- **Menu colapsado (modo só ícone):** o accordion é ignorado — "Remoções" e "Permissões" continuam
  como ícones soltos, exatamente como hoje. Sem popover/submenu flutuante ao passar o mouse (fora de
  escopo, YAGNI).
- **Compatibilidade com `hideRemocoes`/`hideAdminItems`:** a lógica de ocultação por permissão
  continua funcionando dentro do grupo — se um dos 2 itens estiver oculto, só o outro aparece dentro
  de "Cadastros"; se os dois estiverem ocultos (representante), o grupo inteiro não é renderizado.
- **Ícone do grupo:** `FolderCog` do `lucide-react` (já é a biblioteca de ícones usada em todo o
  projeto), com uma seta (`ChevronDown`/`ChevronRight`, também `lucide-react`) indicando
  aberto/fechado.

## Implementação

Em `src/components/layout/sidebar.tsx`:

- `navItems` deixa de ser uma lista plana única. Passa a existir uma lista de itens "soltos"
  (Dashboard, Clientes, Produtos) e uma lista separada para o grupo "Cadastros" (Remoções,
  Permissões), já que eles têm regras de exibição e de agrupamento diferentes.
- Novo estado local `const [cadastrosOpen, setCadastrosOpen] = useState(...)`, inicializado com
  `useLocation().pathname` sendo `/remocoes` ou `/permissoes`.
- O grupo só renderiza (cabeçalho + subitens) quando `showLabels` é `true` (menu expandido/mobile) **e**
  pelo menos um dos 2 itens do grupo está visível (`!hideRemocoes || !hideAdminItems`).
- Quando `!showLabels` (colapsado), os 2 itens são renderizados como ícones soltos, junto dos demais
  — sem o cabeçalho do grupo.

## Fora de escopo (YAGNI)

- Persistência do estado aberto/fechado entre navegações além da regra de "abre se a rota atual é
  filha do grupo" — não foi pedido, e a regra já cobre o caso de uso principal (navegar entre os 2
  itens do grupo sem precisar reabrir).
- Submenu flutuante/popover no modo colapsado.
- Agrupar outros itens do menu (Dashboard/Clientes/Produtos) — só os 2 itens administrativos foram
  pedidos.
