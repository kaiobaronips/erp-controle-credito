import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

// Em dev o servidor pode subir em qualquer porta livre; em produção use
// BETTER_AUTH_URL / NEXT_PUBLIC_APP_URL com o domínio real.
//
// O projeto responde por mais de um domínio .vercel.app (cash-* é o oficial,
// erp-* continua como apelido). Better Auth rejeita com INVALID_ORIGIN
// qualquer origem fora desta lista, então todo domínio que serve o app
// precisa estar aqui — use AUTH_EXTRA_ORIGINS (separado por vírgula) para os
// demais. VERCEL_PROJECT_PRODUCTION_URL entra sozinho como rede de segurança
// caso um novo domínio de produção seja adicionado sem atualizar as envs.
const extraOrigins = (process.env.AUTH_EXTRA_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

const trustedOrigins = [
  ...new Set(
    [
      process.env.BETTER_AUTH_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      vercelProductionUrl,
      ...extraOrigins,
      // Portas locais só em dev (o dev server escolhe a primeira livre)
      ...(process.env.NODE_ENV !== "production"
        ? Array.from({ length: 11 }, (_, i) => `http://localhost:${3000 + i}`)
        : []),
    ].filter(Boolean) as string[]
  ),
];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  // Dashboard de admin único. A criação de conta só pode acontecer pela rota
  // `/api/setup` (token-gated) e apenas enquanto não houver nenhum usuário.
  // Este hook fecha o endpoint público `POST /api/auth/sign-up/email`: assim
  // que existe 1 usuário, qualquer novo sign-up (público ou não) é rejeitado.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const [existing] = await db.select().from(schema.users).limit(1);
          if (existing) {
            throw new APIError("FORBIDDEN", {
              message: "Cadastro desabilitado: já existe um usuário.",
            });
          }
          return { data: user };
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
});
