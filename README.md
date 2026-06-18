# ERP I Controle de Crédito

Dashboard de gestão de crédito e empréstimos para operações financeiras internas. Controla credores, empréstimos ativos, cobranças, garantias e fluxo de caixa em um único painel operacional.

🌐 **Produção:** https://erp-controle-credito.vercel.app

> Marca **cash**. Fintech operacional de alta performance — densa em informação, limpa na hierarquia, rápida na resposta. Dark-first.

---

## Modelo de negócio

Operação de crédito com **juros mensais (interest-only)**:

- Taxa padrão de **7% ao mês** sobre o valor emprestado, em aberto, sem prazo fixo.
- O tomador paga **apenas os juros** todo mês e devolve o principal + 1 mês de juros ao encerrar.
- Cada empréstimo é vinculado a uma **garantia** (o bem em penhor — ex.: veículo, imóvel).
- A engine de cobranças gera automaticamente uma parcela de juros por competência (mês), marca vencidas e recalcula o atraso.

Objetivo de longo prazo: profissionalizar a operação no modelo **Factoring** legalizado.

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19 · Tailwind CSS v4 · shadcn |
| Gráficos | Recharts |
| ORM | Drizzle ORM |
| Banco | SQLite via libSQL/Turso (local: arquivo · produção: Turso cloud) |
| Auth | Better Auth (e-mail + senha, single-user) |
| IA | Widget de chat com Claude Haiku 4.5 (API Anthropic) |
| Deploy | Vercel |

> ⚠️ **Atenção:** este Next.js (v16) tem breaking changes em relação a versões anteriores. Consulte os guias em `node_modules/next/dist/docs/` antes de escrever código. Veja `AGENTS.md`.

---

## Como rodar localmente

### 1. Pré-requisitos
- Node.js 20+ (testado em 24/25)
- npm

### 2. Instalar dependências
```bash
npm install
```

### 3. Variáveis de ambiente
Crie um arquivo `.env.local` na raiz:

```bash
# Banco — local usa um arquivo SQLite
TURSO_DATABASE_URL="file:./local.db"
TURSO_AUTH_TOKEN=""              # vazio em local

# Better Auth
BETTER_AUTH_SECRET="<gere uma string aleatória forte>"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Criação do primeiro usuário (rota /api/setup, token-gated)
SETUP_TOKEN="<token de sua escolha>"

# Widget de IA (opcional — sem ela o chat não funciona)
ANTHROPIC_API_KEY="sk-ant-..."
```

### 4. Subir o servidor
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000). Você será redirecionado para `/login`.

### Credenciais de acesso
- **Usuário:** `admin`
- **Senha:** `12345`

> O login aceita o usuário `admin`, que é mapeado internamente para o e-mail real do banco. O cadastro de novos usuários é **bloqueado** depois que o primeiro usuário existe — só a rota `/api/setup` (protegida por `SETUP_TOKEN`) pode criar a conta inicial.

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção |
| `npm run lint` | ESLint |
| `npm run db:generate` | Gera migrations do Drizzle |
| `npm run db:migrate` | Aplica migrations (`tsx src/lib/db/migrate.ts`) |

> **Pitfall:** `drizzle-kit push` não funciona com o setup local (dialect Turso + DB local sem token). Migre o schema via `@libsql/client` com DDL bruto.

---

## Estrutura

```
src/
├── app/
│   ├── (auth)/login/          # Tela de login (marca cash)
│   ├── (dashboard)/           # Painel interno (layout + abas)
│   │   ├── overview/          # Dashboard — KPIs e gráficos
│   │   ├── credores/          # Cadastro de credores
│   │   ├── emprestimos/       # Empréstimos + cobranças por empréstimo
│   │   ├── parcelas/          # Cobranças (worklist global)
│   │   ├── garantias/         # Bens em garantia
│   │   └── fluxo/             # Fluxo de caixa
│   └── api/                   # Route handlers (REST)
│       ├── auth/[...all]/     # Better Auth
│       ├── chat/              # Widget de IA (Claude)
│       ├── setup/             # Criação do usuário inicial (token-gated)
│       ├── dashboard/         # Agregações do overview
│       ├── credores/ emprestimos/ garantias/ fluxo/ cobrancas/
│       └── ...
├── components/
│   ├── dashboard/             # Sidebar, topbar, background, page-header, ai-chat
│   └── ui/                    # Primitivos shadcn
└── lib/
    ├── db/                    # Drizzle (schema, client, migrate)
    ├── auth.ts                # Config Better Auth
    ├── cobrancas.ts           # Engine de geração/sync de cobranças
    └── finance.ts             # Formatação e cálculos financeiros
```

**Tabelas:** `users`, `sessions`, `accounts`, `verifications` (auth) · `credores`, `emprestimos`, `cobrancas`, `garantias`, `fluxo_caixa` (operação).

---

## Deploy (Vercel + Turso)

Produção usa um banco **Turso cloud** (não o arquivo local). O deploy é automático via push no GitHub (`main`), mas há configuração de ambiente obrigatória.

### Variáveis de ambiente na Vercel (Production)
| Variável | Valor |
|----------|-------|
| `TURSO_DATABASE_URL` | URL libsql do banco Turso (`libsql://...turso.io`) |
| `TURSO_AUTH_TOKEN` | Token gerado por `turso db tokens create <db>` |
| `BETTER_AUTH_URL` | `https://erp-controle-credito.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://erp-controle-credito.vercel.app` |
| `BETTER_AUTH_SECRET` | string aleatória forte |
| `SETUP_TOKEN` | token da rota de setup |
| `ANTHROPIC_API_KEY` | chave da API Anthropic (widget de IA) |

> ⚠️ **Pitfall do Vercel CLI:** ao adicionar variáveis em modo não-interativo, use sempre a flag `--value '...' --yes`. O `vercel env add` via stdin/pipe grava valor **vazio**. Variáveis de produção são `sensitive` por padrão (não aparecem no `vercel env pull`).

### Deploy manual
```bash
vercel --prod --yes
# depois apontar o domínio para o novo deployment:
vercel alias set <deployment-url> erp-controle-credito.vercel.app
```

---

## Design

A identidade visual ("brand system") está documentada em `DESIGN.md` e `PRODUCT.md`. Resumo:

- **Tema:** obsidiana (`#121317`) + spring green (`#a8ff53`) como única cor de ação. Dark-first.
- **Tipografia:** Outfit (display) · Inter (corpo) · JetBrains Mono (dados/números).
- **Primitivos compartilhados** (em `globals.css`): `.brand-eyebrow`, `.brand-glass`, `.brand-backdrop` (grid animado + orbs), keyframes de entrada.
- **Mobile-first responsivo:** cada aba tem lista de cards no mobile e tabela no desktop; a página rola por inteiro no mobile (sem listas travadas em contêiner).
- Respeito a `prefers-reduced-motion` e foco visível em todos os interativos (WCAG AA).
