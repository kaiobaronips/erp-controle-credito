import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

// Em dev o servidor pode subir em qualquer porta livre; em produção use
// BETTER_AUTH_URL / NEXT_PUBLIC_APP_URL com o domínio real.
const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  // Portas locais só em dev (o dev server escolhe a primeira livre)
  ...(process.env.NODE_ENV !== "production"
    ? Array.from({ length: 11 }, (_, i) => `http://localhost:${3000 + i}`)
    : []),
].filter(Boolean) as string[];

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
