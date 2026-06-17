import { sql } from "drizzle-orm";
import { integer, real, text, sqliteTable } from "drizzle-orm/sqlite-core";

export const credores = sqliteTable("credores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  cpfCnpj: text("cpf_cnpj"),
  email: text("email"),
  telefone: text("telefone"),
  endereco: text("endereco"),
  observacoes: text("observacoes"),
  statusManual: text("status_manual"), // inativo | null (ativo/finalizado são automáticos)
  statusObservacao: text("status_observacao"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const garantias = sqliteTable("garantias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tipo: text("tipo").notNull(), // imovel | veiculo | titulo | outro
  descricao: text("descricao").notNull(),
  valorAvaliado: real("valor_avaliado"),
  documentoRef: text("documento_ref"),
  credorId: integer("credor_id").references(() => credores.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Modelo da operação: empréstimo com juros mensais (interest-only), em aberto.
// O tomador paga os juros todo mês (parcelaMensal) e devolve o principal quando
// quiser (principal + 1 mês de juros). Sem prazo fixo / sem parcelas amortizadas.
export const emprestimos = sqliteTable("emprestimos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  credorId: integer("credor_id").notNull().references(() => credores.id),
  garantiaId: integer("garantia_id").references(() => garantias.id),
  valorPrincipal: real("valor_principal").notNull(), // capital emprestado
  taxaJuros: real("taxa_juros").notNull().default(7), // % ao mês
  parcelaMensal: real("parcela_mensal").notNull(), // juros/mês = principal * taxa/100
  modalidade: text("modalidade").notNull().default("juros_mensais"),
  dataInicio: text("data_inicio"), // pode ser null (registros antigos sem data)
  valorDevolvido: real("valor_devolvido").notNull().default(0), // DEVOLUÇÕES recebidas
  mesesInadimplente: integer("meses_inadimplente").notNull().default(0),
  jurosNaoPagos: real("juros_nao_pagos").notNull().default(0), // juros acumulados em aberto
  status: text("status").notNull().default("ativo"), // ativo | quitado | parcial
  observacoes: text("observacoes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Cobrança mensal de juros — 1 linha por empréstimo por competência (mês).
// Gerada automaticamente a partir da data de início do empréstimo.
export const cobrancas = sqliteTable("cobrancas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  emprestimoId: integer("emprestimo_id").notNull().references(() => emprestimos.id),
  competencia: text("competencia").notNull(), // "YYYY-MM"
  valor: real("valor").notNull(), // juros do mês = parcelaMensal
  vencimento: text("vencimento").notNull(), // "YYYY-MM-DD"
  status: text("status").notNull().default("pendente"), // pendente | pago | atrasado
  dataPagamento: text("data_pagamento"),
  valorPago: real("valor_pago"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const fluxoCaixa = sqliteTable("fluxo_caixa", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tipo: text("tipo").notNull(), // entrada | saida
  valor: real("valor").notNull(),
  descricao: text("descricao").notNull(),
  data: text("data").notNull(),
  categoria: text("categoria"), // emprestimo_concedido | parcela_recebida | juros | taxa | outro
  emprestimoId: integer("emprestimo_id").references(() => emprestimos.id),
  cobrancaId: integer("cobranca_id").references(() => cobrancas.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  image: text("image"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: text("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: text("access_token_expires_at"),
  refreshTokenExpiresAt: text("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export type Credor = typeof credores.$inferSelect;
export type InsertCredor = typeof credores.$inferInsert;
export type Garantia = typeof garantias.$inferSelect;
export type InsertGarantia = typeof garantias.$inferInsert;
export type Emprestimo = typeof emprestimos.$inferSelect;
export type InsertEmprestimo = typeof emprestimos.$inferInsert;
export type Cobranca = typeof cobrancas.$inferSelect;
export type InsertCobranca = typeof cobrancas.$inferInsert;
export type FluxoCaixa = typeof fluxoCaixa.$inferSelect;
export type InsertFluxoCaixa = typeof fluxoCaixa.$inferInsert;
