import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { credores, emprestimos, garantias } from "@/lib/db/schema";
import { ensureCredoresStatusColumns } from "@/lib/db/ensure-schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  await ensureCredoresStatusColumns();

  const { id } = await params;
  const credorId = Number(id);
  const body = await req.json();
  const patch: Partial<typeof credores.$inferInsert> = {};

  if (body.nome !== undefined) patch.nome = body.nome;
  if (body.cpfCnpj !== undefined) patch.cpfCnpj = body.cpfCnpj;
  if (body.email !== undefined) patch.email = body.email;
  if (body.telefone !== undefined) patch.telefone = body.telefone;
  if (body.endereco !== undefined) patch.endereco = body.endereco;
  if (body.observacoes !== undefined) patch.observacoes = body.observacoes;

  if (body.statusManual !== undefined) {
    const statusManual = body.statusManual === "inativo" ? "inativo" : null;
    const statusObservacao = statusManual ? String(body.statusObservacao ?? "").trim() : null;

    if (statusManual && !statusObservacao) {
      return NextResponse.json({ error: "Informe o motivo para deixar o credor inativo." }, { status: 400 });
    }

    if (statusManual) {
      const [openLoans] = await db
        .select({ count: sql<number>`count(*)` })
        .from(emprestimos)
        .where(sql`${emprestimos.credorId} = ${credorId} and ${emprestimos.status} != 'quitado' and ${emprestimos.valorDevolvido} < ${emprestimos.valorPrincipal}`);

      if ((openLoans?.count ?? 0) === 0) {
        return NextResponse.json(
          { error: "Credor finalizado não pode ser marcado como inativo." },
          { status: 409 }
        );
      }
    }

    patch.statusManual = statusManual;
    patch.statusObservacao = statusObservacao;
  }

  const [row] = await db.update(credores).set(patch).where(eq(credores.id, credorId)).returning();
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  await ensureCredoresStatusColumns();

  const { id } = await params;

  const credorId = Number(id);
  const credorEmprestimos = await db
    .select({ count: sql<number>`count(*)` })
    .from(emprestimos)
    .where(eq(emprestimos.credorId, credorId));
  const credorGarantias = await db
    .select({ count: sql<number>`count(*)` })
    .from(garantias)
    .where(eq(garantias.credorId, credorId));

  const totalEmprestimos = credorEmprestimos[0]?.count ?? 0;
  const totalGarantias = credorGarantias[0]?.count ?? 0;

  if (totalEmprestimos > 0 || totalGarantias > 0) {
    return NextResponse.json(
      {
        error:
          "Este credor não pode ser removido porque ainda possui empréstimos ou garantias vinculados.",
        emprestimos: totalEmprestimos,
        garantias: totalGarantias,
      },
      { status: 409 }
    );
  }

  await db.delete(credores).where(eq(credores.id, credorId));
  return NextResponse.json({ ok: true });
}
