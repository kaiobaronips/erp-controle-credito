import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { garantias } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const [row] = await db.update(garantias).set({
    tipo: body.tipo,
    descricao: body.descricao,
    valorAvaliado: body.valorAvaliado ?? null,
    documentoRef: body.documentoRef ?? null,
    credorId: body.credorId ?? null,
  }).where(eq(garantias.id, Number(id))).returning();
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  await db.delete(garantias).where(eq(garantias.id, Number(id)));
  return NextResponse.json({ ok: true });
}
