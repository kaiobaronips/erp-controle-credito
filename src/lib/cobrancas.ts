import { db } from "@/lib/db";
import { emprestimos, cobrancas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { competenciasAte } from "@/lib/finance";

const hojeISO = () => new Date().toISOString().split("T")[0];

/**
 * Sincroniza o cronograma de cobranças mensais (juros) de toda a carteira viva.
 * Idempotente: gera as competências faltantes desde a data de início até o mês
 * corrente e atualiza o status (pago/atrasado/pendente). No 1º seed de um
 * empréstimo importado, respeita o agregado da planilha (mesesInadimplente):
 * marca as N competências mais recentes como não pagas e o restante como pago.
 * Por fim, recalcula mesesInadimplente e jurosNaoPagos do empréstimo a partir
 * do cronograma — que passa a ser a fonte de verdade.
 */
export async function sincronizarCobrancas() {
  const hoje = hojeISO();
  const loans = await db.select().from(emprestimos);

  for (const e of loans) {
    const vivo = e.status === "ativo" || e.status === "parcial";
    if (!vivo || !e.dataInicio) continue;

    const esperadas = competenciasAte(e.dataInicio, hoje);
    if (esperadas.length === 0) continue;

    const existentes = await db
      .select()
      .from(cobrancas)
      .where(eq(cobrancas.emprestimoId, e.id));
    const porComp = new Map(existentes.map((c) => [c.competencia, c]));

    const primeiroSeed = existentes.length === 0;
    // No 1º seed, quantos meses ficam EM ABERTO (do fim para trás).
    const naoPagas = primeiroSeed
      ? Math.min(e.mesesInadimplente, esperadas.length)
      : 0;
    const corteSeed = esperadas.length - naoPagas; // índices < corte = pagos

    const inserir: (typeof cobrancas.$inferInsert)[] = [];
    esperadas.forEach((comp, i) => {
      if (porComp.has(comp.competencia)) return;
      const pagoNoSeed = primeiroSeed && i < corteSeed;
      const vencido = comp.vencimento < hoje;
      inserir.push({
        emprestimoId: e.id,
        competencia: comp.competencia,
        valor: e.parcelaMensal,
        vencimento: comp.vencimento,
        status: pagoNoSeed ? "pago" : vencido ? "atrasado" : "pendente",
        dataPagamento: pagoNoSeed ? comp.vencimento : null,
        valorPago: pagoNoSeed ? e.parcelaMensal : null,
      });
    });
    if (inserir.length) await db.insert(cobrancas).values(inserir);

    // Reavalia pendentes que viraram atrasadas (passagem de mês).
    for (const c of existentes) {
      if (c.status === "pendente" && c.vencimento < hoje) {
        await db.update(cobrancas).set({ status: "atrasado" }).where(eq(cobrancas.id, c.id));
      }
    }

    // Recalcula agregado do empréstimo a partir do cronograma.
    const todas = await db
      .select()
      .from(cobrancas)
      .where(eq(cobrancas.emprestimoId, e.id));
    const abertas = todas.filter((c) => c.status !== "pago");
    const atrasadas = todas.filter((c) => c.status === "atrasado").length;
    const jurosNaoPagos = Math.round(abertas.reduce((s, c) => s + c.valor, 0) * 100) / 100;
    if (e.mesesInadimplente !== atrasadas || e.jurosNaoPagos !== jurosNaoPagos) {
      await db
        .update(emprestimos)
        .set({ mesesInadimplente: atrasadas, jurosNaoPagos })
        .where(eq(emprestimos.id, e.id));
    }
  }
}
