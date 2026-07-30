# Design System — Bionatus Web App

Este documento descreve os padrões visuais **já em uso** no código hoje (levantados diretamente do repositório em 2026-07-29), formalizados como referência para manter consistência em novas telas. Não é um redesign — é o retrato do que já está construído, com notas de onde a skill `ui-ux-pro-max` valida essas escolhas contra boas práticas e onde há inconsistências conhecidas a corrigir no futuro.

## 1. Cor

### 1.1 Marca (verde institucional)

| Token informal | Hex | Uso |
|---|---|---|
| Verde primário | `#297B49` | Bordas/ícones ativos, foco de inputs, botões primários, popovers ativos |
| Verde escuro (texto sobre fundo claro) | `#006426` | Texto de destaque, ícones em badges, títulos de seção com ênfase |
| Verde claro (fundo de badge) | `#E4F1E8` | Fundo de badges/pills "ativo" ou "classe A" |
| Verde muito claro (fundo de card ativo) | `#F7FBF8` | Fundo de controles quando o filtro está selecionado |
| Verde claro dark-mode | `#7DD3A2` | Equivalente ao `#006426` em tema escuro (texto/ícone) |
| Cinza-verde (borda neutra de card) | `#D0D9D6` | Borda padrão de cards/seções em tema claro |
| Cinza claro (fundo de badge de ícone) | `#F0F0F0` | Fundo do quadrado de ícone nos cabeçalhos de filtro |

**Gap conhecido:** essas cores estão hardcoded como hex inline (`text-[#297B49]`, `border-[#D0D9D6]` etc.) em vez de ligadas às CSS variables do tema shadcn (`--color-primary` etc., hoje em escala de cinza/oklch, não usadas pela marca). Funciona, mas significa que trocar a cor da marca exigiria find-and-replace em vez de editar uma variável. Vale um token dedicado (`--color-brand-primary: #297B49`) numa limpeza futura — não é bloqueante.

### 1.2 Neutros (slate) — light/dark

Padrão observado em ~100% dos componentes com dark mode:

| Camada | Light | Dark |
|---|---|---|
| Fundo de card/seção | `bg-white` | `dark:bg-slate-950` |
| Fundo de input/select/popover | `bg-white` | `dark:bg-slate-900` |
| Fundo de hover/badge secundário | `bg-slate-50`/`bg-slate-100` | `dark:bg-slate-800` |
| Borda de card/seção | `border-[#D0D9D6]` ou `border-slate-200` | `dark:border-slate-800` |
| Borda de input/popover | `border-slate-200` | `dark:border-slate-700` |
| Texto principal | `text-slate-900` | `dark:text-slate-100` |
| Texto secundário/label | `text-slate-700`/`text-slate-600` | `dark:text-slate-200`/`dark:text-slate-300` |
| Texto muted/placeholder | `text-slate-500` | `dark:text-slate-400` |

Essa tabela é a regra prática: **card = 950/800, controle = 900/700, texto = 900→100 / 700→200 / 500→400** conforme a hierarquia.

### 1.3 Cores de gráfico (charts)

Usadas em `dashboard-sales-chart.tsx` — paleta categórica sem relação direta com a marca (correto, gráficos não devem depender só da cor da marca): `#0B70F5`, `#F50BB7`, `#7832CD`, `#00AFBE`, `#EFAF14`, `#94A3B8`, `#CBD5E1`. Validação `ui-ux-pro-max`: ok para gráficos categóricos, mas confirmar que pares adjacentes têm contraste ≥3:1 entre si ao adicionar novas séries (regra `contrast-data`).

## 2. Border Radius

Escala real observada, do menor pro maior (esta é a resposta direta ao "as bordas sempre serão round-x" — sim, e aqui está a escala):

| Classe | Uso |
|---|---|
| `rounded-lg` | Botões (`Button` do shadcn), ícones pequenos, chips de página |
| `rounded-xl` | Inputs, selects, badges de página de paginação, itens de popover, botões secundários |
| `rounded-2xl` | Cards e seções (o container "grande" de qualquer bloco — filtros, tabelas, KPIs, modais) |
| `rounded-full` | Avatares, badges de contagem (pill), botão de fechar |

**Regra prática:** todo *container de nível de página* (uma seção com borda própria) é `rounded-2xl`. Todo *controle dentro* de um container (input, botão, badge) é `rounded-xl` ou `rounded-lg`. Nunca se mistura `rounded-md`/`rounded-sm`/`rounded-3xl` — não aparecem no código (fora dos componentes shadcn genéricos não usados diretamente).

## 3. Tipografia

- **Fonte:** Geist Variable (`@fontsource-variable/geist`), única família usada no app inteiro.
- **Escala de tamanho** (do mais usado ao menos usado): `text-sm` (padrão de corpo/tabela) → `text-xs` (labels uppercase, badges, texto auxiliar) → `text-base` → `text-lg` → `text-xl`/`text-2xl`/`text-3xl` (só títulos de KPI/hero, raro).
- **Peso:** `font-medium` para labels/botões, `font-semibold` para títulos de card e cabeçalhos de tabela, `font-bold` só em números de destaque (KPIs).
- **Labels de campo:** sempre `text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400`, posicionados acima do controle.

Validação `ui-ux-pro-max`: escala consistente (`font-scale`), mas `text-[10px]` para labels está abaixo do mínimo de 12px recomendado pra texto de corpo — aceitável aqui porque é um *label* curto e maiúsculo, não corpo de leitura, mas não deve ser usado pra texto informativo mais longo.

## 4. Espaçamento

Sem uma escala nomeada formalmente, mas o padrão real é consistente com ritmo de 4px (escala padrão do Tailwind):

- **Padding de card/seção:** `p-4` (filtros) ou `p-5` (tabelas, cards maiores).
- **Gap entre blocos de página:** `space-y-6` (padrão em toda página, ex: filtros → tabela → gráfico).
- **Gap entre itens de uma linha/grupo:** `gap-2` (itens pequenos, ex: botões de paginação) ou `gap-3` (campos de filtro, cards de KPI).
- **Padding interno de botão/badge:** `px-3 py-1.5` a `px-2 py-0.5` dependendo do tamanho.

Validação `ui-ux-pro-max` (`spacing-scale`): ritmo de 4px confirmado, adequado pra um dashboard denso.

## 5. Sombra (elevação)

Uso mínimo e consistente — não é um app com muita profundidade:

- `shadow-sm` — praticamente todo card/seção (`rounded-2xl border ... shadow-sm`). É a sombra "padrão" de qualquer container.
- `shadow-lg` — só em popovers/dropdowns abertos (flutuando sobre o conteúdo).
- `shadow-md`/`shadow-xl` — usos isolados, não são padrão.

**Regra prática:** container estático = `shadow-sm`. Elemento flutuante (popover, dialog) = `shadow-lg`.

## 6. Ícones

- Biblioteca única: **lucide-react** (`"lucide-react"`, 100% dos ícones do app).
- Tamanho padrão: `h-4 w-4` (a maioria) ou `h-3.5 w-3.5` (ícones dentro de badges pequenos/setas de ordenação).
- Ícones de ação sempre acompanhados de texto (nunca só ícone) exceto botões de fechar (`X`) e paginação (`ChevronDown` em selects) — que têm `aria-label`.

## 7. Estados de interação

- **Foco:** inputs/selects usam `focus:border-[#297B49]` (troca de cor de borda, sem ring visível hoje). **Gap conhecido:** não há `focus-visible:ring` consistente em inputs nativos (`<select>`, `<input>`) — só nos componentes shadcn (`Button`, que já tem `focus-visible:ring-3`). Recomendação `ui-ux-pro-max` (`focus-states`): adicionar um ring de foco visível também nos inputs nativos, importante para navegação por teclado.
- **Ativo/selecionado:** troca de classe completa (ex: `defaultControlClass` → `activeControlClass`), mudando borda + fundo + texto — não é só cor, é a combinação borda `#297B49`/40 + fundo `#F7FBF8`.
- **Hover:** `hover:bg-slate-50 dark:hover:bg-slate-800` em controles; `hover:bg-slate-100 dark:hover:bg-slate-800` em linhas de tabela.
- **Transição:** `transition-colors` é o padrão (nunca anima layout/tamanho). Duração explícita raramente setada — usa o default do Tailwind (150ms), que já está dentro da faixa recomendada (`duration-timing`: 150–300ms).
- **Desabilitado:** `disabled:opacity-40` a `disabled:opacity-50` + `disabled:cursor-not-allowed`.

## 8. Padrões de componente (receitas prontas)

### Card/seção de página
```
rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950
```

### Input/select
```
h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
```

### Badge/pill (ativo, ex: contador de filtros, classe A)
```
inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#E4F1E8] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]
```

### Ícone com fundo (cabeçalho de bloco)
```
flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F0F0] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]
```

### Label de campo
```
block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400
```

## 9. Validação e gaps (via `ui-ux-pro-max`)

O que já está alinhado com boas práticas de dashboards B2B densos:
- Paleta com cor de marca + neutros consistentes light/dark (`color-dark-mode`, `dark-mode-pairing`).
- Radius e shadow com escala pequena e repetida, sem valores aleatórios (`elevation-consistent`).
- Ícones de uma única biblioteca, tamanho consistente (`icon-style-consistent`).
- Densidade de espaçamento adequada para telas com muita tabela/KPI.

O que vale corrigir quando houver uma limpeza de UI (não bloqueante, não fizemos agora):
1. Cores da marca hardcoded em hex em vez de CSS variables — dificulta rebrand.
2. Foco de teclado pouco visível em `<input>`/`<select>` nativos (só troca de borda, sem ring).
3. Nenhuma tabela ainda expõe `aria-sort` no cabeçalho ordenável (`sortable-table`) — a tabela de Clientes tem sort visual, mas falta o atributo de acessibilidade.
4. Contraste dos textos `text-slate-400`/`text-slate-500` sobre fundo branco deve ser revalidado se usados como único indicador de estado (ok como texto secundário, não ok como única pista de erro/sucesso).
