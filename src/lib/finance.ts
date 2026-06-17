/**
 * Modelo juros mensais (interest-only): o tomador paga só os juros todo mês.
 * parcelaMensal = principal * taxa%/mês. Ao devolver o principal, paga
 * principal + 1 mês de juros.
 */
export function jurosMensal(principal: number, taxaMensalPct: number): number {
  return Math.round(principal * (taxaMensalPct / 100) * 100) / 100;
}

/** Valor para quitar hoje: principal + 1 mês de juros. */
export function valorADevolver(principal: number, parcelaMensal: number): number {
  return principal + parcelaMensal;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

export function isOverdue(dateStr: string): boolean {
  return new Date(dateStr + "T00:00:00") < new Date();
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

/** Meses decorridos desde o início do empréstimo até hoje (aprox.). */
export function mesesDecorridos(dataInicio: string | null): number {
  if (!dataInicio) return 0;
  const ini = new Date(dataInicio + "T00:00:00");
  const hoje = new Date();
  const m =
    (hoje.getFullYear() - ini.getFullYear()) * 12 +
    (hoje.getMonth() - ini.getMonth());
  return Math.max(0, m);
}

/**
 * Lista de competências mensais (juros) devidas desde o início do empréstimo
 * até o mês corrente. A 1ª cobrança vence ~1 mês após o desembolso; o
 * vencimento mantém o dia do início (limitado ao tamanho do mês).
 */
export function competenciasAte(
  dataInicio: string,
  ateISO?: string
): { competencia: string; vencimento: string }[] {
  const ini = new Date(dataInicio + "T00:00:00");
  const ate = ateISO ? new Date(ateISO + "T00:00:00") : new Date();
  const anchorDay = ini.getDate();
  const out: { competencia: string; vencimento: string }[] = [];
  let y = ini.getFullYear();
  let m = ini.getMonth() + 1; // primeira competência = mês seguinte ao início
  if (m > 11) {
    m -= 12;
    y += 1;
  }
  const ateY = ate.getFullYear();
  const ateM = ate.getMonth();
  while (y < ateY || (y === ateY && m <= ateM)) {
    const comp = `${y}-${String(m + 1).padStart(2, "0")}`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const day = Math.min(anchorDay, lastDay);
    out.push({ competencia: comp, vencimento: `${comp}-${String(day).padStart(2, "0")}` });
    m += 1;
    if (m > 11) {
      m -= 12;
      y += 1;
    }
  }
  return out;
}

export const STATUS_EMPRESTIMO = {
  ativo: "Em Aberto",
  parcial: "Parcial",
  quitado: "Quitado",
} as const;

export type StatusEmprestimo = keyof typeof STATUS_EMPRESTIMO;
