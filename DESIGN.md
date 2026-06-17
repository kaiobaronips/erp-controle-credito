---
name: Federal Credit Pay
description: Dashboard operacional de crédito — denso, veloz e semântico.
colors:
  electric-blue: "#0070F3"
  electric-blue-deep: "#005ABF"
  electric-blue-subtle: "#E6F0FF"
  emerald: "#00B074"
  emerald-deep: "#008A5B"
  emerald-subtle: "#E6FAF3"
  destructive: "#CF222E"
  destructive-subtle: "#FFEEF0"
  warning: "#E08000"
  warning-subtle: "#FFF8E6"
  ink-primary-light: "#0D1117"
  ink-secondary-light: "#57606A"
  surface-base-light: "#FFFFFF"
  surface-elevated-light: "#F6F8FF"
  surface-card-light: "#FFFFFF"
  border-light: "#E2E8F0"
  ink-primary-dark: "#F0F6FC"
  ink-secondary-dark: "#8B949E"
  surface-base-dark: "#0D1117"
  surface-elevated-dark: "#161B22"
  surface-card-dark: "#21262D"
  border-dark: "#30363D"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  numeric:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.electric-blue}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.electric-blue-deep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.electric-blue}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  stat-card:
    backgroundColor: "{colors.surface-card-light}"
    textColor: "{colors.ink-primary-light}"
    rounded: "{rounded.lg}"
    padding: "20px"
  badge-active:
    backgroundColor: "{colors.emerald-subtle}"
    textColor: "{colors.emerald-deep}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-overdue:
    backgroundColor: "{colors.destructive-subtle}"
    textColor: "{colors.destructive}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  input:
    backgroundColor: "{colors.surface-base-light}"
    textColor: "{colors.ink-primary-light}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Federal Credit Pay

## 1. Overview

**Creative North Star: "The Electric Ledger"**

Federal Credit Pay é a ferramenta de quem sabe o que está fazendo. Não é um app de consumidor que precisa seduzir — é um instrumento de precisão que precisa performar. O design carrega a seriedade de um livro-caixa financeiro com a energia de uma fintech moderna: azul elétrico como a única cor de ação, verde esmeralda como sinal de saúde financeira, e tudo o mais em neutros controlados que deixam os dados falarem.

O sistema suporta dark mode como modo nativo de alta concentração e light mode como modo funcional para ambientes iluminados. Em ambos os temas, a hierarquia de informação é invariável: dado primário (valores) domina, dado secundário (rótulos) apoia, dado de apoio (timestamps, IDs) recua. O operador vê o que precisa na primeira fixação de olhar, age sem sair do fluxo.

O que este sistema rejeita explicitamente: o visual de SaaS americano genérico (cream background, eyebrow labels, cards idênticos em grid), a planilha disfarçada (sem hierarquia, tudo no mesmo peso), a interface governamental (verde/amarelo institucional, sensação de legado), e o app de banco de varejo (simplificado demais para uso operacional intenso).

**Key Characteristics:**
- Densidade com hierarquia — muito dado sem sobrecarga
- Cor semântica — azul para ações, verde para positivos, vermelho para alertas; nunca decorativo
- Numerais em destaque — valores monetários são o protagonista em cada tela
- Dual-theme sem compromisso — dark e light igualmente polidos
- Zero ornamento — cada pixel justifica sua presença

## 2. Colors: The Electric Palette

Dois acentos com papéis fixos, neutros escuros como base, semântica nunca quebrada.

### Primary
- **Electric Blue** (`#0070F3` / `oklch(0.55 0.24 254)`): Cor de todas as ações, navegação ativa, links, estados de foco, botões primários. Carrega o peso de "faça isso agora". Deve ocupar ≤15% de qualquer tela — a raridade é parte do sinal.
- **Electric Blue Deep** (`#005ABF` / `oklch(0.47 0.22 254)`): Estado hover/pressed do primary. Nunca usado como cor base de surface.
- **Electric Blue Subtle** (`#E6F0FF` / `oklch(0.95 0.03 254)`): Background de estados de foco suave, seleções e highlights em light mode.

### Secondary
- **Emerald** (`#00B074` / `oklch(0.65 0.19 155)`): Exclusivamente para estados financeiros positivos — empréstimo quitado, parcela recebida, credor ativo, fluxo positivo. Nunca usado em navegação, botões de ação ou decoração. O verde significa "dinheiro chegou ou conta está em dia" — e só isso.
- **Emerald Deep** (`#008A5B` / `oklch(0.55 0.17 155)`): Texto de status sobre fundo emerald-subtle; badges de quitado.
- **Emerald Subtle** (`#E6FAF3` / `oklch(0.96 0.03 155)`): Background de badges e chips de estado positivo.

### Tertiary
- **Destructive** (`#CF222E` / `oklch(0.50 0.22 27)`): Parcelas atrasadas, inadimplência, erros críticos, ações destrutivas. Igual semântica ao emerald — nunca decorativo.
- **Warning** (`#E08000` / `oklch(0.63 0.14 70)`): Parcelas vencendo em 30 dias, avisos não críticos. Sempre acompanhado de ícone.

### Neutral

**Light mode:**
- **Ink Primary** (`#0D1117`): Texto principal, valores monetários, headings
- **Ink Secondary** (`#57606A`): Rótulos, labels, texto de apoio
- **Surface Base** (`#FFFFFF`): Background de páginas
- **Surface Elevated** (`#F6F8FF`): Background da sidebar, seções destacadas
- **Surface Card** (`#FFFFFF`): Cards e containers com borda
- **Border** (`#E2E8F0`): Divisores, bordas de card e input

**Dark mode:**
- **Ink Primary** (`#F0F6FC`): Texto principal
- **Ink Secondary** (`#8B949E`): Rótulos e texto de apoio
- **Surface Base** (`#0D1117`): Background de páginas
- **Surface Elevated** (`#161B22`): Sidebar, painéis laterais
- **Surface Card** (`#21262D`): Cards e containers
- **Border** (`#30363D`): Divisores e bordas

### Named Rules
**The Two-Accent Rule.** Blue e emerald são os únicos acentos do sistema. Roxo, amarelo-dourado, cyan, laranja-fintech não existem aqui. Adicionar um terceiro acento quebra a semântica dos dois primeiros.

**The Semantic Lock Rule.** Emerald = positivo financeiro. Blue = ação/navegação. Vermelho = alerta/erro. Se um elemento não se encaixa em nenhuma dessas categorias, é neutro. Sem exceções.

## 3. Typography

**Display / Heading Font:** Geist (já presente como next/font/google)
**Body / Label Font:** Geist — sistema de fonte única em múltiplos pesos

**Character:** Geist é geométrico e técnico sem ser frio — a escolha de um dashboard que leva dados a sério. Pesos extremos (400 e 700) criam contraste de hierarquia sem precisar de uma segunda família. Numerais tabulares nativos alinham valores monetários em colunas sem esforço.

### Hierarchy
- **Numeric** (700, 1.5rem, lh 1.1, ls -0.025em): Exclusivo para valores monetários em stat cards e KPIs. O maior peso, o maior impacto. Nunca usado para texto editorial.
- **Display** (700, clamp(1.75rem → 2.25rem), lh 1.15, ls -0.02em): Títulos de página, heading principal de cada módulo. Um por tela.
- **Headline** (600, 1.25rem, lh 1.3, ls -0.01em): Títulos de card, seções dentro de uma página.
- **Title** (600, 0.9375rem, lh 1.4): Rótulos de tabela, subtítulos de painel, labels de formulário com peso.
- **Body** (400, 0.875rem, lh 1.6): Texto corrido, descrições, observações. Máximo 65ch.
- **Label** (500, 0.75rem, lh 1.4, ls 0.01em): Badges, chips de status, cabeçalhos de coluna de tabela, metadados.

### Named Rules
**The Number-First Rule.** Valores monetários usam o estilo `numeric` (700, 1.5rem). O rótulo acima usa `label`. O sub-valor abaixo usa `label` em ink-secondary. Essa tríade é invariável em stat cards.

**The No-Uppercase Rule.** Nenhum texto em `text-transform: uppercase` exceto labels de status de uma palavra (ATIVO, ATRASADO, QUITADO) com letter-spacing positivo. Sem eyebrow labels genéricos em caps.

## 4. Elevation

Este sistema usa **tonal layering** como estratégia primária de profundidade — não sombras. Em dark mode, surfaces mais claras estão "mais próximas"; em light mode, bordas finas definem containers. Sombras existem apenas como resposta a estado (hover de card ativo, dropdown aberto), nunca como ornamento estático.

### Shadow Vocabulary
- **Shadow Hover** (`0 4px 16px rgba(0, 0, 0, 0.12)` em light / `0 4px 16px rgba(0, 0, 0, 0.4)` em dark): Aplicado a stat cards e linhas de tabela em hover. Sinaliza interatividade.
- **Shadow Dropdown** (`0 8px 24px rgba(0, 0, 0, 0.16)` em light / `0 8px 24px rgba(0, 0, 0, 0.5)` em dark): Menus flutuantes, popovers, datepicker.
- **Shadow Electric Focus** (`0 0 0 3px oklch(0.55 0.24 254 / 0.3)`): Anel de foco de todos os elementos interativos. Azul elétrico com transparência — visível em ambos os temas.

### Named Rules
**The Flat-By-Default Rule.** Cards e containers são planos em repouso. A sombra é uma resposta de estado, não uma decisão de layout. Se um elemento está sombreado sem interação, está errado.

## 5. Components

### Buttons
- **Shape:** Gently curved (8px radius / `rounded.md`)
- **Primary:** Background electric-blue (#0070F3), texto branco, padding 8×16px. Fonte title 600.
- **Hover/Focus:** Background electric-blue-deep (#005ABF), transition `background 150ms ease-out`. Focus ring: shadow-electric-focus.
- **Ghost:** Background transparent, texto electric-blue, borda 1px solid electric-blue-subtle. Hover: background electric-blue-subtle.
- **Destructive:** Background destructive (#CF222E). Usado apenas para ações irreversíveis (delete, cancelar empréstimo).
- **Disabled:** Opacity 0.45, cursor not-allowed. Nunca cor diferente — opacidade é o único sinal de desabilitado.

### Stat Cards
O componente mais importante do sistema. Hierarquia tripartite invariável: rótulo (label, ink-secondary) → valor (numeric, ink-primary) → sub-valor (label, ink-secondary). Ícone à direita em container com background tintado do acento relevante (blue-subtle para neutro, emerald-subtle para positivo, destructive-subtle para alerta).
- **Shape:** Gently curved (12px / `rounded.lg`)
- **Background:** surface-card (ambos os temas)
- **Border:** 1px solid border (ambos os temas)
- **Alert state:** Border e background destructive-subtle; ícone em destructive; valor em destructive.
- **Padding:** 20px (`spacing.lg` menos 4px)

### Status Badges
Pequenos chips semânticos. Sempre ícone + texto, nunca cor sozinha.
- **Ativo/Quitado:** Background emerald-subtle, texto emerald-deep, radius 6px (`rounded.sm`), padding 2×8px
- **Atrasado/Inadimplente:** Background destructive-subtle, texto destructive
- **A Vencer:** Background warning-subtle, texto warning
- **Pendente:** Background neutral, texto ink-secondary

### Inputs / Fields
- **Style:** Background surface-base com borda 1px solid border; radius 8px (`rounded.md`); padding 8×12px
- **Focus:** Border electric-blue 2px + shadow-electric-focus. Transition 120ms ease-out.
- **Error:** Border destructive 2px; mensagem de erro em destructive abaixo do campo com ícone AlertCircle.
- **Disabled:** Opacity 0.5; background surface-elevated (slightly grayed).

### Navigation (App Sidebar)
- **Theme:** Surface-elevated como background (dark: #161B22, light: #F6F8FF). Não mais blue-900 hardcoded.
- **Width:** 224px (14rem) fixo em desktop.
- **Nav items:** Padding 10×12px, radius 8px. Default: ink-secondary. Hover: ink-primary + background neutro levemente tintado. Active: background electric-blue-subtle + texto electric-blue (light mode); background com opacity electric-blue + texto electric-blue (dark mode).
- **Logo area:** Marca em heading 600, acento electric-blue. Sem subtítulo "Casa de Câmbio".

### Data Tables
Componente crítico operacional. Linhas com hover que revela shadow-hover. Cabeçalhos em label 500 ink-secondary uppercase somente se for uma única palavra de status. Valores monetários alinhados à direita com numeric weight. Zebra striping proibido — hover é o único sinal de posição.

### Alert Banners
Dois tipos: crítico (parcelas atrasadas) e aviso (vencendo em 30 dias). Background da cor-subtle correspondente + borda 1px na cor sólida + ícone 18px + texto body + badge à direita. Nunca border-left stripe isolado.

## 6. Do's and Don'ts

### Do:
- **Do** usar electric-blue exclusivamente para ações navegáveis e interativas — botões primários, links, nav ativo, estados de foco.
- **Do** usar emerald exclusivamente para estados financeiros positivos — quitado, recebido, ativo. Se não é um estado positivo financeiro, não é verde.
- **Do** apresentar valores monetários com o estilo `numeric` (700, 1.5rem) — o número é o protagonista de cada stat card.
- **Do** acompanhar toda cor semântica de um ícone ou rótulo textual — cores nunca são o único canal de informação (acessibilidade WCAG AA).
- **Do** usar `prefers-reduced-motion: reduce` em toda transição — substitua por crossfade instantâneo.
- **Do** manter foco visível em todos os elementos interativos com shadow-electric-focus — operadores usam teclado em workflows repetitivos.
- **Do** usar tonal layering para profundidade: surfaces mais claras em dark mode estão "mais próximas"; bordas finas em light mode definem containers.
- **Do** deixar Geist trabalhar em pesos extremos (400 e 700) para criar hierarquia — não invente uma segunda família tipográfica.

### Don't:
- **Don't** usar cream, sand, bege ou qualquer neutro warm-tinted como background — é o AI default de 2026 e contradiz a identidade "fintech moderna" do produto.
- **Don't** colocar eyebrow labels em uppercase acima de seções (OVERVIEW, CREDORES, PARCELAS como kickers decorativos) — este sistema não tem eyebrows, tem headings diretos.
- **Don't** usar emerald como cor de botão ou navegação — verde = positivo financeiro e nada mais. Botões que usam verde confundem a semântica do sistema.
- **Don't** criar cards com border-left colorido como acento de status — use background-subtle da cor semântica + borda completa ou borda superior.
- **Don't** usar gradient text (`background-clip: text`) em nenhum contexto — valores monetários em gradiente parecem dashboard de crypto de 2021.
- **Don't** repetir cards idênticos em grid sem hierarquia visual — stat cards têm tamanhos relativos baseados na importância do dado, não todos iguais.
- **Don't** usar sombra estática em repouso — sombras são resposta a estado (hover, dropdown aberto), nunca decoração fixa.
- **Don't** introduzir um terceiro acento (roxo, amarelo-ouro, cyan) — the Two-Accent Rule é inviolável.
- **Don't** usar `border-left` maior que 1px como acento colorido em alerts, callouts ou cards de status — use background tintado + borda completa.
