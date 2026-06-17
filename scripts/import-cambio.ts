/**
 * Importa a operação real da planilha "auditoria Cambio.xlsx" para o dashboard.
 * Fonte: CONTABIL (livro de empréstimos) + MOVIMENTAÇÃO (livro-caixa).
 * Exportados para JSON por /tmp/xl_final.py e /tmp/xl_export_mov.py.
 */
import { readFileSync } from "fs";
import { db } from "../src/lib/db";
import { credores, garantias, emprestimos, cobrancas, fluxoCaixa } from "../src/lib/db/schema";

type Loan = {
  tomador: string;
  data: string | null;
  principal: number;
  taxa: number; // 0.07
  parcela: number;
  devolucoes: number;
  meses_inad: number;
  juros_nao_pagos: number;
  status: string; // Em Aberto | Parcial | Quitado
};
type Mov = {
  tipo: "entrada" | "saida";
  categoria: string;
  valor: number;
  data: string;
  tomador: string;
  descricao: string;
};

const STATUS: Record<string, "ativo" | "parcial" | "quitado"> = {
  "Em Aberto": "ativo",
  Parcial: "parcial",
  Quitado: "quitado",
};

// "BAGRE (10.450,00 USD)" -> { nome: "BAGRE", nota: "10.450,00 USD" }
function parseTomador(raw: string): { nome: string; nota: string | null } {
  const mt = raw.match(/^([^(]+?)\s*\(([^)]*)\)?\s*$/);
  if (mt) return { nome: mt[1].trim(), nota: mt[2].trim() || null };
  return { nome: raw.trim(), nota: null };
}

async function main() {
  const loans: Loan[] = JSON.parse(readFileSync("/tmp/loans.json", "utf8"));
  const movs: Mov[] = JSON.parse(readFileSync("/tmp/movimentacao.json", "utf8"));

  // Limpa operacional (login preservado)
  await db.delete(fluxoCaixa);
  await db.delete(cobrancas);
  await db.delete(emprestimos);
  await db.delete(garantias);
  await db.delete(credores);

  // 1) Credores distintos (identificados pelo bem em garantia)
  const credorId = new Map<string, number>();
  for (const l of loans) {
    const { nome } = parseTomador(l.tomador);
    if (!credorId.has(nome)) {
      const [c] = await db
        .insert(credores)
        .values({ nome, observacoes: "Importado da auditoria do câmbio" })
        .returning();
      credorId.set(nome, c.id);
    }
  }

  // 2) Empréstimos (modelo juros mensais)
  let nEmp = 0;
  for (const l of loans) {
    const { nome, nota } = parseTomador(l.tomador);
    await db.insert(emprestimos).values({
      credorId: credorId.get(nome)!,
      valorPrincipal: l.principal,
      taxaJuros: Math.round(l.taxa * 100 * 100) / 100, // 0.07 -> 7
      parcelaMensal: Math.round(l.parcela * 100) / 100,
      modalidade: "juros_mensais",
      dataInicio: l.data,
      valorDevolvido: Math.round(l.devolucoes * 100) / 100,
      mesesInadimplente: l.meses_inad,
      jurosNaoPagos: Math.round(l.juros_nao_pagos * 100) / 100,
      status: STATUS[l.status] ?? "ativo",
      observacoes: nota ? `Bem: ${l.tomador}` : null,
    });
    nEmp++;
  }

  // 3) Livro-caixa (entradas de juros, devoluções, desembolsos)
  const CHUNK = 100;
  const rows = movs.map((m) => ({
    tipo: m.tipo,
    valor: Math.round(m.valor * 100) / 100,
    descricao: m.descricao || m.categoria,
    data: m.data,
    categoria: m.categoria,
  }));
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.insert(fluxoCaixa).values(rows.slice(i, i + CHUNK));
  }

  console.log(
    `Importado: ${credorId.size} credores, ${nEmp} empréstimos, ${rows.length} lançamentos de caixa.`
  );
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
