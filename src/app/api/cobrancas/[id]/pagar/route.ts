import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cobrancas, emprestimos, fluxoCaixa, credores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const cobrancaId = Number(id);

  const [cob] = await db.select().from(cobrancas).where(eq(cobrancas.id, cobrancaId));
  if (!cob) return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });
  if (cob.status === "pago") return NextResponse.json(cob);

  const dataPagamento = body.dataPagamento || new Date().toISOString().split("T")[0];
  const valorPago = typeof body.valorPago === "number" ? body.valorPago : cob.valor;

  const [updated] = await db
    .update(cobrancas)
    .set({ status: "pago", dataPagamento, valorPago })
    .where(eq(cobrancas.id, cobrancaId))
    .returning();

  // Registra a entrada de juros no livro-caixa.
  const [emp] = await db.select().from(emprestimos).where(eq(emprestimos.id, cob.emprestimoId));
  const [cred] = emp
    ? await db.select().from(credores).where(eq(credores.id, emp.credorId))
    : [];
  await db.insert(fluxoCaixa).values({
    tipo: "entrada",
    valor: valorPago,
    descricao: `Juros ${cob.competencia}${cred ? ` — ${cred.nome}` : ""}`,
    data: dataPagamento,
    categoria: "parcela_recebida",
    emprestimoId: cob.emprestimoId,
    cobrancaId: cob.id,
  });

  // Recalcula agregado do empréstimo a partir do cronograma.
  if (emp) {
    const todas = await db
      .select()
      .from(cobrancas)
      .where(eq(cobrancas.emprestimoId, emp.id));
    const atrasadas = todas.filter((c) => c.status === "atrasado").length;
    const jurosNaoPagos =
      Math.round(todas.filter((c) => c.status !== "pago").reduce((s, c) => s + c.valor, 0) * 100) / 100;
    await db
      .update(emprestimos)
      .set({ mesesInadimplente: atrasadas, jurosNaoPagos })
      .where(eq(emprestimos.id, emp.id));
  }

  return NextResponse.json(updated);
}
