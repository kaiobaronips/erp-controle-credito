import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emprestimos, fluxoCaixa, credores, garantias } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { jurosMensal } from "@/lib/finance";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const data = await db
    .select({ emprestimo: emprestimos, credor: credores, garantia: garantias })
    .from(emprestimos)
    .leftJoin(credores, eq(emprestimos.credorId, credores.id))
    .leftJoin(garantias, eq(emprestimos.garantiaId, garantias.id))
    .orderBy(emprestimos.dataInicio);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const taxa = body.taxaJuros ?? 7;
  const parcelaMensal = jurosMensal(body.valorPrincipal, taxa);

  const [emp] = await db
    .insert(emprestimos)
    .values({
      credorId: body.credorId,
      garantiaId: body.garantiaId || null,
      valorPrincipal: body.valorPrincipal,
      taxaJuros: taxa,
      parcelaMensal,
      modalidade: "juros_mensais",
      dataInicio: body.dataInicio || null,
      status: "ativo",
      observacoes: body.observacoes || null,
    })
    .returning();

  // Registra a saída de caixa (capital emprestado) na data de início.
  if (body.dataInicio) {
    await db.insert(fluxoCaixa).values({
      tipo: "saida",
      valor: body.valorPrincipal,
      descricao: `Empréstimo #${emp.id} concedido`,
      data: body.dataInicio,
      categoria: "emprestimo_concedido",
      emprestimoId: emp.id,
    });
  }

  return NextResponse.json(emp, { status: 201 });
}
