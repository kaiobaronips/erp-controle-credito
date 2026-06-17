import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emprestimos, cobrancas, credores, fluxoCaixa } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sincronizarCobrancas } from "@/lib/cobrancas";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;

  // Garante que o cronograma deste empréstimo está materializado até hoje.
  await sincronizarCobrancas();

  const [emp] = await db
    .select({ emprestimo: emprestimos, credor: credores })
    .from(emprestimos)
    .leftJoin(credores, eq(emprestimos.credorId, credores.id))
    .where(eq(emprestimos.id, Number(id)));
  const cobs = await db
    .select()
    .from(cobrancas)
    .where(eq(cobrancas.emprestimoId, Number(id)))
    .orderBy(cobrancas.competencia);
  // Devoluções de principal (crédito devolvido): lançamentos de caixa do tipo
  // devolução vinculados a este empréstimo. Entram no histórico de pagamentos
  // separados das parcelas de juros.
  const devs = await db
    .select()
    .from(fluxoCaixa)
    .where(
      and(
        eq(fluxoCaixa.emprestimoId, Number(id)),
        eq(fluxoCaixa.categoria, "devolucao")
      )
    )
    .orderBy(fluxoCaixa.data);
  return NextResponse.json({
    emprestimo: emp?.emprestimo ?? null,
    credor: emp?.credor ?? null,
    cobrancas: cobs,
    devolucoes: devs,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const empId = Number((await params).id);
  const body = await req.json();
  const [current] = await db.select().from(emprestimos).where(eq(emprestimos.id, empId));
  if (!current) return NextResponse.json({ error: "Empréstimo não encontrado" }, { status: 404 });

  // Whitelist de campos editáveis.
  const patch: Partial<typeof emprestimos.$inferInsert> = {};
  if (body.status !== undefined) patch.status = body.status;
  if (body.observacoes !== undefined) patch.observacoes = body.observacoes;
  if (body.valorPrincipal !== undefined) patch.valorPrincipal = Number(body.valorPrincipal);
  if (body.taxaJuros !== undefined) patch.taxaJuros = Number(body.taxaJuros);
  if (body.dataInicio !== undefined) patch.dataInicio = body.dataInicio || null;
  if (body.parcelaMensal !== undefined) {
    patch.parcelaMensal = Number(body.parcelaMensal);
  } else if (body.valorPrincipal !== undefined || body.taxaJuros !== undefined) {
    const p = Number(body.valorPrincipal ?? current.valorPrincipal);
    const t = Number(body.taxaJuros ?? current.taxaJuros);
    patch.parcelaMensal = Math.round(p * (t / 100) * 100) / 100;
  }

  const [row] = await db
    .update(emprestimos)
    .set(patch)
    .where(eq(emprestimos.id, empId))
    .returning();

  const dataMudou = body.dataInicio !== undefined && (body.dataInicio || null) !== current.dataInicio;
  if (dataMudou) {
    // Data de início alterada → recria o cronograma de cobranças do zero.
    await db.delete(cobrancas).where(eq(cobrancas.emprestimoId, empId));
  } else if (patch.parcelaMensal !== undefined && patch.parcelaMensal !== current.parcelaMensal) {
    // Parcela corrigida → atualiza o valor de todas as competências existentes.
    await db.update(cobrancas).set({ valor: patch.parcelaMensal }).where(eq(cobrancas.emprestimoId, empId));
  }

  return NextResponse.json(row);
}
