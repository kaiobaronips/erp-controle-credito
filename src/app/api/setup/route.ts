import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { timingSafeEqual } from "crypto";

export async function POST(req: NextRequest) {
  const setupToken = process.env.SETUP_TOKEN;
  if (!setupToken) {
    return NextResponse.json({ error: "SETUP_TOKEN não configurado" }, { status: 403 });
  }

  const authHeader = req.headers.get("x-setup-token") ?? "";
  const tokenBuf = Buffer.from(setupToken);
  const inputBuf = Buffer.alloc(tokenBuf.length);
  Buffer.from(authHeader).copy(inputBuf);
  const valid = authHeader.length === setupToken.length &&
    timingSafeEqual(tokenBuf, inputBuf);

  if (!valid) {
    return NextResponse.json({ error: "Token inválido" }, { status: 403 });
  }

  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Setup já foi realizado" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password } = body;
  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email e password são obrigatórios" }, { status: 400 });
  }

  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password } });
    return NextResponse.json({ ok: true, user: result?.user });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro ao criar usuário";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
