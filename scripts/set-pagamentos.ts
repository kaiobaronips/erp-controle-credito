/**
 * Aplica o histórico REAL de pagamentos de um credor (das planilhas/imagens).
 * Cada competência (YYYY-MM) listada em `pagos` é marcada como paga; as demais
 * (da data de início até hoje) ficam atrasadas/pendentes.
 * Recalcula mesesInadimplente e jurosNaoPagos do empréstimo.
 *
 * Editar o array CREDORES e rodar:
 *   set -a; . ./.env.local; set +a; npx tsx scripts/set-pagamentos.ts
 */
import { db } from "../src/lib/db";
import { credores, emprestimos, cobrancas } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { competenciasAte } from "../src/lib/finance";

const hoje = new Date().toISOString().split("T")[0];

// pagos: competência (YYYY-MM) → { data: data REAL do pagamento, valor: valor REAL pago }
type Pago = { data: string; valor: number };
const CREDORES: { nome: string; dataInicio: string; pagos: Record<string, Pago> }[] = [
  {
    nome: "POLO PRATA",
    // 1ª cobrança = mês seguinte ao início → início em dez/2023 gera jan/2024 em diante
    dataInicio: "2023-12-23",
    pagos: {
      "2024-01": { data: "2024-01-23", valor: 1050 },
      "2024-05": { data: "2024-05-06", valor: 1050 },
      "2024-06": { data: "2024-06-06", valor: 1050 },
      "2024-07": { data: "2024-07-12", valor: 1050 },
      "2024-08": { data: "2024-08-30", valor: 1050 },
      "2024-09": { data: "2024-09-16", valor: 1050 },
      "2024-11": { data: "2024-11-18", valor: 1050 },
      "2024-12": { data: "2024-12-19", valor: 1050 },
      "2025-01": { data: "2025-01-14", valor: 1050 },
      "2025-02": { data: "2025-02-17", valor: 1050 },
      "2025-03": { data: "2025-03-21", valor: 1050 },
      "2025-05": { data: "2025-05-16", valor: 1050 },
      "2025-06": { data: "2025-06-24", valor: 1050 },
      "2025-09": { data: "2025-09-02", valor: 1050 },
      "2025-10": { data: "2025-10-08", valor: 1050 },
      "2025-11": { data: "2025-11-12", valor: 1050 },
      "2026-01": { data: "2026-01-19", valor: 1050 },
      "2026-02": { data: "2026-02-11", valor: 1000 },
      "2026-03": { data: "2026-03-10", valor: 1050 },
    },
  },
];

async function main() {
  for (const cfg of CREDORES) {
    const [cred] = await db.select().from(credores).where(eq(credores.nome, cfg.nome));
    if (!cred) {
      console.log(`✗ credor não encontrado: ${cfg.nome}`);
      continue;
    }
    const emps = await db.select().from(emprestimos).where(eq(emprestimos.credorId, cred.id));
    if (emps.length === 0) {
      console.log(`✗ sem empréstimo para ${cfg.nome}`);
      continue;
    }
    const emp = emps[0]; // Polo Prata tem 1 empréstimo
    await db.update(emprestimos).set({ dataInicio: cfg.dataInicio }).where(eq(emprestimos.id, emp.id));
    await db.delete(cobrancas).where(eq(cobrancas.emprestimoId, emp.id));

    const comps = competenciasAte(cfg.dataInicio, hoje);
    const rows = comps.map((c) => {
      const pg = cfg.pagos[c.competencia]; // { data, valor } real, se houve pagamento
      const pago = !!pg;
      const vencido = c.vencimento < hoje;
      return {
        emprestimoId: emp.id,
        competencia: c.competencia,
        valor: emp.parcelaMensal, // valor DEVIDO (parcela)
        vencimento: c.vencimento,
        status: pago ? "pago" : vencido ? "atrasado" : "pendente",
        dataPagamento: pago ? pg.data : null,
        valorPago: pago ? pg.valor : null, // valor REAL pago
      };
    });
    for (let i = 0; i < rows.length; i += 100) {
      await db.insert(cobrancas).values(rows.slice(i, i + 100));
    }

    const atrasadas = rows.filter((r) => r.status === "atrasado").length;
    const jurosNaoPagos =
      Math.round(rows.filter((r) => r.status !== "pago").reduce((s, r) => s + r.valor, 0) * 100) / 100;
    await db
      .update(emprestimos)
      .set({ mesesInadimplente: atrasadas, jurosNaoPagos, status: emp.status === "quitado" ? "quitado" : "ativo" })
      .where(eq(emprestimos.id, emp.id));

    console.log(
      `✓ ${cfg.nome}: ${comps.length} meses (${rows.filter((r) => r.status === "pago").length} pagos, ${atrasadas} inadimplentes), juros não pagos R$${jurosNaoPagos.toLocaleString("pt-BR")}`
    );
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
