import { db } from "../src/lib/db";
import { fluxoCaixa, cobrancas, emprestimos, garantias, credores } from "../src/lib/db/schema";

// Apaga apenas dados operacionais. NÃO toca em users/sessions/accounts.
async function main() {
  await db.delete(fluxoCaixa);
  await db.delete(cobrancas);
  await db.delete(emprestimos);
  await db.delete(garantias);
  await db.delete(credores);
  console.log("Dados operacionais apagados. Login preservado.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
