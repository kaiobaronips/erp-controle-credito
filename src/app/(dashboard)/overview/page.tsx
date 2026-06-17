"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/finance";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertTriangle,
  TrendingUp,
  Banknote,
  HandCoins,
  CheckCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface DashboardData {
  totalEmprestado: number;
  principalVivo: number;
  jurosMesEsperado: number;
  jurosNaoPagos: number;
  totalDevolvido: number;
  lucroLiquido: number;
  lucroEstimado: number;
  recebidoMes: number;
  totalCredores: number;
  emprestimosVivos: number;
  emAtraso: number;
  maiorAtraso: number;
  parcelasVencidas: { qtd: number; valor: number };
  parcelasVencendo: { qtd: number; valor: number };
  mesAtual: string;
  cobrancasMes: {
    id: number;
    emprestimoId: number;
    credor: string;
    valor: number;
    vencimento: string;
    status: "pendente" | "pago" | "atrasado";
  }[];
  fluxoMensal: { mes: string; entradas: number; saidas: number }[];
  statusCount: { ativo: number; parcial: number; quitado: number };
  detalhesKpi: {
    jurosMesEsperado: { emprestimoId: number; credor: string; valor: number; dataInicio: string | null; status: string }[];
    recebidoMes: { id: number; emprestimoId: number | null; cobrancaId: number | null; credor: string; valor: number; data: string; descricao: string }[];
    jurosNaoPagos: { emprestimoId: number; credor: string; valor: number; mesesInadimplente: number; status: string }[];
    principalVivo: { emprestimoId: number; credor: string; valorPrincipal: number; valorDevolvido: number; saldoVivo: number; dataInicio: string | null; status: string }[];
    totalEmprestado: { emprestimoId: number; credor: string; valorPrincipal: number; dataInicio: string | null; status: string }[];
    totalDevolvido: { emprestimoId: number; credor: string; valorPrincipal: number; totalRetornado: number; dataInicio: string | null; status: string }[];
    lucroLiquido: { mes: string; valor: number; recebimentos: number }[];
    lucroEstimado: { mes: string; valor: number; recebimentos: number }[];
  };
}

/**
 * Cores semânticas via tokens de tema (--chart-*). Resolvem em SVG e trocam
 * automaticamente entre light e dark. chart-1 azul · chart-2 esmeralda · chart-3 vermelho · chart-4 âmbar.
 */
const COLOR_ENTRADA = "var(--chart-2)";
const COLOR_SAIDA = "var(--chart-3)";
const STATUS_SLICES = [
  { key: "ativo", name: "Em Aberto", color: "var(--chart-1)" },
  { key: "quitado", name: "Quitados", color: "var(--chart-2)" },
  { key: "parcial", name: "Parciais", color: "var(--chart-4)" },
] as const;

function shortMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
  });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

type Tone = "neutral" | "positive" | "alert";
type KpiModal = "jurosMesEsperado" | "recebidoMes" | "jurosNaoPagos" | "principalVivo" | "totalEmprestado" | "totalDevolvido" | "lucroLiquido" | "lucroEstimado";
const TONE_ICON: Record<Tone, string> = {
  neutral: "bg-primary/10 text-primary",
  positive: "bg-success/10 text-success",
  alert: "bg-destructive/10 text-destructive",
};
const TONE_ACCENT: Record<Tone, { accent: string; glow: string }> = {
  neutral: {
    accent: "var(--primary)",
    glow: "color-mix(in oklch, var(--primary) 18%, transparent)",
  },
  positive: {
    accent: "var(--success)",
    glow: "color-mix(in oklch, var(--success) 18%, transparent)",
  },
  alert: {
    accent: "var(--destructive)",
    glow: "color-mix(in oklch, var(--destructive) 18%, transparent)",
  },
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
  onClick,
  index = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone?: Tone;
  onClick?: () => void;
  index?: number;
}) {
  const isAlert = tone === "alert";
  const accent = TONE_ACCENT[tone];
  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      style={
        {
          animationDelay: `${index * 70}ms`,
          "--kpi-accent": accent.accent,
          "--kpi-glow": accent.glow,
        } as React.CSSProperties
      }
      className={`group relative overflow-hidden py-5 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500 transition-[border-color,transform,box-shadow,background] before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-[var(--kpi-accent)] before:opacity-70 before:transition-[width,opacity] before:duration-200 after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(120%_80%_at_100%_0%,var(--kpi-glow),transparent_50%)] after:opacity-0 after:transition-opacity after:duration-200 hover:-translate-y-px hover:border-[var(--kpi-accent)] hover:shadow-lg hover:before:w-[3px] hover:before:opacity-100 hover:after:opacity-100 motion-reduce:animate-none motion-reduce:hover:translate-y-0 ${
        isAlert ? "bg-destructive-muted ring-destructive/25" : ""
      } ${
        onClick
          ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          : ""
      }`}
    >
      <CardContent className="relative z-10 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p
              className={`mt-1.5 text-2xl font-bold tracking-tight tabular-nums ${
                isAlert ? "text-destructive" : "text-foreground"
              }`}
            >
              {value}
            </p>
            {sub && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                {sub}
                {onClick && (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
                )}
              </p>
            )}
          </div>
          <div
            className={`grid size-9 shrink-0 place-items-center rounded-lg transition-transform duration-200 ${
              onClick ? "group-hover:scale-110" : ""
            } ${TONE_ICON[tone]}`}
          >
            <Icon size={18} strokeWidth={2} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

const PROFIT_MONTHS = [
  { number: "12", label: "Dezembro" },
  { number: "11", label: "Novembro" },
  { number: "10", label: "Outubro" },
  { number: "09", label: "Setembro" },
  { number: "08", label: "Agosto" },
  { number: "07", label: "Julho" },
  { number: "06", label: "Junho" },
  { number: "05", label: "Maio" },
  { number: "04", label: "Abril" },
  { number: "03", label: "Março" },
  { number: "02", label: "Fevereiro" },
  { number: "01", label: "Janeiro" },
];

function ProfitByYearGrid({
  rows,
  empty,
  valueLabel = "Valor/Lucro",
}: {
  rows: DashboardData["detalhesKpi"]["lucroLiquido"] | DashboardData["detalhesKpi"]["lucroEstimado"];
  empty: string;
  valueLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-5 py-12 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }

  const years = Array.from(new Set(rows.map((row) => row.mes.slice(0, 4)))).sort();
  const byMonth = new Map(rows.map((row) => [row.mes, row]));

  return (
    <div className="h-full overflow-auto p-5">
      <div
        className="grid min-w-[960px] gap-0 border border-border"
        style={{ gridTemplateColumns: `repeat(${years.length}, minmax(320px, 1fr))` }}
      >
        {years.map((year) => (
          <div key={year} className="border-r border-border last:border-r-0">
            <div className="border-b border-border py-2 text-center text-lg font-semibold tabular-nums text-foreground">
              {year}
            </div>
            <div className="grid grid-cols-[1fr_1.15fr] border-b border-border">
              <div className="px-2 py-2 text-sm font-semibold text-foreground">Mês</div>
              <div className="px-2 py-2 text-right text-sm font-semibold text-foreground">{valueLabel}</div>
            </div>
            {PROFIT_MONTHS.map((month) => {
              const row = byMonth.get(`${year}-${month.number}`);
              return (
                <div key={month.number} className="grid grid-cols-[1fr_1.15fr] border-b border-border last:border-b-0">
                  <div className="px-2 py-2 text-sm font-medium text-foreground">{month.label}</div>
                  <div className="flex items-center justify-end gap-3 px-2 py-2 text-sm font-semibold tabular-nums text-foreground">
                    <span>R$</span>
                    <span>{row ? formatCurrency(row.valor).replace("R$", "").trim() : "-"}</span>
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-[1fr_1.15fr] border-t border-border bg-muted/40">
              <div className="px-2 py-2 text-sm font-semibold text-foreground">Total</div>
              <div className="flex items-center justify-end gap-3 px-2 py-2 text-sm font-bold tabular-nums text-success">
                <span>R$</span>
                <span>
                  {formatCurrency(
                    rows
                      .filter((row) => row.mes.startsWith(`${year}-`))
                      .reduce((total, row) => total + row.valor, 0)
                  )
                    .replace("R$", "")
                    .trim()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiDetailsDialog({
  data,
  open,
  onOpenChange,
  type,
}: {
  data: DashboardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: KpiModal | null;
}) {
  if (!type) return null;

  const config = {
    jurosMesEsperado: {
      title: "Juros / mês esperado",
      desc: "Composição da receita mensal de juros da carteira viva.",
      icon: TrendingUp,
      tone: "positive" as Tone,
      total: data.jurosMesEsperado,
      count: data.detalhesKpi.jurosMesEsperado.length,
      countLabel: "empréstimos vivos",
      empty: "Nenhum empréstimo vivo para compor este KPI.",
    },
    recebidoMes: {
      title: "Recebido este mês",
      desc: "Juros efetivamente recebidos no mês corrente.",
      icon: CheckCircle,
      tone: "positive" as Tone,
      total: data.recebidoMes,
      count: data.detalhesKpi.recebidoMes.length,
      countLabel: "recebimentos",
      empty: "Nenhum recebimento registrado neste mês.",
    },
    jurosNaoPagos: {
      title: "Juros não pagos",
      desc: "Juros vencidos e ainda não pagos na carteira viva.",
      icon: AlertTriangle,
      tone: "alert" as Tone,
      total: data.jurosNaoPagos,
      count: data.detalhesKpi.jurosNaoPagos.length,
      countLabel: "em atraso",
      empty: "Nenhum juro em aberto na carteira viva.",
    },
    principalVivo: {
      title: "Principal",
      desc: "Saldo de principal ainda em campo por empréstimo ativo.",
      icon: Banknote,
      tone: "neutral" as Tone,
      total: data.principalVivo,
      count: data.detalhesKpi.principalVivo.length,
      countLabel: "empréstimos ativos",
      empty: "Nenhum empréstimo ativo.",
    },
    totalEmprestado: {
      title: "Total emprestado",
      desc: "Histórico de todo o capital concedido.",
      icon: HandCoins,
      tone: "neutral" as Tone,
      total: data.totalEmprestado,
      count: data.detalhesKpi.totalEmprestado.length,
      countLabel: "empréstimos",
      empty: "Nenhum empréstimo cadastrado.",
    },
    totalDevolvido: {
      title: "Devoluções recebidas",
      desc: "Principal devolvido por credor.",
      icon: CheckCircle,
      tone: "positive" as Tone,
      total: data.totalDevolvido,
      count: data.detalhesKpi.totalDevolvido.length,
      countLabel: "devoluções",
      empty: "Nenhuma devolução registrada.",
    },
    lucroLiquido: {
      title: "Lucro Líquido",
      desc: "Lucro total realizado desde o início da operação, separado por mês.",
      icon: TrendingUp,
      tone: "positive" as Tone,
      total: data.lucroLiquido,
      count: data.detalhesKpi.lucroLiquido.length,
      countLabel: "meses com lucro",
      empty: "Nenhum lucro registrado.",
    },
    lucroEstimado: {
      title: "Lucro Estimado",
      desc: "Total de juros que as operações deveriam ter gerado com 100% das parcelas pagas.",
      icon: TrendingUp,
      tone: "positive" as Tone,
      total: data.lucroEstimado,
      count: data.detalhesKpi.lucroEstimado.length,
      countLabel: "meses previstos",
      empty: "Nenhuma parcela prevista.",
    },
  }[type];

  const Icon = config.icon;
  const accentText = config.tone === "alert" ? "text-destructive" : "text-success";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 space-y-0 border-b p-5 text-left">
          <div className="flex items-start gap-3">
            <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${TONE_ICON[config.tone]}`}>
              <Icon size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">{config.title}</DialogTitle>
              <p className="mt-0.5 text-sm font-normal text-muted-foreground">{config.desc}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo: total + contagem de itens */}
        <div className="grid shrink-0 grid-cols-2 gap-px bg-border">
          <div className="bg-card px-5 py-3">
            <p className="text-xs text-muted-foreground">Total do KPI</p>
            <p className={`mt-0.5 text-2xl font-bold tracking-tight tabular-nums ${accentText}`}>
              {formatCurrency(config.total)}
            </p>
          </div>
          <div className="bg-card px-5 py-3">
            <p className="text-xs text-muted-foreground">Itens</p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {config.count}
              <span className="ml-1.5 align-middle text-xs font-normal text-muted-foreground">
                {config.countLabel}
              </span>
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 border-t">
          {type === "jurosMesEsperado" && (
            <KpiTable
              empty={config.empty}
              colSpan={4}
              rows={data.detalhesKpi.jurosMesEsperado}
              header={
                <TableRow>
                  <TableHead>Credor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Juros/mês</TableHead>
                </TableRow>
              }
              renderRow={(row) => (
                <TableRow key={row.emprestimoId}>
                  <TableCell className="font-medium">{row.credor}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(row.dataInicio)}</TableCell>
                  <TableCell className="text-muted-foreground">{row.status}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(row.valor)}
                  </TableCell>
                </TableRow>
              )}
            />
          )}

          {type === "recebidoMes" && (
            <KpiTable
              empty={config.empty}
              colSpan={4}
              rows={data.detalhesKpi.recebidoMes}
              header={
                <TableRow>
                  <TableHead>Credor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              }
              renderRow={(row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.credor}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(row.data)}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-muted-foreground">
                    {row.descricao}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(row.valor)}
                  </TableCell>
                </TableRow>
              )}
            />
          )}

          {type === "jurosNaoPagos" && (
            <KpiTable
              empty={config.empty}
              colSpan={4}
              rows={data.detalhesKpi.jurosNaoPagos}
              header={
                <TableRow>
                  <TableHead>Credor</TableHead>
                  <TableHead>Atraso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Juros não pagos</TableHead>
                </TableRow>
              }
              renderRow={(row) => (
                <TableRow key={row.emprestimoId}>
                  <TableCell className="font-medium">{row.credor}</TableCell>
                  <TableCell className="tabular-nums">
                    {row.mesesInadimplente} {row.mesesInadimplente === 1 ? "mês" : "meses"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.status}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-destructive">
                    {formatCurrency(row.valor)}
                  </TableCell>
                </TableRow>
              )}
            />
          )}
          {type === "principalVivo" && (
            <KpiTable
              empty={config.empty}
              colSpan={4}
              rows={data.detalhesKpi.principalVivo}
              header={
                <TableRow>
                  <TableHead>Credor</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Saldo vivo</TableHead>
                </TableRow>
              }
              renderRow={(row) => (
                <TableRow key={row.emprestimoId}>
                  <TableCell className="font-medium">{row.credor}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(row.dataInicio)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.valorPrincipal)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(row.saldoVivo)}</TableCell>
                </TableRow>
              )}
            />
          )}
          {type === "totalEmprestado" && (
            <KpiTable
              empty={config.empty}
              colSpan={4}
              rows={data.detalhesKpi.totalEmprestado}
              header={
                <TableRow>
                  <TableHead>Credor</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              }
              renderRow={(row) => (
                <TableRow key={row.emprestimoId}>
                  <TableCell className="font-medium">{row.credor}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(row.dataInicio)}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{row.status}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(row.valorPrincipal)}</TableCell>
                </TableRow>
              )}
            />
          )}
          {type === "totalDevolvido" && (
            <KpiTable
              empty={config.empty}
              colSpan={4}
              rows={data.detalhesKpi.totalDevolvido}
              header={
                <TableRow>
                  <TableHead>Credor</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead className="text-right">Valor do Crédito</TableHead>
                  <TableHead className="text-right">Devolvido</TableHead>
                </TableRow>
              }
              renderRow={(row) => (
                <TableRow key={row.emprestimoId}>
                  <TableCell className="font-medium">{row.credor}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(row.dataInicio)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.valorPrincipal)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-success">{formatCurrency(row.totalRetornado)}</TableCell>
                </TableRow>
              )}
            />
          )}
          {type === "lucroLiquido" && (
            <ProfitByYearGrid
              empty={config.empty}
              rows={data.detalhesKpi.lucroLiquido}
            />
          )}
          {type === "lucroEstimado" && (
            <ProfitByYearGrid
              empty={config.empty}
              rows={data.detalhesKpi.lucroEstimado}
              valueLabel="Valor/Estimado"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KpiTable<T>({
  rows,
  header,
  renderRow,
  empty,
  colSpan,
}: {
  rows: T[];
  header: React.ReactNode;
  renderRow: (row: T) => React.ReactNode;
  empty: string;
  colSpan: number;
}) {
  return (
    <Table containerClassName="h-full overflow-y-auto">
      <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">{header}</TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
              {empty}
            </TableCell>
          </TableRow>
        ) : (
          rows.map(renderRow)
        )}
      </TableBody>
    </Table>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1.5 font-medium text-popover-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 tabular-nums">
            <span className="size-2 shrink-0 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-3 font-semibold text-popover-foreground">
              {formatCurrency(Number(entry.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; payload?: { color?: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <span className="size-2 rounded-full" style={{ background: entry.payload?.color }} />
      <span className="text-muted-foreground">{entry.name}</span>
      <span className="font-semibold tabular-nums text-popover-foreground">{entry.value}</span>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="px-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-52 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-xl bg-muted ring-1 ring-foreground/5" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-[300px] animate-pulse rounded-xl bg-muted ring-1 ring-foreground/5" />
        ))}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);
  const [pagando, setPagando] = useState<number | null>(null);
  const [kpiModal, setKpiModal] = useState<KpiModal | null>(null);

  const load = useCallback(async (comAviso: boolean) => {
    try {
      const r = await fetch("/api/dashboard");
      if (!r.ok) throw new Error("falha");
      const d: DashboardData = await r.json();
      setData(d);
      if (comAviso) {
        const venc = d.parcelasVencidas?.qtd ?? 0;
        const aVencer = d.parcelasVencendo?.qtd ?? 0;
        if (venc > 0) {
          toast.error(
            `${venc} parcela(s) de juros vencida(s) — ${formatCurrency(d.parcelasVencidas.valor)}`,
            { description: "Acesse Cobranças para registrar os pagamentos.", duration: 8000 }
          );
        } else if (aVencer > 0) {
          toast.warning(
            `${aVencer} parcela(s) vencendo em 7 dias — ${formatCurrency(d.parcelasVencendo.valor)}`,
            { duration: 6000 }
          );
        }
      }
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      try {
        const r = await fetch("/api/dashboard");
        if (!r.ok) throw new Error("falha");
        const d: DashboardData = await r.json();
        if (!active) return;
        setData(d);

        const venc = d.parcelasVencidas?.qtd ?? 0;
        const aVencer = d.parcelasVencendo?.qtd ?? 0;
        if (venc > 0) {
          toast.error(
            `${venc} parcela(s) de juros vencida(s) — ${formatCurrency(d.parcelasVencidas.valor)}`,
            { description: "Acesse Cobranças para registrar os pagamentos.", duration: 8000 }
          );
        } else if (aVencer > 0) {
          toast.warning(
            `${aVencer} parcela(s) vencendo em 7 dias — ${formatCurrency(d.parcelasVencendo.valor)}`,
            { duration: 6000 }
          );
        }
      } catch {
        if (active) setError(true);
      }
    }

    loadInitial();

    return () => {
      active = false;
    };
  }, []);

  async function togglePagamento(c: DashboardData["cobrancasMes"][number]) {
    setPagando(c.id);
    const acao = c.status === "pago" ? "estornar" : "pagar";
    const res = await fetch(`/api/cobrancas/${c.id}/${acao}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setPagando(null);
    if (res.ok) {
      toast.success(acao === "pagar" ? "Pagamento registrado" : "Pagamento estornado");
      load(false);
    } else {
      toast.error("Não foi possível atualizar");
    }
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <AlertTriangle className="text-destructive" size={24} />
        <p className="text-sm font-medium text-foreground">Não foi possível carregar o painel</p>
        <p className="text-xs text-muted-foreground">Verifique a conexão e recarregue a página.</p>
      </div>
    );
  }

  if (!data) return <OverviewSkeleton />;

  const fmtNum = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalEmprestimos = data.statusCount.ativo + data.statusCount.parcial + data.statusCount.quitado;

  const fluxoData = data.fluxoMensal.map((f) => ({ ...f, mesLabel: shortMonth(f.mes) }));
  const hasFluxo = fluxoData.some((f) => f.entradas > 0 || f.saidas > 0);

  const pieData = STATUS_SLICES.map((s) => ({
    name: s.name,
    value: data.statusCount[s.key],
    color: s.color,
  })).filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Métricas principais — no topo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Principal"
          value={formatCurrency(data.principalVivo)}
          icon={Banknote}
          sub={`${data.emprestimosVivos} ativos`}
          onClick={() => setKpiModal("principalVivo")}
        />
        <StatCard
          index={1}
          label="Juros / mês esperado"
          value={formatCurrency(data.jurosMesEsperado)}
          icon={TrendingUp}
          tone="positive"
          sub="receita mensal da carteira"
          onClick={() => setKpiModal("jurosMesEsperado")}
        />
        <StatCard
          index={2}
          label="Recebido este mês"
          value={formatCurrency(data.recebidoMes)}
          icon={CheckCircle}
          tone="positive"
          sub="juros recebidos no mês"
          onClick={() => setKpiModal("recebidoMes")}
        />
        <StatCard
          index={3}
          label="Juros não pagos"
          value={formatCurrency(data.jurosNaoPagos)}
          icon={AlertTriangle}
          tone="alert"
          sub={`${data.emAtraso} em atraso`}
          onClick={() => setKpiModal("jurosNaoPagos")}
        />
        <StatCard
          index={4}
          label="Total emprestado"
          value={formatCurrency(data.totalEmprestado)}
          icon={HandCoins}
          sub="histórico concedido"
          onClick={() => setKpiModal("totalEmprestado")}
        />
        <StatCard
          index={5}
          label="Devoluções recebidas"
          value={formatCurrency(data.totalDevolvido)}
          icon={CheckCircle}
          tone="positive"
          sub="principal devolvido"
          onClick={() => setKpiModal("totalDevolvido")}
        />
        <StatCard
          index={6}
          label="Lucro Líquido"
          value={formatCurrency(data.lucroLiquido)}
          icon={TrendingUp}
          tone="positive"
          sub="lucro total"
          onClick={() => setKpiModal("lucroLiquido")}
        />
        <StatCard
          index={7}
          label="Lucro Estimado"
          value={formatCurrency(data.lucroEstimado)}
          icon={TrendingUp}
          tone="positive"
          sub="total das operações"
          onClick={() => setKpiModal("lucroEstimado")}
        />
      </div>

      <KpiDetailsDialog
        data={data}
        type={kpiModal}
        open={Boolean(kpiModal)}
        onOpenChange={(open) => {
          if (!open) setKpiModal(null);
        }}
      />

      {/* Alerta de inadimplência */}
      {data.emAtraso > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive-muted p-4">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-destructive/10 text-destructive">
            <AlertTriangle size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-destructive">
              {data.emAtraso} de {data.emprestimosVivos} empréstimos vivos com juros em atraso
            </p>
            <p className="text-xs text-destructive/80 tabular-nums">
              {formatCurrency(data.jurosNaoPagos)} em juros não pagos · pior caso {data.maiorAtraso}{" "}
              {data.maiorAtraso === 1 ? "mês" : "meses"}
            </p>
          </div>
          <Link href="/parcelas" className="shrink-0">
            <Badge variant="destructive">Cobrança</Badge>
          </Link>
        </div>
      )}

      {/* Aviso proativo: parcelas vencendo nos próximos 7 dias */}
      {data.parcelasVencendo.qtd > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/25 bg-warning-muted p-4">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-warning/10 text-warning">
            <Clock size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-warning">
              {data.parcelasVencendo.qtd} parcela
              {data.parcelasVencendo.qtd > 1 ? "s" : ""} de juros vencem nos próximos 7 dias
            </p>
            <p className="text-xs text-warning/80 tabular-nums">
              {formatCurrency(data.parcelasVencendo.valor)} a receber em breve
            </p>
          </div>
          <Link href="/parcelas" className="shrink-0">
            <Badge className="bg-warning/15 text-warning">A vencer</Badge>
          </Link>
        </div>
      )}

      {/* Cobranças do mês — lista acionável */}
      <Card className="gap-0 overflow-hidden py-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Cobranças · {shortMonth(data.mesAtual)} {data.mesAtual.slice(0, 4)}
            </h2>
            <p className="text-xs text-muted-foreground">Parcelas de juros do mês corrente</p>
          </div>
          <div className="flex items-center gap-2">
            {data.cobrancasMes.filter((c) => c.status === "pago").length > 0 && (
              <span className="tabular-nums rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-semibold text-success">
                {data.cobrancasMes.filter((c) => c.status === "pago").length} pago{data.cobrancasMes.filter((c) => c.status === "pago").length !== 1 ? "s" : ""}
              </span>
            )}
            {data.cobrancasMes.filter((c) => c.status !== "pago").length > 0 && (
              <span className="tabular-nums rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {data.cobrancasMes.filter((c) => c.status !== "pago").length} em aberto
              </span>
            )}
          </div>
        </div>

        {/* Progress bar de pagamento */}
        {data.cobrancasMes.length > 0 && (
          <div className="h-0.5 w-full bg-muted">
            <div
              className="h-full bg-success transition-all duration-700"
              style={{
                width: `${(data.cobrancasMes.filter((c) => c.status === "pago").length / data.cobrancasMes.length) * 100}%`,
              }}
            />
          </div>
        )}

        <CardContent className="p-0">
          {data.cobrancasMes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <CheckCircle className="text-muted-foreground/30" size={32} />
              <p className="text-sm text-muted-foreground">Nenhuma cobrança neste mês.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {[...data.cobrancasMes]
                .sort((a, b) => {
                  const order: Record<string, number> = { atrasado: 0, pendente: 1, pago: 2 };
                  return (order[a.status] ?? 1) - (order[b.status] ?? 1);
                })
                .map((c) => {
                  const pago = c.status === "pago";
                  const atrasado = c.status === "atrasado";
                  const initials = c.credor
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0] ?? "")
                    .join("")
                    .toUpperCase();
                  return (
                    <li
                      key={c.id}
                      className={`group flex items-center gap-3 px-5 py-3 transition-opacity ${pago ? "opacity-55" : ""}`}
                    >
                      {/* Faixa lateral de status */}
                      <span
                        className={`w-0.5 self-stretch rounded-full shrink-0 ${
                          pago ? "bg-success" : atrasado ? "bg-destructive" : "bg-warning"
                        }`}
                      />

                      {/* Avatar com iniciais */}
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-wide ${
                          pago
                            ? "bg-success/15 text-success"
                            : atrasado
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                        }`}
                      >
                        {initials}
                      </span>

                      {/* Info do credor */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-semibold ${
                            pago ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {c.credor}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          vence {new Date(c.vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      </div>

                      {/* Valor (accounting style) */}
                      <div className="flex items-baseline gap-0.5 tabular-nums">
                        <span className="text-[10px] text-muted-foreground/40">R$</span>
                        <span className="text-sm font-bold text-foreground">{fmtNum.format(c.valor)}</span>
                      </div>

                      {/* Botão de ação */}
                      <button
                        disabled={pagando === c.id}
                        onClick={() => togglePagamento(c)}
                        title={pago ? "Clique para estornar" : "Marcar como pago"}
                        className={`min-w-[84px] rounded-full px-3 py-1 text-xs font-semibold transition-all disabled:opacity-50 ${
                          pago
                            ? "bg-success/15 text-success hover:bg-destructive/12 hover:text-destructive"
                            : atrasado
                              ? "bg-destructive/12 text-destructive hover:bg-success/15 hover:text-success"
                              : "bg-warning/10 text-warning hover:bg-success/15 hover:text-success"
                        }`}
                      >
                        {pagando === c.id
                          ? "..."
                          : pago
                            ? "✓ Pago"
                            : atrasado
                              ? "Atrasado"
                              : "Pendente"}
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Fluxo de Caixa — Últimos 6 Meses">
          {hasFluxo ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={fluxoData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="mesLabel"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltip />} />
                <Bar dataKey="entradas" fill={COLOR_ENTRADA} name="Juros recebidos" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                <Bar dataKey="saidas" fill={COLOR_SAIDA} name="Desembolsos" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Sem movimentações registradas nos últimos 6 meses" />
          )}
          {hasFluxo && (
            <div className="mt-4 flex items-center justify-center gap-5 text-xs">
              <LegendDot color={COLOR_ENTRADA} label="Juros recebidos" />
              <LegendDot color={COLOR_SAIDA} label="Desembolsos" />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Status da Carteira">
          {pieData.length === 0 ? (
            <EmptyChart message="Nenhum empréstimo cadastrado" />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
              <div className="relative h-[180px] w-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={84}
                      paddingAngle={pieData.length > 1 ? 2 : 0}
                      dataKey="value"
                      stroke="var(--card)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    >
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tabular-nums text-foreground">{totalEmprestimos}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {totalEmprestimos === 1 ? "empréstimo" : "empréstimos"}
                  </span>
                </div>
              </div>
              <ul className="w-full space-y-2 sm:w-auto">
                {pieData.map((d, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="ml-auto font-semibold tabular-nums text-foreground sm:ml-6">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
