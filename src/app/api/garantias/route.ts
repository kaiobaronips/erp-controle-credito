import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { garantias, credores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const data = await db
    .select({ garantia: garantias, credor: credores })
    .from(garantias)
    .leftJoin(credores, eq(garantias.credorId, credores.id));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const [row] = await db.insert(garantias).values({
    tipo: body.tipo,
    descricao: body.descricao,
    valorAvaliado: body.valorAvaliado ?? null,
    documentoRef: body.documentoRef ?? null,
    credorId: body.credorId ?? null,
  }).returning();
  return NextResponse.json(row, { status: 201 });
}
