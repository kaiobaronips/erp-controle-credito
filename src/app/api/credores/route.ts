import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { credores, emprestimos } from "@/lib/db/schema";
import { ensureCredoresStatusColumns } from "@/lib/db/ensure-schema";
import { auth } from "@/lib/auth";

type EmprestimoStatus = "ativo" | "parcial" | "quitado" | "executado" | "devedor";
type CredorListRow = typeof credores.$inferSelect & {
  rowId: string;
  emprestimoId: number | null;
  emprestimoData: string | null;
  emprestimoValor: number;
  emprestimosTotal: number;
  status: EmprestimoStatus | null;
};

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await ensureCredoresStatusColumns();

  const [allCredores, allEmprestimos] = await Promise.all([
    db.select().from(credores).orderBy(credores.nome),
    db.select().from(emprestimos),
  ]);

  const loansByCredor = new Map<number, (typeof emprestimos.$inferSelect)[]>();
  for (const loan of allEmprestimos) {
    const rows = loansByCredor.get(loan.credorId) ?? [];
    rows.push(loan);
    loansByCredor.set(loan.credorId, rows);
  }

  const data: CredorListRow[] = allCredores.flatMap((credor): CredorListRow[] => {
    const loans = loansByCredor.get(credor.id) ?? [];
    if (loans.length === 0) {
      return [{
        ...credor,
        rowId: `credor-${credor.id}`,
        emprestimoId: null,
        emprestimoData: null,
        emprestimoValor: 0,
        emprestimosTotal: 0,
        status: null,
      }];
    }

    return loans
      .toSorted((a, b) => (a.dataInicio ?? "").localeCompare(b.dataInicio ?? ""))
      .map((loan) => ({
      ...credor,
      rowId: `emprestimo-${loan.id}`,
      emprestimoId: loan.id,
      emprestimoData: loan.dataInicio ?? loan.createdAt,
      emprestimoValor: Number(loan.valorPrincipal ?? 0),
      emprestimosTotal: loans.length,
      status: (loan.status as EmprestimoStatus) ?? null,
    }));
  });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await ensureCredoresStatusColumns();

  const body = await req.json();
  const statusManual = body.statusManual === "inativo" ? "inativo" : null;
  const statusObservacao = statusManual ? String(body.statusObservacao ?? "").trim() : null;

  if (statusManual && !statusObservacao) {
    return NextResponse.json({ error: "Informe o motivo para deixar o credor inativo." }, { status: 400 });
  }

  const [row] = await db.insert(credores).values({
    nome: body.nome,
    cpfCnpj: body.cpfCnpj,
    email: body.email,
    telefone: body.telefone,
    endereco: body.endereco,
    observacoes: body.observacoes,
    statusManual,
    statusObservacao,
  }).returning();
  return NextResponse.json(row, { status: 201 });
}
