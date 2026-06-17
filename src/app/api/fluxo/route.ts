import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fluxoCaixa } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const data = await db.select().from(fluxoCaixa).orderBy(desc(fluxoCaixa.data));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const [row] = await db.insert(fluxoCaixa).values({
    tipo: body.tipo,
    valor: body.valor,
    descricao: body.descricao,
    data: body.data,
    categoria: body.categoria,
    emprestimoId: body.emprestimoId ?? null,
    cobrancaId: body.cobrancaId ?? null,
  }).returning();
  return NextResponse.json(row, { status: 201 });
}
