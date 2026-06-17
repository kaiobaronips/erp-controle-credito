import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cobrancas, emprestimos, credores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sincronizarCobrancas } from "@/lib/cobrancas";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Automação: materializa as competências mensais até hoje a cada visita.
  await sincronizarCobrancas();

  const data = await db
    .select({ cobranca: cobrancas, emprestimo: emprestimos, credor: credores })
    .from(cobrancas)
    .leftJoin(emprestimos, eq(cobrancas.emprestimoId, emprestimos.id))
    .leftJoin(credores, eq(emprestimos.credorId, credores.id))
    .orderBy(cobrancas.vencimento);

  return NextResponse.json(data);
}
