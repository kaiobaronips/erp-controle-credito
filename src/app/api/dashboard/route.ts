import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emprestimos, credores, fluxoCaixa, cobrancas } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { sincronizarCobrancas } from "@/lib/cobrancas";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const hoje = new Date().toISOString().split("T")[0];
  const em7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  // Mantém o cronograma de cobranças sempre atualizado (gera o mês corrente).
  await sincronizarCobrancas();

  const [allEmprestimos, allFluxo, allCredores, allCobrancas] = await Promise.all([
    db.select().from(emprestimos),
    db.select().from(fluxoCaixa).orderBy(fluxoCaixa.data),
    db.select().from(credores),
    db.select().from(cobrancas),
  ]);

  // Avisos proativos no nível da parcela.
  const vencidas = allCobrancas.filter((c) => c.status === "atrasado");
  const vencendo = allCobrancas.filter(
    (c) => c.status === "pendente" && c.vencimento >= hoje && c.vencimento <= em7
  );
  const parcelasVencidas = {
    qtd: vencidas.length,
    valor: vencidas.reduce((s, c) => s + c.valor, 0),
  };
  const parcelasVencendo = {
    qtd: vencendo.length,
    valor: vencendo.reduce((s, c) => s + c.valor, 0),
  };

  // Carteira viva = empréstimos ainda em aberto ou parcialmente devolvidos.
  const vivos = allEmprestimos.filter(
    (e) => e.status === "ativo" || e.status === "parcial"
  );
  // Inadimplência é sempre medida sobre a carteira viva (quitados não contam).
  const emAtraso = vivos.filter((e) => e.mesesInadimplente > 0);

  // Principal vivo = principal ainda não devolvido.
  const principalVivo = vivos.reduce(
    (s, e) => s + Math.max(0, e.valorPrincipal - e.valorDevolvido),
    0
  );
  const totalEmprestado = allEmprestimos.reduce((s, e) => s + e.valorPrincipal, 0);
  const jurosMesEsperado = vivos.reduce((s, e) => s + e.parcelaMensal, 0);
  const jurosNaoPagos = vivos.reduce((s, e) => s + e.jurosNaoPagos, 0);
  const totalDevolvido = allEmprestimos.reduce((s, e) => s + e.valorDevolvido, 0);
  const jurosRecebidos = allFluxo.filter(
    (f) => f.tipo === "entrada" && f.categoria === "parcela_recebida"
  );
  const jurosEmAberto = allCobrancas.filter((c) => c.status !== "pago");
  const lucroLiquido = jurosRecebidos.reduce((s, f) => s + f.valor, 0);
  const lucroEstimado = lucroLiquido + jurosEmAberto.reduce((s, c) => s + c.valor, 0);

  // Juros efetivamente recebidos no mês corrente (do livro-caixa).
  const recebidoMes = allFluxo
    .filter(
      (f) =>
        f.tipo === "entrada" &&
        f.categoria === "parcela_recebida" &&
        f.data >= inicioMes
    )
    .reduce((s, f) => s + f.valor, 0);

  // Fluxo mensal (últimos 6 meses): juros recebidos x desembolsos.
  const fluxoMensal: Record<string, { entradas: number; saidas: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    fluxoMensal[key] = { entradas: 0, saidas: 0 };
  }
  allFluxo.forEach((f) => {
    const key = f.data.slice(0, 7);
    if (fluxoMensal[key]) {
      if (f.tipo === "entrada") fluxoMensal[key].entradas += f.valor;
      else fluxoMensal[key].saidas += Math.abs(f.valor);
    }
  });

  const statusCount = {
    ativo: allEmprestimos.filter((e) => e.status === "ativo").length,
    parcial: allEmprestimos.filter((e) => e.status === "parcial").length,
    quitado: allEmprestimos.filter((e) => e.status === "quitado").length,
  };

  // Cobranças do mês corrente (parcelas de juros com competência neste mês).
  const mesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const credorById = new Map(allCredores.map((c) => [c.id, c.nome]));
  const credorNomeByEmp = new Map(
    allEmprestimos.map((e) => [e.id, credorById.get(e.credorId) ?? "—"])
  );
  const emprestimoById = new Map(allEmprestimos.map((e) => [e.id, e]));
  const cobrancasMes = allCobrancas
    .filter((c) => c.competencia === mesAtual)
    .map((c) => ({
      id: c.id,
      emprestimoId: c.emprestimoId,
      credor: credorNomeByEmp.get(c.emprestimoId) ?? "—",
      valor: c.valor,
      vencimento: c.vencimento,
      status: c.status,
    }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  const detalhesJurosMesEsperado = vivos
    .map((e) => ({
      emprestimoId: e.id,
      credor: credorNomeByEmp.get(e.id) ?? "—",
      valor: e.parcelaMensal,
      dataInicio: e.dataInicio,
      status: e.status,
    }))
    .sort((a, b) => a.credor.localeCompare(b.credor));

  const detalhesRecebidoMes = allFluxo
    .filter(
      (f) =>
        f.tipo === "entrada" &&
        f.categoria === "parcela_recebida" &&
        f.data >= inicioMes
    )
    .map((f) => {
      const emp = f.emprestimoId ? emprestimoById.get(f.emprestimoId) : null;
      return {
        id: f.id,
        emprestimoId: f.emprestimoId,
        cobrancaId: f.cobrancaId,
        credor: emp ? credorNomeByEmp.get(emp.id) ?? "—" : "—",
        valor: f.valor,
        data: f.data,
        descricao: f.descricao,
      };
    })
    .sort((a, b) => b.data.localeCompare(a.data));

  const detalhesJurosNaoPagos = vivos
    .filter((e) => e.jurosNaoPagos > 0 || e.mesesInadimplente > 0)
    .map((e) => ({
      emprestimoId: e.id,
      credor: credorNomeByEmp.get(e.id) ?? "—",
      valor: e.jurosNaoPagos,
      mesesInadimplente: e.mesesInadimplente,
      status: e.status,
    }))
    .sort((a, b) => b.valor - a.valor);

  const detalhesPrincipalVivo = vivos
    .map((e) => ({
      emprestimoId: e.id,
      credor: credorNomeByEmp.get(e.id) ?? "—",
      valorPrincipal: e.valorPrincipal,
      valorDevolvido: e.valorDevolvido,
      saldoVivo: Math.max(0, e.valorPrincipal - e.valorDevolvido),
      dataInicio: e.dataInicio,
      status: e.status,
    }))
    .sort((a, b) => b.saldoVivo - a.saldoVivo);

  const detalhesTotalEmprestado = allEmprestimos
    .map((e) => ({
      emprestimoId: e.id,
      credor: credorNomeByEmp.get(e.id) ?? "—",
      valorPrincipal: e.valorPrincipal,
      dataInicio: e.dataInicio,
      status: e.status,
    }))
    .sort((a, b) => b.valorPrincipal - a.valorPrincipal);

  // Datas de cada devolução por empréstimo (para cruzar com cobranças pagas no mesmo dia)
  const datasDevolucao = new Map<number, Set<string>>();
  for (const f of allFluxo) {
    if (f.categoria === "devolucao" && f.emprestimoId) {
      if (!datasDevolucao.has(f.emprestimoId)) datasDevolucao.set(f.emprestimoId, new Set());
      datasDevolucao.get(f.emprestimoId)!.add(f.data);
    }
  }

  // Juros pagos exatamente no dia da devolução (juro de encerramento pago junto)
  const juroEncerramento = new Map<number, number>();
  for (const c of allCobrancas) {
    if (c.status === "pago" && c.dataPagamento) {
      const datas = datasDevolucao.get(c.emprestimoId);
      if (datas?.has(c.dataPagamento)) {
        juroEncerramento.set(c.emprestimoId, (juroEncerramento.get(c.emprestimoId) ?? 0) + c.valor);
      }
    }
  }

  const detalhesTotalDevolvido = allEmprestimos
    .filter((e) => e.valorDevolvido > 0)
    .map((e) => ({
      emprestimoId: e.id,
      credor: credorNomeByEmp.get(e.id) ?? "—",
      valorPrincipal: e.valorPrincipal,
      totalRetornado: e.valorDevolvido + (juroEncerramento.get(e.id) ?? 0),
      dataInicio: e.dataInicio,
      status: e.status,
    }))
    .sort((a, b) => b.totalRetornado - a.totalRetornado);

  const lucroPorMes = new Map<string, { mes: string; valor: number; recebimentos: number }>();
  for (const f of jurosRecebidos) {
    const mes = f.data.slice(0, 7);
    const current = lucroPorMes.get(mes) ?? { mes, valor: 0, recebimentos: 0 };
    current.valor += f.valor;
    current.recebimentos += 1;
    lucroPorMes.set(mes, current);
  }
  const detalhesLucroLiquido = Array.from(lucroPorMes.values()).sort((a, b) =>
    b.mes.localeCompare(a.mes)
  );

  const lucroEstimadoPorMes = new Map<string, { mes: string; valor: number; recebimentos: number }>();
  for (const f of jurosRecebidos) {
    const mes = f.data.slice(0, 7);
    const current = lucroEstimadoPorMes.get(mes) ?? { mes, valor: 0, recebimentos: 0 };
    current.valor += f.valor;
    current.recebimentos += 1;
    lucroEstimadoPorMes.set(mes, current);
  }
  for (const c of jurosEmAberto) {
    const mes = c.competencia;
    const current = lucroEstimadoPorMes.get(mes) ?? { mes, valor: 0, recebimentos: 0 };
    current.valor += c.valor;
    current.recebimentos += 1;
    lucroEstimadoPorMes.set(mes, current);
  }
  const detalhesLucroEstimado = Array.from(lucroEstimadoPorMes.values()).sort((a, b) =>
    b.mes.localeCompare(a.mes)
  );

  return NextResponse.json({
    totalEmprestado,
    principalVivo,
    jurosMesEsperado,
    jurosNaoPagos,
    totalDevolvido,
    lucroLiquido,
    lucroEstimado,
    recebidoMes,
    totalCredores: allCredores.length,
    emprestimosVivos: vivos.length,
    emAtraso: emAtraso.length,
    maiorAtraso: vivos.reduce((m, e) => Math.max(m, e.mesesInadimplente), 0),
    parcelasVencidas,
    parcelasVencendo,
    mesAtual,
    cobrancasMes,
    detalhesKpi: {
      jurosMesEsperado: detalhesJurosMesEsperado,
      recebidoMes: detalhesRecebidoMes,
      jurosNaoPagos: detalhesJurosNaoPagos,
      principalVivo: detalhesPrincipalVivo,
      totalEmprestado: detalhesTotalEmprestado,
      totalDevolvido: detalhesTotalDevolvido,
      lucroLiquido: detalhesLucroLiquido,
      lucroEstimado: detalhesLucroEstimado,
    },
    fluxoMensal: Object.entries(fluxoMensal).map(([mes, v]) => ({ mes, ...v })),
    statusCount,
  });
}
