"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/finance";

const fmtNum = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Money({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`flex items-baseline justify-end gap-1 tabular-nums ${className ?? ""}`}>
      <span className="text-[10px] text-muted-foreground/40 shrink-0">R$</span>
      <span>{fmtNum.format(value)}</span>
    </div>
  );
}
import type { Credor } from "@/lib/db/schema";
import { AlertTriangle, Clock, CheckCircle, HandCoins, Check } from "lucide-react";

interface Row {
  cobranca: {
    id: number;
    emprestimoId: number;
    competencia: string; // YYYY-MM
    valor: number;
    vencimento: string;
    status: "pendente" | "pago" | "atrasado";
    dataPagamento: string | null;
  };
  emprestimo: { id: number; status: string } | null;
  credor: Credor | null;
}

type Filtro = "aberto" | "vencidas" | "pagas" | "todas";

function compLabel(c: string) {
  const [y, m] = c.split("-").map(Number);
  const lbl = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
  return `${lbl.charAt(0).toUpperCase()}${lbl.slice(1).replace(".", "")}/${String(y).slice(2)}`;
}

const inicioMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

function CobrancasInner() {
  const params = useSearchParams();
  const empParam = params.get("emp");
  const [rows, setRows] = useState<Row[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("aberto");
  const [credorFiltro, setCredorFiltro] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<number | null>(null);

  const load = useCallback(async () => {
    const data: Row[] = await fetch("/api/cobrancas").then((r) => r.json());
    setRows(empParam ? data.filter((d) => d.cobranca.emprestimoId === Number(empParam)) : data);
    setLoading(false);
  }, [empParam]);

  useEffect(() => {
    let active = true;

    fetch("/api/cobrancas")
      .then((r) => r.json())
      .then((data: Row[]) => {
        if (!active) return;
        setRows(empParam ? data.filter((d) => d.cobranca.emprestimoId === Number(empParam)) : data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        toast.error("Erro ao carregar cobranças");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [empParam]);

  async function registrarPagamento(id: number) {
    setPaying(id);
    const res = await fetch(`/api/cobrancas/${id}/pagar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setPaying(null);
    if (res.ok) {
      toast.success("Pagamento de juros registrado");
      load();
    } else {
      toast.error("Erro ao registrar pagamento");
    }
  }

  const ini = inicioMes();
  const abertas = rows.filter((r) => r.cobranca.status !== "pago");
  const vencidas = rows.filter((r) => r.cobranca.status === "atrasado");
  const recebidoMes = rows
    .filter((r) => r.cobranca.status === "pago" && (r.cobranca.dataPagamento ?? "") >= ini)
    .reduce((s, r) => s + r.cobranca.valor, 0);

  // Credores distintos (ordenados) para o seletor de filtro.
  const credores = Array.from(
    new Set(rows.map((r) => r.credor?.nome).filter((n): n is string => !!n))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const filtered = rows
    .filter((r) => {
      const s = r.cobranca.status;
      const passaStatus =
        filtro === "aberto"
          ? s !== "pago"
          : filtro === "vencidas"
            ? s === "atrasado"
            : filtro === "pagas"
              ? s === "pago"
              : true;
      const passaCredor =
        credorFiltro === "" || credorFiltro === "__all__" || r.credor?.nome === credorFiltro;
      return passaStatus && passaCredor;
    })
    // Datas decrescentes: mais novas primeiro (2026 no topo).
    .sort((a, b) => b.cobranca.vencimento.localeCompare(a.cobranca.vencimento));

  return (
    <div className="flex flex-col gap-5 md:h-[calc(100dvh-3rem)]">
      {/* Cabeçalho */}
      <div className="brand-fade-up shrink-0 space-y-0.5">
        <p className="brand-eyebrow">Operação</p>
        <h1 className="font-heading text-xl font-bold tracking-tight text-card-foreground sm:text-2xl">Cobranças</h1>
      </div>

      {/* KPIs de resumo */}
      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="A cobrar (em aberto)"
          value={formatCurrency(abertas.reduce((s, r) => s + r.cobranca.valor, 0))}
          sub={`${abertas.length} parcela(s)`}
          icon={HandCoins}
          tone="neutral"
        />
        <KpiCard
          label="Recebido este mês"
          value={formatCurrency(recebidoMes)}
          sub="juros pagos no mês"
          icon={CheckCircle}
          tone="success"
        />
        <KpiCard
          label="Vencidas"
          value={String(vencidas.length)}
          sub={formatCurrency(vencidas.reduce((s, r) => s + r.cobranca.valor, 0))}
          icon={AlertTriangle}
          tone={vencidas.length > 0 ? "alert" : "neutral"}
        />
      </div>

      {/* Toolbar: credor + filtros de status */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <Select value={credorFiltro} onValueChange={(v: string | null) => setCredorFiltro(v ?? "")}>
          <SelectTrigger size="sm" className="w-[200px]">
            <SelectValue placeholder="Todos os credores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os credores</SelectItem>
            {credores.map((nome) => (
              <SelectItem key={nome} value={nome}>
                {nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["aberto", "Em aberto"],
              ["vencidas", "Vencidas"],
              ["pagas", "Pagas"],
              ["todas", "Todas"],
            ] as [Filtro, string][]
          ).map(([key, label]) => (
            <FilterChip key={key} active={filtro === key} onClick={() => setFiltro(key)}>
              {label}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <Card className="flex flex-col overflow-hidden py-0 md:min-h-0 md:flex-1">
        <CardContent className="flex flex-col px-0 md:min-h-0 md:flex-1">
          {/* Mobile: cards empilhados — sem scroll interno, rola com a página */}
          <ul className="space-y-2.5 p-3 md:hidden">
            {loading && (
              <li className="py-10 text-center text-sm text-muted-foreground">Carregando…</li>
            )}
            {!loading && filtered.length === 0 && (
              <li className="py-10 text-center text-sm text-muted-foreground">Nenhuma cobrança neste filtro</li>
            )}
            {filtered.map(({ cobranca: c, credor }) => {
              const atrasado = c.status === "atrasado";
              const pago = c.status === "pago";
              const accent = pago ? "bg-success" : atrasado ? "bg-destructive" : "bg-warning";
              const badgeCls = pago
                ? "bg-success/10 text-success"
                : atrasado
                  ? "bg-destructive/10 text-destructive"
                  : "bg-warning/10 text-warning";
              const badgeLabel = pago ? "Pago" : atrasado ? "Atrasado" : "Pendente";
              return (
                <li key={c.id} className="relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                  <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
                  <div className="p-3.5 pl-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold leading-tight text-foreground">{credor?.nome ?? "—"}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCls}`}>
                            {pago ? <CheckCircle size={11} /> : atrasado ? <AlertTriangle size={11} /> : <Clock size={11} />}
                            {badgeLabel}
                          </span>
                          <span className="text-[11px] capitalize text-muted-foreground tabular-nums">{compLabel(c.competencia)}</span>
                        </div>
                      </div>
                      <Money value={c.valor} className="shrink-0 text-[15px] font-bold text-foreground" />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2.5 py-2">
                      <span className="text-[11px] text-muted-foreground tabular-nums">vence {formatDate(c.vencimento)}</span>
                      {pago ? (
                        <span className="text-[11px] font-medium text-success tabular-nums">
                          {c.dataPagamento ? `pago ${formatDate(c.dataPagamento)}` : "pago"}
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7" disabled={paying === c.id} onClick={() => registrarPagamento(c.id)}>
                          <Check size={12} className="mr-1" />
                          {paying === c.id ? "..." : "Pagar"}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {/* Desktop: tabela */}
          <div className="hidden min-h-0 flex-1 flex-col md:flex">
          <Table containerClassName="h-full overflow-y-auto">
            <TableHeader className="sticky top-0 z-20 bg-card/95 backdrop-blur">
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-muted-foreground">CREDOR</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">COMPETÊNCIA</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">VENCIMENTO</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground">VALOR</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">STATUS</TableHead>
                <TableHead className="w-[140px] text-right text-xs font-semibold text-muted-foreground" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                    Nenhuma cobrança neste filtro
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(({ cobranca: c, credor }) => {
                const atrasado = c.status === "atrasado";
                const pago = c.status === "pago";
                const badgeCls = pago
                  ? "bg-success/10 text-success"
                  : atrasado
                    ? "bg-destructive/10 text-destructive"
                    : "bg-warning/10 text-warning";
                const badgeLabel = pago ? "Pago" : atrasado ? "Atrasado" : "Pendente";
                return (
                  <TableRow key={c.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium text-foreground">{credor?.nome ?? "—"}</TableCell>
                    <TableCell className="capitalize tabular-nums">{compLabel(c.competencia)}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(c.vencimento)}</TableCell>
                    <TableCell className="min-w-[120px]">
                      <Money value={c.valor} className="text-sm font-semibold text-foreground" />
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badgeCls}`}>
                        {pago ? <CheckCircle size={12} /> : atrasado ? <AlertTriangle size={12} /> : <Clock size={12} />}
                        {badgeLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {pago ? (
                        <span className="text-xs font-medium text-success tabular-nums">
                          {c.dataPagamento ? `pago ${formatDate(c.dataPagamento)}` : "pago"}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          disabled={paying === c.id}
                          onClick={() => registrarPagamento(c.id)}
                        >
                          <Check size={12} className="mr-1" />
                          {paying === c.id ? "..." : "Pagar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone?: "neutral" | "success" | "warning" | "alert";
}) {
  const isAlert = tone === "alert";
  const iconCls =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/10 text-warning"
        : isAlert
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary";
  return (
    <Card className={isAlert ? "py-5 bg-destructive-muted ring-destructive/25" : "py-5"}>
      <CardContent className="px-5">
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
            {sub && <p className="mt-1 truncate text-xs text-muted-foreground tabular-nums">{sub}</p>}
          </div>
          <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${iconCls}`}>
            <Icon size={18} strokeWidth={2} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function CobrancasPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted-foreground">Carregando…</div>}>
      <CobrancasInner />
    </Suspense>
  );
}
