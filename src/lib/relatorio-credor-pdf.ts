import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate } from "@/lib/finance";
import type { Cobranca, Credor, Emprestimo, FluxoCaixa, Garantia } from "@/lib/db/schema";

export interface RelatorioCredor {
  credor: Credor;
  emprestimos: {
    emprestimo: Emprestimo;
    garantia: Garantia | null;
    cobrancas: Cobranca[];
    devolucoes: FluxoCaixa[];
  }[];
}

/** jsPDF ganha `lastAutoTable` em runtime quando o plugin autoTable roda. */
type DocComTabela = jsPDF & { lastAutoTable?: { finalY: number } };

// Paleta da marca cash, adaptada para papel: obsidiana como tinta forte,
// spring green só como filete de destaque (ilegível como texto no branco).
const OBSIDIANA: [number, number, number] = [18, 19, 23];
const SPRING: [number, number, number] = [168, 255, 83];
const GRAFITE: [number, number, number] = [75, 85, 99];
const LINHA: [number, number, number] = [209, 213, 219];
const ZEBRA: [number, number, number] = [246, 247, 249];
const VERDE: [number, number, number] = [21, 128, 61];
const VERMELHO: [number, number, number] = [190, 30, 45];

const MARGEM = 14;
const LARGURA_A4 = 210;
const ALTURA_A4 = 297;
const LARGURA_UTIL = LARGURA_A4 - MARGEM * 2;

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const mesNome = (competencia: string) => MESES[Number(competencia.slice(5, 7)) - 1] ?? "—";

// Mesmos rótulos de STATUS_META em (dashboard)/emprestimos/page.tsx — o
// relatório precisa falar a mesma língua que a tela.
const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  parcial: "Parcial",
  quitado: "Quitado",
  executado: "Executado",
  devedor: "Pendente",
};

const TIPO_GARANTIA: Record<string, string> = {
  imovel: "Imóvel",
  veiculo: "Veículo",
  titulo: "Título",
  outro: "Outro",
};

/** Linha do extrato: parcela de juros ou devolução de principal. */
type Linha = {
  tipo: "Juros mensal" | "Devolução";
  competencia: string;
  vencimento: string | null;
  dataPagamento: string | null;
  valor: number;
  status: "Pago" | "Aberto" | "Devolução";
};

function totaisDoEmprestimo(item: RelatorioCredor["emprestimos"][number]) {
  const pagas = item.cobrancas.filter((c) => c.status === "pago");
  const abertas = item.cobrancas.filter((c) => c.status !== "pago");
  const jurosPagos = pagas.reduce((s, c) => s + (c.valorPago ?? c.valor), 0);
  const creditoDevolvido = item.devolucoes.reduce((s, d) => s + d.valor, 0);
  return {
    pagas,
    abertas,
    jurosPagos,
    creditoDevolvido,
    totalPago: jurosPagos + creditoDevolvido,
    emAberto: abertas.reduce((s, c) => s + c.valor, 0),
    mesesAtraso: item.cobrancas.filter((c) => c.status === "atrasado").length,
  };
}

function linhasDoEmprestimo(item: RelatorioCredor["emprestimos"][number]): Linha[] {
  const linhas: Linha[] = [
    ...item.cobrancas.map((c): Linha => ({
      tipo: "Juros mensal",
      competencia: c.competencia,
      vencimento: c.vencimento,
      dataPagamento: c.status === "pago" ? c.dataPagamento : null,
      valor: c.status === "pago" ? (c.valorPago ?? c.valor) : c.valor,
      status: c.status === "pago" ? "Pago" : "Aberto",
    })),
    ...item.devolucoes.map((d): Linha => ({
      tipo: "Devolução",
      competencia: d.data.slice(0, 7),
      vencimento: null,
      dataPagamento: d.data,
      valor: d.valor,
      status: "Devolução",
    })),
  ];
  const chave = (l: Linha) => l.dataPagamento ?? l.vencimento ?? `${l.competencia}-01`;
  return linhas.sort((a, b) => chave(a).localeCompare(chave(b)));
}

/** Quebra de página manual quando o próximo bloco não cabe no que resta. */
function garantirEspaco(doc: jsPDF, y: number, alturaNecessaria: number): number {
  if (y + alturaNecessaria <= ALTURA_A4 - 20) return y;
  doc.addPage();
  return MARGEM + 8;
}

function tituloSecao(doc: jsPDF, y: number, texto: string): number {
  const yy = garantirEspaco(doc, y, 12);
  doc.setFillColor(...SPRING);
  doc.rect(MARGEM, yy - 3.2, 2.2, 4.4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...OBSIDIANA);
  doc.text(texto.toUpperCase(), MARGEM + 4.5, yy);
  return yy + 4;
}

/**
 * Grade de pares rótulo/valor em N colunas. O valor quebra em até 3 linhas e a
 * altura de cada faixa acompanha a célula mais alta — endereço e descrição de
 * garantia não podem ser truncados num relatório cadastral.
 */
function blocoCampos(
  doc: jsPDF,
  y: number,
  campos: [string, string][],
  colunas = 3
): number {
  const larguraCol = LARGURA_UTIL / colunas;
  const MAX_LINHAS = 3;
  const ALTURA_TEXTO = 3.6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const preparados = campos.map(([rotulo, valor]) => ({
    rotulo,
    linhas: (doc.splitTextToSize(valor || "—", larguraCol - 4) as string[]).slice(0, MAX_LINHAS),
  }));

  const faixas = Math.ceil(preparados.length / colunas);
  const alturas = Array.from({ length: faixas }, (_, f) => {
    const naFaixa = preparados.slice(f * colunas, (f + 1) * colunas);
    const maxLinhas = Math.max(1, ...naFaixa.map((p) => p.linhas.length));
    return 4 + maxLinhas * ALTURA_TEXTO + 2.5;
  });

  const yy = garantirEspaco(doc, y, alturas.reduce((a, b) => a + b, 0) + 2);

  preparados.forEach(({ rotulo, linhas }, i) => {
    const col = i % colunas;
    const faixa = Math.floor(i / colunas);
    const x = MARGEM + col * larguraCol;
    const yFaixa = yy + alturas.slice(0, faixa).reduce((a, b) => a + b, 0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAFITE);
    doc.text(rotulo.toUpperCase(), x, yFaixa);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...OBSIDIANA);
    linhas.forEach((linha, n) => doc.text(linha, x, yFaixa + 4 + n * ALTURA_TEXTO));
  });

  return yy + alturas.reduce((a, b) => a + b, 0);
}

/** Faixa de indicadores financeiros com caixas lado a lado. */
function blocoResumo(doc: jsPDF, y: number, itens: [string, string, boolean?][]): number {
  const gap = 2.5;
  const largura = (LARGURA_UTIL - gap * (itens.length - 1)) / itens.length;
  const altura = 13;
  const yy = garantirEspaco(doc, y, altura + 2);

  itens.forEach(([rotulo, valor, alerta], i) => {
    const x = MARGEM + i * (largura + gap);
    doc.setFillColor(...ZEBRA);
    doc.setDrawColor(...LINHA);
    doc.setLineWidth(0.2);
    doc.rect(x, yy, largura, altura, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...GRAFITE);
    doc.text(rotulo.toUpperCase(), x + 2.5, yy + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...(alerta ? VERMELHO : OBSIDIANA));
    doc.text(valor, x + 2.5, yy + 10);
  });

  return yy + altura;
}

function cabecalho(doc: jsPDF, credor: Credor, qtdEmprestimos: number): number {
  const altura = 26;
  doc.setFillColor(...OBSIDIANA);
  doc.rect(0, 0, LARGURA_A4, altura, "F");
  doc.setFillColor(...SPRING);
  doc.rect(0, altura, LARGURA_A4, 1.2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SPRING);
  doc.text("CASH · ERP CONTROLE DE CRÉDITO", MARGEM, 9);

  // Nome longo encolhe a fonte em vez de ser cortado.
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const larguraNome = 120;
  let tamanhoNome = 16;
  doc.setFontSize(tamanhoNome);
  while (tamanhoNome > 8 && doc.getTextWidth(credor.nome) > larguraNome) {
    tamanhoNome -= 0.5;
    doc.setFontSize(tamanhoNome);
  }
  doc.text(credor.nome, MARGEM, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(190, 195, 205);
  doc.text("Relatório consolidado do credor", MARGEM, 23);

  const geradoEm = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
  const direita = LARGURA_A4 - MARGEM;
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Credor #${credor.id}`, direita, 11, { align: "right" });
  doc.text(
    `${qtdEmprestimos} ${qtdEmprestimos === 1 ? "empréstimo" : "empréstimos"}`,
    direita,
    16,
    { align: "right" }
  );
  doc.setTextColor(190, 195, 205);
  doc.text(`Gerado em ${geradoEm}`, direita, 21, { align: "right" });

  return altura + 10;
}

/** Rodapé com paginação — só depois de todas as páginas existirem. */
function rodape(doc: DocComTabela, credor: Credor) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINHA);
    doc.setLineWidth(0.2);
    doc.line(MARGEM, ALTURA_A4 - 12, LARGURA_A4 - MARGEM, ALTURA_A4 - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAFITE);
    doc.text(`${credor.nome} · documento interno`, MARGEM, ALTURA_A4 - 8);
    doc.text(`Página ${p} de ${total}`, LARGURA_A4 - MARGEM, ALTURA_A4 - 8, { align: "right" });
  }
}

function slug(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function nomeArquivoRelatorio(credor: Credor) {
  return `relatorio-credor-${slug(credor.nome)}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

/**
 * Monta o PDF consolidado: cadastro do credor + todos os empréstimos, cada um
 * com garantia, indicadores e extrato mês a mês. Separado do download para
 * poder ser renderizado fora do browser (testes/scripts).
 */
export function construirRelatorioCredorPDF(dados: RelatorioCredor): jsPDF {
  const { credor, emprestimos } = dados;
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as DocComTabela;

  let y = cabecalho(doc, credor, emprestimos.length);

  // ---- Cadastro do credor ------------------------------------------------
  y = tituloSecao(doc, y, "Dados do credor");
  y = blocoCampos(doc, y, [
    ["Nome", credor.nome],
    ["CPF/CNPJ", credor.cpfCnpj ?? "—"],
    ["Telefone", credor.telefone ?? "—"],
    ["E-mail", credor.email ?? "—"],
    ["Endereço", credor.endereco ?? "—"],
    ["Cadastrado em", credor.createdAt ? credor.createdAt.slice(0, 10).split("-").reverse().join("/") : "—"],
    ["Situação", credor.statusManual === "inativo" ? "Inativo" : "Ativo"],
    ["Motivo da situação", credor.statusObservacao ?? "—"],
    ["Observações", credor.observacoes ?? "—"],
  ]);
  y += 4;

  // ---- Consolidado da carteira ------------------------------------------
  const totais = emprestimos.reduce(
    (acc, item) => {
      const t = totaisDoEmprestimo(item);
      acc.principal += item.emprestimo.valorPrincipal;
      acc.jurosPagos += t.jurosPagos;
      acc.devolvido += t.creditoDevolvido;
      acc.totalPago += t.totalPago;
      acc.emAberto += t.emAberto;
      acc.mesesAtraso += t.mesesAtraso;
      return acc;
    },
    { principal: 0, jurosPagos: 0, devolvido: 0, totalPago: 0, emAberto: 0, mesesAtraso: 0 }
  );

  y = tituloSecao(doc, y, "Resumo geral da carteira");
  y = blocoResumo(doc, y, [
    ["Principal total", formatCurrency(totais.principal)],
    ["Total pago", formatCurrency(totais.totalPago)],
    ["Juros pagos", formatCurrency(totais.jurosPagos)],
    ["Crédito devolvido", formatCurrency(totais.devolvido)],
    ["Em aberto", formatCurrency(totais.emAberto), totais.emAberto > 0],
    ["Meses em atraso", String(totais.mesesAtraso), totais.mesesAtraso > 0],
  ]);
  y += 8;

  // ---- Um bloco por empréstimo ------------------------------------------
  if (emprestimos.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GRAFITE);
    doc.text("Este credor não possui empréstimos registrados.", MARGEM, y);
  }

  emprestimos.forEach((item, indice) => {
    const { emprestimo: e, garantia } = item;
    const t = totaisDoEmprestimo(item);
    const linhas = linhasDoEmprestimo(item);

    // Cabeçalho do contrato só faz sentido junto de pelo menos parte da tabela.
    y = garantirEspaco(doc, y + (indice === 0 ? 0 : 6), 60);
    y = tituloSecao(doc, y, `Empréstimo #${e.id}`);

    y = blocoCampos(doc, y, [
      ["Valor emprestado", formatCurrency(e.valorPrincipal)],
      ["Data de início", e.dataInicio ? formatDate(e.dataInicio) : "—"],
      ["Juros", `${e.taxaJuros}% a.m.`],
      ["Parcela mensal", formatCurrency(e.parcelaMensal)],
      ["Status", STATUS_LABEL[e.status] ?? e.status],
      ["Modalidade", e.modalidade === "juros_mensais" ? "Juros mensais" : e.modalidade],
      [
        "Garantia",
        garantia
          ? `${TIPO_GARANTIA[garantia.tipo] ?? garantia.tipo} — ${garantia.descricao}`
          : "Não vinculada",
      ],
      [
        "Valor da garantia",
        garantia?.valorAvaliado ? formatCurrency(garantia.valorAvaliado) : "—",
      ],
      ["Documento da garantia", garantia?.documentoRef ?? "—"],
    ]);
    y += 3;

    y = blocoResumo(doc, y, [
      ["Total pago", formatCurrency(t.totalPago)],
      ["Juros pagos", formatCurrency(t.jurosPagos)],
      ["Crédito devolvido", formatCurrency(t.creditoDevolvido)],
      ["Em aberto", formatCurrency(t.emAberto), t.emAberto > 0],
      ["Meses em atraso", String(t.mesesAtraso), t.mesesAtraso > 0],
    ]);
    y += 5;

    if (e.observacoes) {
      y = garantirEspaco(doc, y, 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...GRAFITE);
      const obs = doc.splitTextToSize(`Observações: ${e.observacoes}`, LARGURA_UTIL);
      doc.text(obs, MARGEM, y);
      y += obs.length * 3.4 + 2;
    }

    if (linhas.length === 0) {
      y = garantirEspaco(doc, y, 10);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...GRAFITE);
      doc.text(
        e.dataInicio
          ? "Nenhuma competência gerada para este empréstimo."
          : "Sem data de início — cronograma de cobranças não gerado.",
        MARGEM,
        y
      );
      y += 6;
      return;
    }

    autoTable(doc, {
      startY: y,
      margin: { left: MARGEM, right: MARGEM, bottom: 18 },
      head: [["Tipo", "Mês", "Ano", "Vencimento", "Pagamento", "Valor", "Status"]],
      body: linhas.map((l) => [
        l.tipo,
        mesNome(l.competencia),
        l.competencia.slice(0, 4),
        l.vencimento ? formatDate(l.vencimento) : "—",
        l.dataPagamento ? formatDate(l.dataPagamento) : "—",
        formatCurrency(l.valor),
        l.status,
      ]),
      foot: [
        [
          { content: `${linhas.length} lançamento(s)`, colSpan: 5 },
          formatCurrency(linhas.reduce((s, l) => s + l.valor, 0)),
          "",
        ],
      ],
      // O total fecha a tabela uma vez só — repetido por página confundiria.
      showFoot: "lastPage",
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 7.5,
        cellPadding: 1.6,
        lineColor: LINHA,
        lineWidth: 0.1,
        textColor: OBSIDIANA,
      },
      headStyles: {
        fillColor: OBSIDIANA,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
      },
      footStyles: {
        fillColor: ZEBRA,
        textColor: OBSIDIANA,
        fontStyle: "bold",
        fontSize: 7.5,
      },
      alternateRowStyles: { fillColor: ZEBRA },
      // Larguras somam a faixa útil (182mm) para a grade não "respirar" torto.
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 16, halign: "center" },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 28, halign: "center" },
        4: { cellWidth: 28, halign: "center" },
        5: { cellWidth: 34, halign: "right" },
        6: { cellWidth: 30, halign: "center" },
      },
      // Status ganha cor: verde = quitado, vermelho = em aberto.
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index !== 6) return;
        const valor = String(data.cell.raw);
        if (valor === "Pago" || valor === "Devolução") {
          data.cell.styles.textColor = VERDE;
          data.cell.styles.fontStyle = "bold";
        } else if (valor === "Aberto") {
          data.cell.styles.textColor = VERMELHO;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    y = (doc.lastAutoTable?.finalY ?? y) + 4;
  });

  rodape(doc, credor);
  return doc;
}

/** Monta o relatório e dispara o download do arquivo no browser. */
export function gerarRelatorioCredorPDF(dados: RelatorioCredor) {
  construirRelatorioCredorPDF(dados).save(nomeArquivoRelatorio(dados.credor));
}
