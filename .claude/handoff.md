# Handoff — Federal Credit Pay Dashboard
**Data:** 2026-06-12
**Sessão:** Impeccable `craft overview` + Brand compliance sweep (todas as páginas)

---

## Sessão B — Refino de branding (cookbook `applying-brand-guidelines`)

Usei o **engine `validate_brand.py`** do cookbook (`~/Documents/claude-cookbooks-main/skills/custom_skills/applying-brand-guidelines`) com o brand REAL (Federal Credit Pay, não o demo Acme), estendido com scan de classes Tailwind off-brand. Drivers em `/tmp/fcp_brand_audit.py` e `/tmp/fcp_brand_apply.py`.

- **Auditoria inicial:** 89 utilitários Tailwind hardcoded + 2 hex literais, em 6 páginas (overview/layout/sidebar já estavam limpos da sessão A).
- **Remapeamento → tokens semânticos** em `credores`, `emprestimos`, `fluxo`, `garantias`, `parcelas`, `(auth)/login`:
  - verde→`success`, vermelho→`destructive`, amber→`warning`, azul→`primary`/`accent`, cinza→`muted`/`foreground`. Padrão de status-card: `bg-{token}-muted border-{token}/25`; badge `bg-{token}/10`; ícone `text-{token}`.
  - `fluxo` AreaChart: `#3b82f6`/`#bfdbfe` → `stroke/fill="var(--chart-1)"` + `fillOpacity={0.15}` + `isAnimationActive={false}`.
  - **Pitfall corrigido:** `bg-white` (status `pendente` em parcelas + linhas do fluxo) NÃO era pego pelo scan de famílias e quebrava dark mode (card branco) → trocado por `bg-card`. Lição: scan de cor por família ignora `white/black` — sempre checar `bg-white|bg-black` à parte.
- **Auditoria final:** 0 drift. `tsc` ✓.
- **Verificado no browser** (seed temporário → reset): parcelas (light+dark), fluxo (dark, area chart), emprestimos (light). Status semântico preservado; dark mode agora correto em todas (antes quebrado por cores light hardcoded).
- Lint: restam issues PRÉ-EXISTENTES (`no-unused-vars`, `set-state-in-effect`, `exhaustive-deps`) NÃO relacionados a branding — não tocados.

⚠️ `src/app/(dashboard)/` é **untracked no git** (nunca commitado). `git diff` não mostra essas páginas — verificar estado direto no disco.

---

## Sessão C — Sidebar responsivo (rail desktop + drawer mobile)

`adapt` do impeccable. Refatorado `components/dashboard/app-sidebar.tsx`:
- **`SidebarBody({onNavigate})`** — conteúdo único (logo + nav + Sair) compartilhado (DRY). `BrandLockup` extraído.
- **`AppSidebar`** = `<aside hidden md:flex w-56>` (rail desktop, inalterado visualmente).
- **`AppTopbar`** = `<header md:hidden sticky top-0 z-30 h-14>` com hambúrguer + `Sheet side="left"` (drawer w-72) + título da rota atual (ícone + label). Drawer fecha ao tocar item (via `onNavigate`) e no logout. `SheetTitle sr-only "Navegação"` p/ a11y; `showCloseButton={false}` (backdrop/Esc/tap fecham). Tap targets `py-2.5`.
- `layout.tsx`: novo wrapper `<div flex-col>` com `<AppTopbar/>` + `<main>`; padding `p-4 sm:p-6`.
- **Verificado**: mobile 390 (top bar + drawer, light+dark, nav fecha drawer e atualiza título), desktop 1366 (rail intacto, topbar oculto), tablet 820 (rail, sem drawer — boundary md=768 limpo). `tsc`✓ `eslint`✓ (removido `useEffect` de fechar-na-rota p/ não disparar `set-state-in-effect`; cliques já fecham).
- Nota: o círculo "N" flutuante é o **indicador de dev do Next.js**, não shippa.

---

## Sessão D — Reconhecimento da operação do câmbio + migração do modelo

**Contexto de negócio:** operação informal de penhor/agiota sendo profissionalizada como **Factoring**. Modelo: **juros mensais (interest-only), 7%/mês, em aberto, sem prazo fixo**; tomador paga só juros todo mês e devolve principal + 1 mês de juros no fim. **Tomador = nome do bem em garantia** (POLO PRATA, SILVERADO…).

### Análise da planilha `~/Desktop/Doc Cambio/auditoria Cambio.xlsx`
- Aba **CONTABIL** = livro de empréstimos consolidado (fonte de verdade). Aba **MOVIMENTAÇÃO** = livro-caixa (192 lançamentos). Demais abas = cache de plugins.
- **32 empréstimos** (14 Em Aberto · 3 Parcial · 15 Quitado). Principal histórico R$1.952.764 (bate com a linha TOTAL da planilha). Principal vivo líquido R$941.114. Juros/mês carteira viva R$78.065. Juros não pagos (vivos) R$583.205. 16 de 17 vivos em atraso, pior caso 24 meses (BAGRE).
- Scripts de análise: `/tmp/xl_*.py` (venv `/tmp/xlenv`, openpyxl). Exports: `/tmp/loans.json`, `/tmp/movimentacao.json`.

### Decisões (confirmadas pelo usuário)
1. Modelo **só juros mensais** (schema adaptado, modalidade única).
2. Inadimplência: **importar agregado** (mesesInadimplente + jurosNaoPagos como na planilha). Automação de cobrança mês-a-mês = fase seguinte.
3. Escopo: schema + import + adaptar telas.

### Implementado
- **Schema** (`schema.ts`): `emprestimos` redesenhado → `parcelaMensal`, `modalidade`, `dataInicio` (nullable), `valorDevolvido`, `mesesInadimplente`, `jurosNaoPagos`, status `ativo|parcial|quitado`. Removidos numParcelas/valorParcela/valorTotal/dataVencimento/tipoJuros.
  - ⚠️ **`drizzle-kit push` NÃO funciona** (dialect `turso` + DB local `file:./local.db` sem token). Migração aplicada via `@libsql/client` raw DDL. Para mudar schema no futuro: usar client raw (ver git history de `scripts/_migrate_emprestimos.ts`, removido) OU ajustar `drizzle.config.ts` para dialect sqlite local.
- **finance.ts**: `jurosMensal`, `valorADevolver`, `mesesDecorridos`, `STATUS_EMPRESTIMO`. Removidos calcularEmprestimo/gerarParcelas.
- **APIs**: `dashboard/route.ts` (métricas novas — inadimplência medida só sobre carteira VIVA), `emprestimos/route.ts` (POST interest-only). **`api/seed` removida** (obsoleta).
- **Import**: `scripts/import-cambio.ts` (lê /tmp/*.json → 28 credores, 32 empréstimos, 192 lançamentos de caixa). **A base já está populada com a operação real.**
- **Telas adaptadas**: Overview (principal na rua, juros/mês, juros não pagos, devoluções, status Em Aberto/Parcial/Quitado, fluxo juros×desembolsos), Empréstimos (modelo juros mensais + form novo), **Parcelas→Cobranças** (painel de cobrança por empréstimo vivo, ordenado por atraso; nav renomeada "Cobranças"), Fluxo (192 lançamentos reais).
- Verificado no browser (light): overview, empréstimos, cobranças, fluxo — números consistentes entre telas. `tsc`✓ `eslint`✓ (resta `set-state-in-effect` pré-existente).

### Pendente desta fase (próxima conversa)
- **Automação de cobrança mês-a-mês** (cronograma de juros gerado, marcação pago/pendente, avisos automáticos) — era a fase 2 da decisão 2.
- **Quitados com `jurosNaoPagos`>0**: a planilha traz valor histórico em quitados; a tela de Empréstimos mostra fiel (ok), o Overview/Cobranças já excluem quitados da inadimplência.
- Garantias: hoje credor = nome do bem; a aba Garantias está vazia (não importada). Avaliar se vira cadastro de bens.
- Próximo grande passo (pedido do usuário): **desenhar os processos da operação de crédito no modelo Factoring legalizado** (após dashboard 100%).

---

## Sessão E — Automação de cobrança mês-a-mês

Implementado o cronograma mensal de juros (a fase 2 da decisão da Sessão D).

- **Schema:** nova tabela **`cobrancas`** (1 linha = empréstimo × competência YYYY-MM: valor, vencimento, status pendente/pago/atrasado, dataPagamento). Substituiu `parcelas` (removida). `fluxo_caixa.parcela_id` → `cobranca_id`.
- **Engine** `src/lib/cobrancas.ts` `sincronizarCobrancas()`: **lazy sync** (roda no GET `/api/cobrancas`) — gera as competências faltantes desde `dataInicio` até o mês corrente; 1º seed respeita o agregado importado (marca os N=`mesesInadimplente` meses mais recentes como não pagos, resto pago); marca vencidas; **recalcula `mesesInadimplente`/`jurosNaoPagos` do empréstimo a partir do cronograma** (que vira a fonte de verdade).
- **APIs:** `GET /api/cobrancas` (sync + lista joinada), `POST /api/cobrancas/[id]/pagar` (marca pago + lança no fluxo_caixa + recalcula agregado). Rotas `parcelas` removidas.
- **Tela Cobranças:** worklist de parcelas mensais (filtros Em aberto / Vencidas / Pagas / Todas), ordenada por vencimento, botão **Pagar** por parcela. Cards: a cobrar em aberto, vencidas, recebido no mês.
- **Verificado:** 217 cobranças geradas (113 pagas seed, 90 vencidas, 14 a vencer) = R$514.605 em aberto / R$448.790 vencidas. Reconciliação por empréstimo OK (mesesInad = atrasadas no cronograma). Pagar testado E2E (cobrança→pago + lançamento "Juros AAAA-MM — NOME" no caixa). `tsc`✓ `eslint`✓ **`next build` 0 erros**.

### Pitfalls desta fase (importante)
- **FK pendente:** ao dropar `parcelas`, `fluxo_caixa.parcela_id` ficou apontando p/ tabela inexistente → INSERT em fluxo_caixa falhava ("foreign key mismatch"). Corrigido **recriando `fluxo_caixa`** sem `parcela_id` (preservando 192 linhas). Lição: ao dropar tabela, limpar FKs que apontam pra ela.
- **Turbopack cache travado:** após editar imports, o dev server serviu erro stale ("Export parcelas doesn't exist"). Resolvido com **restart do dev + `rm -rf .next`**.
- **Normalização de dados:** empréstimos com `mesesInadimplente` > meses decorridos (ex.: #13 CHACARA SAN LAKE, 18 atraso em empréstimo de 16m) foram normalizados pelo cronograma (cap nos meses reais). 2 empréstimos **sem dataInicio** (CASA RAMIRO, POLO PRATA) não geram cronograma — precisam de data de início p/ entrar nas cobranças.
- **Navegador compartilhado:** o Playwright usa o navegador real do usuário (abas de Facebook/Instagram abertas). Usar **aba nova**, nunca sequestrar a aba dele.

### Pendente / próximos
- Definir `dataInicio` dos 2 empréstimos sem data p/ entrarem no cronograma de cobranças.
- Avisos proativos (e-mail/notificação) de parcela vencendo/vencida — hoje é worklist visual.
- Próximo grande passo (pedido do usuário): **processos da operação no modelo Factoring legalizado**.

---

## Sessão F — Avisos proativos + histórico por empréstimo + lista

Bug de login corrigido antes (botão "Entrar" sem `type="submit"` → base-ui assume `type="button"` e o form nunca submetia). Login: `admin@cambio.com` / `12345`.

1. **Avisos proativos** — `dashboard/route.ts` agora roda `sincronizarCobrancas()` e retorna `parcelasVencidas` e `parcelasVencendo` (7 dias). Overview: **toast** no load (vencidas → error, senão vencendo → warning) + **banner âmbar "A vencer"** (parcelas vencendo em 7 dias) acima das métricas. Badges linkam p/ /parcelas.
2. **Histórico por empréstimo** — nova rota `(dashboard)/emprestimos/[id]/cobrancas/page.tsx`. `GET /api/emprestimos/[id]` agora sincroniza + retorna `{emprestimo, credor, cobrancas}`. Tela: 3 cards (Total pago / Em aberto / Vencidas até hoje), lista mensal decrescente, **linha verde=pago / vermelha=aberto**, botão toggle por mês: [Aberto]→`pagar`, [Pago]→`estornar`. Nova rota `POST /api/cobrancas/[id]/estornar` (volta status, apaga lançamento de caixa, recalcula agregado). Botão **Cobranças** do empréstimo agora abre essa tela (antes ia p/ /parcelas?emp=).
3. **Empréstimos em lista/tabela** — cards → `Table` (Status, Credor, Principal, Juros/mês, A devolver, Juros não pagos, Atraso, Ações). `overflow-x-auto` p/ mobile. Removido componente `Field`.
- **Verificado no browser**: tabela ok; histórico BAGRE (3 cards + lista mensal); toggle pagar→verde + cards recalculam, estornar→volta + remove lançamento (DB confirmado pristino, 0 órfãos); toast + banner "A vencer" no overview. `tsc`✓ `eslint`✓ (só `set-state-in-effect` pré-existente) `next build` 0 erros.
- **Nota de interpretação**: Card 2 do histórico = "Em aberto" (a receber). Se o usuário quis outra métrica em "valores pagos", é rótulo trivial de trocar.

---

## Sessão G — Painel "Empréstimos do mês" na home

- `dashboard/route.ts` retorna `mesAtual` + `cobrancasMes` (cobranças com competência = mês corrente, já com nome do credor).
- Overview: nova seção **"Empréstimos do mês — MMM/AAAA"** (lista acionável) entre métricas e gráficos. Cada linha: credor #id, vencimento, valor, e **botão de status clicável** `[Em aberto]`/`[Pago]` (pendente=âmbar, atrasado=vermelho, pago=verde). Clicar registra pagamento (`/api/cobrancas/[id]/pagar`) ou estorna (`/api/cobrancas/[id]/estornar`) e recarrega o painel.
- Refatorado o fetch do overview em `load(comAviso)`: o toast proativo só dispara no mount (não a cada pagamento).
- **Verificado**: lista com 15 cobranças de Jun/2026; toggle HILUX → Pago e estornar → 0 pagas / 0 lançamentos órfãos (DB pristino). `tsc`✓ `eslint`✓ `next build` 0 erros.
- Obs: screenshots via Playwright deram timeout (dashboard sincroniza a cada GET, fica lento) — validei via DOM/`browser_evaluate` + DB. Possível otimização futura: sincronizar cobranças sob demanda/sob TTL em vez de em todo GET do dashboard.

---

## Sessão H — Re-skin para o design Tallent/RTX

Replicado o design language do `~/Desktop/tallent-intelligence-crm--dashboard-vercel/index.html` (terminal de inteligência dark).

- **Tokens** (`globals.css`): paleta **Tallent** — bg obsidiana `#121317`, surfaces charcoal `#1c1e21`/`#22252a`, border ash `#3b3e45`, **primary spring-green `#a8ff53`** (foreground obsidiana), semânticos (success `#afec73`, red `#f43f5e`, gold `#eccf06`, violet `#9c9af2`), **radius 4px**. Dark-only (`:root` e `.dark` iguais). Body com gradiente radial sutil (violet+spring). Como tudo usa tokens, **re-skin propagou para todo o app sem editar componentes**.
- **Fontes** (`layout.tsx`): **Outfit** (display/headings via `--font-heading` + `h1/h2/h3`), **Inter** (corpo `--font-sans`), **JetBrains Mono** (`--font-mono`, ex.: data da topbar).
- **Shell** (`app-sidebar.tsx` + `layout.tsx`): **topbar full-width persistente** (logo spring-green "F" + nome + **pill ONLINE** com dot pulsante + data mono) acima do conjunto sidebar+main. Sidebar com **labels de seção uppercase** (Visão Geral / Operação / Financeiro) e item ativo com **borda-esquerda spring-green**. Mobile: hambúrguer na topbar abre drawer.
- **Verificado** (browser): overview + empréstimos no tema Tallent. Auditoria cookbook: **0 utilitários Tailwind off-brand** (re-skin 100% via tokens). `tsc`✓ `eslint`✓ `next build` 0 erros.
- Nota: KPI hero numbers ficaram em Inter (não Outfit) — fidelidade menor, fácil de trocar se quiser o número grande em Outfit. Login e demais telas herdam o tema dark automaticamente.

---

## Sessão I — ajustes pós-reskin

- Overview: KPIs movidos para o **topo**; banners [Cobrança]/[A vencer] abaixo deles.
- Badges da página Empréstimos: **Quitado=azul** (novo token `--info` #479dec cosmic-blue), **Em Aberto=verde** (success), **Parcial=amarelo** (warning).
- **Header completo do credor** na tela `/emprestimos/[id]/cobrancas`: card com nome + 4 campos (Valor emprestado, Data de início, Juros, Valor da parcela) + botão **Editar** → `EditEmprestimoDialog` (PUT `/api/emprestimos/[id]`). PUT estendido: aceita valorPrincipal/taxaJuros/dataInicio/parcelaMensal; se data mudar → recria cobranças; se parcela mudar → atualiza valor de todas as competências. `tsc`✓.

---

## Sessão J — sidebar fixa + tabela mensal na cobrança do credor

1. **Sidebar/topbar fixas**: `(dashboard)/layout.tsx` agora `h-screen overflow-hidden`; só o `<main>` rola (`overflow-y-auto`). Resolve a sidebar "andando" no scroll.
2. **`/emprestimos/[id]/cobrancas`**: lista mensal virou **Table** com cabeçalho `[Mês ▼][Ano ▼][Vencimento][Data pagamento][Valor][Status]`. Mês/Ano são dropdowns (Select) que filtram (`mesFiltro`/`anoFiltro`); `anos` derivados das competências; helper `MESES`/`mesNome`. Uma linha por competência. Botão Status mantém pagar/estornar. Removido `compLabel` (não usado).
3. Filtros na tela Empréstimos: combobox de credor **com busca** (Popover+cmdk Command); status segue Select.

`tsc`✓ `eslint`✓ (só `set-state-in-effect` pré-existente). Não rodei build/print nesta sessão (navegador compartilhado trocando de aba); mudanças são JSX/CSS determinísticas.

---

## Sessão K — histórico real de pagamentos por credor (EM ANDAMENTO)

**Tarefa em curso:** registrar, credor por credor (via imagens da planilha de pagamentos), os meses realmente pagos × inadimplentes, com data e valor reais de cada pagamento. O usuário envia 1 imagem por credor.

**Modelo confirmado:** cada pagamento marca o MÊS daquele pagamento como pago; meses sem pagamento entre um e outro = inadimplentes. Ex.: Polo Prata pagou 23/01/2024 e só depois 06/05/2024 → fev/mar/abr 2024 inadimplentes.

**Mecanismo criado — `scripts/set-pagamentos.ts`** (rodar: `set -a; . ./.env.local; set +a; npx tsx scripts/set-pagamentos.ts`):
- Array `CREDORES`: `{ nome, dataInicio, pagos }` onde `pagos: Record<"YYYY-MM", { data: "YYYY-MM-DD", valor: number }>` (data E valor reais por competência).
- Para cada credor: seta `dataInicio`, apaga cobranças antigas, gera competências (dataInicio+1 → hoje via `competenciasAte`), marca pagas as da lista (com data/valor reais) e o resto atrasado/pendente, recalcula `mesesInadimplente`/`jurosNaoPagos`.
- `sincronizarCobrancas()` NÃO sobrescreve (só re-seed se 0 cobranças) → dados manuais preservados.

**Já aplicado:** POLO PRATA (início dez/2023; 30 meses; 19 pagos, 10 inadimplentes + 1 a vencer; fev/2026 pago R$1.000, resto R$1.050; total pago R$19.900). **Pendente:** todos os outros credores (aguardando imagens).

**Mudanças de UI desta leva:**
- Sidebar/topbar fixas (`layout.tsx` `h-screen overflow-hidden`, só `<main>` rola).
- Conta do credor (`/emprestimos/[id]/cobrancas`): tabela mensal com cabeçalho `[Mês ▼][Ano ▼][Vencimento][Data pagamento][Valor][Status]` (Mês/Ano filtram); 1 linha por mês; coluna Valor e card "Total pago" usam `valorPago` (valor real). 4 KPIs: Total pago · Em aberto · Vencidas até hoje · **Meses Inadimplentes** (à direita).
- Header do credor com Editar (valor/juros/data/parcela). Empréstimos: filtros Status (Select) + Credor (combobox com busca); coluna Ações = seletor Finalizado/Reabrir; badges Quitado=azul(`--info`)/Em Aberto=verde/Parcial=amarelo.

**Para retomar:** pedir a próxima imagem de credor → adicionar entrada no array `CREDORES` de `set-pagamentos.ts` (nome exato como no banco, dataInicio = mês anterior ao 1º pagamento, mapa competência→{data,valor}) → rodar o script → conferir. Dev em `localhost:3002`, login `admin@cambio.com` / `12345`.

---

## Estado atual

### Concluído nesta sessão
1. **`overview/page.tsx` reescrita completa** com identidade Federal Credit Pay:
   - `StatCard` segue Number-First Rule: `label (xs muted)` → `value (text-2xl font-bold tracking-tight tabular-nums)` → `sub (xs muted)`; ícone em container `size-9 rounded-lg` com 3 tons (`neutral` = primary/10, `positive` = success/10, `alert` = destructive/10).
   - Card de alerta usa `bg-destructive-muted ring-destructive/25` — **sem stripe lateral**.
   - Banners de topo (atraso = destructive, vencendo 30d = warning): `border-{cor}/25 bg-{cor}-muted rounded-lg p-4`, ícone em container tonal + badge à direita. Sem stripe.
   - Gráficos **theme-aware**: cores via tokens `var(--chart-1/2/3)` (azul/esmeralda/vermelho) em vez de OKLCH literais — trocam automaticamente em dark mode (decisão deliberada, alinhada ao princípio dark-first).
   - Bar chart: `CartesianGrid` sutil, eixos com `--muted-foreground`/`--border`, tooltip custom (`ChartTooltip`) com tokens, `isAnimationActive={false}`.
   - Pie/donut: total centralizado no miolo, legenda lateral com contagem, tooltip custom (`PieTooltip`), `isAnimationActive={false}`.
   - Estados: **skeleton** de loading (`OverviewSkeleton`), **erro** de fetch, **empty states** por gráfico. Zero cor hardcoded.
2. **Bug global de fonte corrigido** (`globals.css`): `--font-sans`/`--font-heading` mapeavam para `var(--font-sans)` (self-reference vazia) → app inteiro renderizava em **Times serif**. Agora apontam para `var(--font-geist)`. Geist passou a renderizar em toda a aplicação (verificado via computed style).
3. **`layout.tsx`**: `bg-gray-50` hardcoded → `bg-background` (quebrava dark mode).

### Verificação (Playwright, dados de teste + reset)
- Light + Dark: ✓ ambos polidos. Bars/donut renderizam, tokens semânticos corretos.
- Desktop 1366 / 1280: ✓ stats 4-up com valores BRL completos, gráficos lado a lado.
- Tablet 820: ✓ stats 2-up, gráficos empilhados (corrigido — antes `md:grid-cols-4` cortava valores e ícone sobrepunha label).
- Grids finais: stats `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`; gráficos `grid lg:grid-cols-2`.
- DB foi semeado temporariamente para verificação e **restaurado para vazio** (`scripts/reset-data.ts`). Seed temporário removido.
- `tsc --noEmit` ✓ · `eslint` ✓ nos arquivos alterados.

---

## Pendente — próximos passos por prioridade

1. ~~[ALTA] Sidebar mobile não colapsa~~ — **FEITO na Sessão C** (rail desktop + drawer mobile, DRY). Próximo opcional: a página de conteúdo em mobile ainda usa `grid-cols-1` p/ stats — ok; revisar densidade tablet se necessário.
2. ~~[MÉDIA] Demais páginas com cores hardcoded~~ — **FEITO na Sessão B** (89 utils + 2 hex → tokens, 0 drift). Próximo nível opcional: `/impeccable polish <page>` para hierarquia/spacing (não só cor) por página.
3. **[BAIXA] Tooltip default do Recharts em `fluxo`** (Saldo Acumulado) ainda é a caixa branca padrão — destoa um pouco no dark. Trocar por tooltip custom com tokens (padrão já existe em `overview/page.tsx`: `ChartTooltip`).
4. **[BAIXA] `--font-mono`** aponta para `var(--font-geist-mono)` que não é carregada (só Geist sans está em `layout.tsx`). Hoje cai no fallback `ui-monospace` (ok). Se quiser mono real, carregar `Geist_Mono` no root layout.
5. **[BAIXA] Lint pré-existente** nas páginas: `no-unused-vars`, `set-state-in-effect`, `exhaustive-deps`. Não é branding; limpar em passe de qualidade à parte.

---

## Referência rápida de tokens (light)

```css
--primary: oklch(0.55 0.24 254)            /* electric blue — ações, nav */
--success: oklch(0.42 0.19 155)            /* emerald — positivo */
--success-muted: oklch(0.96 0.030 155)
--warning: oklch(0.47 0.14 70)             /* amber — aviso */
--warning-muted: oklch(0.97 0.022 70)
--destructive: oklch(0.50 0.22 27)         /* vermelho — alerta */
--destructive-muted: oklch(0.97 0.018 27)
--muted-foreground: oklch(0.44 0.008 254)
--chart-1..3: blue / emerald / red (versões dark mais brilhantes definidas em .dark)
```

Utilities: `text-primary`, `bg-primary/10`, `text-success`, `bg-success/10`, `bg-success-muted`, `text-warning`, `bg-warning-muted`, `text-destructive`, `bg-destructive-muted`. Gráficos: `fill="var(--chart-N)"`.

---

## Stack do projeto
- Next.js 16 App Router, Tailwind v4, shadcn/ui, Recharts, Drizzle + libSQL (Turso/SQLite), better-auth
- **Dev rodando em `http://localhost:3002`** (PID já ativo; porta 3000 é outro projeto — Theracorp). Para semear/resetar DB via tsx: `set -a; . ./.env.local; set +a` antes (tsx não lê `.env.local`).
- Ícones: lucide-react · Fonte: Geist (`next/font/google`, var `--font-geist`)
