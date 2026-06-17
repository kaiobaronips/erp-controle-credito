import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emprestimos, credores, cobrancas, fluxoCaixa } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

const MODEL = "claude-haiku-4-5-20251001";

function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

/** Resumo do sistema injetado no contexto para respostas baseadas em dados reais. */
async function montarContexto(): Promise<string> {
  const [emps, creds, cobs, fluxo] = await Promise.all([
    db.select().from(emprestimos),
    db.select().from(credores),
    db.select().from(cobrancas),
    db.select().from(fluxoCaixa),
  ]);

  const credorNome = new Map(creds.map((c) => [c.id, c.nome]));
  const vivos = emps.filter((e) => e.status === "ativo" || e.status === "parcial");
  const principalVivo = vivos.reduce((s, e) => s + Math.max(0, e.valorPrincipal - e.valorDevolvido), 0);
  const totalEmprestado = emps.reduce((s, e) => s + e.valorPrincipal, 0);
  const jurosMes = vivos.reduce((s, e) => s + e.parcelaMensal, 0);
  const jurosNaoPagos = vivos.reduce((s, e) => s + e.jurosNaoPagos, 0);
  const emAtraso = vivos.filter((e) => e.mesesInadimplente > 0);

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const recebidoMes = fluxo
    .filter((f) => f.tipo === "entrada" && f.categoria === "parcela_recebida" && f.data >= inicioMes)
    .reduce((s, f) => s + f.valor, 0);

  const porStatus = (st: string) => emps.filter((e) => e.status === st).length;

  const listaEmps = emps
    .map((e) => {
      const saldo = Math.max(0, e.valorPrincipal - e.valorDevolvido);
      return `- ${credorNome.get(e.credorId) ?? "?"}: principal ${brl(e.valorPrincipal)}, juros/mês ${brl(e.parcelaMensal)} (${e.taxaJuros}% a.m.), status "${e.status}"${e.mesesInadimplente > 0 ? `, ${e.mesesInadimplente} mês(es) pendente(s)` : ""}${saldo !== e.valorPrincipal ? `, saldo vivo ${brl(saldo)}` : ""}`;
    })
    .join("\n");

  return `DADOS ATUAIS DO SISTEMA (${new Date().toLocaleDateString("pt-BR")}):

Carteira:
- Credores cadastrados: ${creds.length}
- Empréstimos: ${emps.length} (ativos: ${porStatus("ativo")}, parciais: ${porStatus("parcial")}, quitados: ${porStatus("quitado")}, executados: ${porStatus("executado")}, devedores: ${porStatus("devedor")})
- Total já emprestado (histórico): ${brl(totalEmprestado)}
- Principal vivo (na rua): ${brl(principalVivo)}
- Juros esperados por mês: ${brl(jurosMes)}
- Juros recebidos no mês corrente: ${brl(recebidoMes)}
- Juros não pagos (acumulado): ${brl(jurosNaoPagos)}
- Empréstimos em atraso: ${emAtraso.length}
- Parcelas/cobranças registradas: ${cobs.length}

Empréstimos detalhados:
${listaEmps}`;
}

const SYSTEM_PROMPT = `Você é o assistente de IA do "Federal Credit Pay", uma plataforma de controle de crédito com garantia (penhor de bens). Você ajuda o operador a entender o sistema e tirar dúvidas sobre os dados.

MODELO DE NEGÓCIO:
- Empréstimos com juros mensais sobre garantia, taxa padrão de 7% ao mês.
- O credor (devedor) entrega um bem como garantia e recebe o crédito.
- Juros mensais = principal × taxa. O credor paga só os juros todo mês.
- No encerramento, o credor devolve o principal + 1 mês de juros de fechamento juntos.
- Cada pagamento é mapeado ao MÊS em que foi feito. Se não houve pagamento em um mês, aquela cobrança fica "atrasado".

STATUS DE EMPRÉSTIMO:
- ativo: credor pagando as parcelas em dia.
- parcial: devolveu parte do principal.
- quitado: todas as parcelas pagas e principal devolvido sem pendências.
- executado: não pagou (atrasou 3+) e perdeu o bem dado em garantia.
- devedor (exibido como "Pendente"): devolveu o principal mas ficou com parcelas pendentes.

PÁGINAS DO SISTEMA:
- Dashboard: KPIs gerais (principal, juros/mês, recebido, não pagos, total emprestado, devoluções). Cada card abre detalhes ao clicar.
- Credores: lista de credores com status (somente leitura, reflete o empréstimo).
- Empréstimos: lista com status, datas, valores, % e ações.
- Cobranças/Parcelas: parcelas mensais de juros, marcação de pagamento.
- Garantias: bens em garantia.
- Fluxo de Caixa: entradas e saídas.

REGRAS DE RESPOSTA:
- Responda em português do Brasil, de forma direta e objetiva.
- Use os DADOS ATUAIS fornecidos para responder perguntas sobre valores e credores específicos.
- Valores sempre em formato R$ brasileiro.
- Se a pergunta não tiver relação com o sistema, redirecione gentilmente.
- Não invente dados que não estejam no contexto.`;

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chat indisponível: configure ANTHROPIC_API_KEY no ambiente." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Mensagens inválidas" }, { status: 400 });
  }

  const contexto = await montarContexto();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\n${contexto}`,
      messages: messages.slice(-12).map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? ""),
      })),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "Erro ao consultar a IA", detail: detail.slice(0, 300) },
      { status: 502 }
    );
  }

  const data = await res.json();
  const reply =
    data?.content?.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : "")).join("") ??
    "Não consegui gerar uma resposta.";

  return NextResponse.json({ reply });
}
