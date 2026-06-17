import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cobrancas, emprestimos, fluxoCaixa } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

const hojeISO = () => new Date().toISOString().split("T")[0];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const cobrancaId = Number(id);

  const [cob] = await db.select().from(cobrancas).where(eq(cobrancas.id, cobrancaId));
  if (!cob) return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });
  if (cob.status !== "pago") return NextResponse.json(cob);

  const novoStatus = cob.vencimento < hojeISO() ? "atrasado" : "pendente";
  const [updated] = await db
    .update(cobrancas)
    .set({ status: novoStatus, dataPagamento: null, valorPago: null })
    .where(eq(cobrancas.id, cobrancaId))
    .returning();

  // Remove o lançamento de caixa gerado pelo pagamento.
  await db
    .delete(fluxoCaixa)
    .where(and(eq(fluxoCaixa.cobrancaId, cobrancaId), eq(fluxoCaixa.tipo, "entrada")));

  // Recalcula agregado do empréstimo.
  const todas = await db
    .select()
    .from(cobrancas)
    .where(eq(cobrancas.emprestimoId, cob.emprestimoId));
  const atrasadas = todas.filter((c) => c.status === "atrasado").length;
  const jurosNaoPagos =
    Math.round(todas.filter((c) => c.status !== "pago").reduce((s, c) => s + c.valor, 0) * 100) /
    100;
  await db
    .update(emprestimos)
    .set({ mesesInadimplente: atrasadas, jurosNaoPagos })
    .where(eq(emprestimos.id, cob.emprestimoId));

  return NextResponse.json(updated);
}
