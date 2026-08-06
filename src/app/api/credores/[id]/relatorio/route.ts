import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { credores, emprestimos, garantias, cobrancas, fluxoCaixa } from "@/lib/db/schema";
import { ensureCredoresStatusColumns } from "@/lib/db/ensure-schema";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sincronizarCobrancas } from "@/lib/cobrancas";

/**
 * Dossiê completo de um credor: cadastro + todos os empréstimos, cada um com
 * sua garantia, o cronograma mensal de juros e as devoluções de principal.
 * Alimenta o PDF consolidado gerado na tela de cobranças.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  await ensureCredoresStatusColumns();

  const credorId = Number((await params).id);

  // O cronograma precisa estar materializado até hoje antes de virar relatório.
  await sincronizarCobrancas();

  const [credor] = await db.select().from(credores).where(eq(credores.id, credorId));
  if (!credor) return NextResponse.json({ error: "Credor não encontrado" }, { status: 404 });

  const loans = await db
    .select({ emprestimo: emprestimos, garantia: garantias })
    .from(emprestimos)
    .leftJoin(garantias, eq(emprestimos.garantiaId, garantias.id))
    .where(eq(emprestimos.credorId, credorId))
    .orderBy(emprestimos.id);

  const ids = loans.map((l) => l.emprestimo.id);

  // Duas queries para a carteira toda em vez de duas por empréstimo.
  const todasCobrancas = ids.length
    ? await db
        .select()
        .from(cobrancas)
        .where(inArray(cobrancas.emprestimoId, ids))
        .orderBy(cobrancas.competencia)
    : [];
  const todasDevolucoes = ids.length
    ? await db
        .select()
        .from(fluxoCaixa)
        .where(
          and(
            inArray(fluxoCaixa.emprestimoId, ids),
            eq(fluxoCaixa.categoria, "devolucao")
          )
        )
        .orderBy(fluxoCaixa.data)
    : [];

  return NextResponse.json({
    credor,
    emprestimos: loans.map(({ emprestimo, garantia }) => ({
      emprestimo,
      garantia,
      cobrancas: todasCobrancas.filter((c) => c.emprestimoId === emprestimo.id),
      devolucoes: todasDevolucoes.filter((d) => d.emprestimoId === emprestimo.id),
    })),
  });
}
