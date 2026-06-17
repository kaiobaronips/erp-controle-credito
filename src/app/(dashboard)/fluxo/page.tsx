"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Banknote, Plus, TrendingUp } from "lucide-react";
import type { FluxoCaixa } from "@/lib/db/schema";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const CATEGORIAS = [
  { value: "emprestimo_concedido", label: "Empréstimo Concedido" },
  { value: "parcela_recebida", label: "Parcela Recebida" },
  { value: "devolucao", label: "Devolução" },
  { value: "garantia_executada", label: "Garantia Executada" },
  { value: "juros", label: "Juros" },
  { value: "taxa", label: "Taxa / Tarifa" },
  { value: "outro", label: "Outro" },
  { value: "outras", label: "Outras" },
];

const fmtNum = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function shortMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

function Money({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`flex items-baseline justify-end gap-1 tabular-nums ${className ?? ""}`}>
      <span className="shrink-0 text-[10px] text-muted-foreground/40">R$</span>
      <span>{fmtNum.format(value)}</span>
    </div>
  );
}

function categoriaLabel(value: string | null) {
  if (!value) return "Sem categoria";
  return CATEGORIAS.find((c) => c.value === value)?.label ?? value;
}

function TipoBadge({ tipo }: { tipo: string }) {
  const isEntrada = tipo === "entrada";
  const Icon = isEntrada ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isEntrada ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
      }`}
    >
      <Icon size={12} />
      {isEntrada ? "Entrada" : "Saída"}
    </span>
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
  icon: typeof Banknote;
  tone?: "neutral" | "success" | "danger";
}) {
  const iconCls =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "danger"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/10 text-primary";
  const valueCls =
    tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-foreground";

  return (
    <Card className="py-5">
      <CardContent className="px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={`mt-1.5 text-lg sm:text-2xl font-bold tracking-tight tabular-nums break-all ${valueCls}`}>{value}</p>
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

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{label ? shortMonth(label) : "Saldo"}</p>
      <p className="mt-1 font-semibold tabular-nums text-popover-foreground">
        {formatCurrency(Number(payload[0]?.value ?? 0))}
      </p>
    </div>
  );
}

function FluxoForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    tipo: "entrada",
    valor: "",
    descricao: "",
    data: new Date().toISOString().split("T")[0],
    categoria: "outro",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/fluxo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, valor: parseFloat(form.valor) }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Lançamento registrado!");
      onSave();
      onClose();
    } else {
      toast.error("Erro ao registrar lançamento");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Tipo *</Label>
          <Select value={form.tipo} onValueChange={(v: string | null) => setForm({ ...form, tipo: v ?? "" })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Valor (R$) *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            required
          />
        </div>

        <div className="col-span-2 space-y-1">
          <Label>Descrição *</Label>
          <Input
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            required
          />
        </div>

        <div className="space-y-1">
          <Label>Categoria</Label>
          <Select value={form.categoria} onValueChange={(v: string | null) => setForm({ ...form, categoria: v ?? "" })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Data *</Label>
          <Input
            type="date"
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Registrar"}
        </Button>
      </div>
    </form>
  );
}

export default function FluxoPage() {
  const [fluxo, setFluxo] = useState<FluxoCaixa[]>([]);
  const [open, setOpen] = useState(false);
  const [filtroMes, setFiltroMes] = useState("");

  async function load() {
    const data = await fetch("/api/fluxo").then((r) => r.json());
    setFluxo(data);
  }

  useEffect(() => {
    let active = true;

    fetch("/api/fluxo")
      .then((r) => r.json())
      .then((data: FluxoCaixa[]) => {
        if (active) setFluxo(data);
      })
      .catch(() => {
        if (active) toast.error("Erro ao carregar fluxo de caixa");
      });

    return () => {
      active = false;
    };
  }, []);

  const meses = [...new Set(fluxo.map((f) => f.data.slice(0, 7)))].sort().reverse();
  const filtered = filtroMes ? fluxo.filter((f) => f.data.startsWith(filtroMes)) : fluxo;

  const totalEntradas = filtered
    .filter((f) => f.tipo === "entrada")
    .reduce((s, f) => s + f.valor, 0);
  const totalSaidas = filtered
    .filter((f) => f.tipo === "saida")
    .reduce((s, f) => s + f.valor, 0);
  const saldoPeriodo = totalEntradas - totalSaidas;

  const saldoAcum: { data: string; saldo: number }[] = [];
  let saldo = 0;
  [...fluxo]
    .toSorted((a, b) => a.data.localeCompare(b.data))
    .forEach((f) => {
      saldo += f.tipo === "entrada" ? f.valor : -f.valor;
      saldoAcum.push({ data: f.data, saldo: Math.round(saldo * 100) / 100 });
    });

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] flex-col gap-6 sm:h-[calc(100dvh-6.5rem)] md:h-[calc(100dvh-3rem)]">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Fluxo de Caixa</h1>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1.5" /> Lançamento
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Lançamento</DialogTitle>
            </DialogHeader>
            <FluxoForm onSave={load} onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Entradas"
          value={formatCurrency(totalEntradas)}
          sub={`${filtered.filter((f) => f.tipo === "entrada").length} lançamento(s)`}
          icon={ArrowDownLeft}
          tone="success"
        />
        <KpiCard
          label="Saídas"
          value={formatCurrency(totalSaidas)}
          sub={`${filtered.filter((f) => f.tipo === "saida").length} lançamento(s)`}
          icon={ArrowUpRight}
          tone="danger"
        />
        <KpiCard
          label="Saldo"
          value={formatCurrency(saldoPeriodo)}
          sub={filtroMes ? shortMonth(filtroMes) : "período completo"}
          icon={TrendingUp}
          tone={saldoPeriodo >= 0 ? "neutral" : "danger"}
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <div className="flex min-h-0 flex-col gap-5">
          <Card className="shrink-0 py-4">
            <CardContent className="px-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">Saldo acumulado</h2>
                <span className="text-xs text-muted-foreground tabular-nums">{fluxo.length} lançamentos</span>
              </div>
              {saldoAcum.length > 1 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={saldoAcum} margin={{ top: 6, right: 6, bottom: 0, left: -8 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="data"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) => shortMonth(String(v).slice(0, 7))}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="saldo"
                      stroke="var(--chart-1)"
                      fill="var(--chart-1)"
                      fillOpacity={0.14}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
                  Sem movimentação suficiente para gráfico
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-h-0 flex-1 py-4">
            <CardContent className="px-4">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={filtroMes || "__all__"} onValueChange={(v: string | null) => setFiltroMes(v === "__all__" ? "" : v ?? "")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os meses</SelectItem>
                    {meses.map((m) => (
                      <SelectItem key={m} value={m}>
                        {shortMonth(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="flex min-h-0 flex-col overflow-hidden py-0">
          <CardContent className="min-h-0 flex-1 px-0 flex flex-col">
            {/* Mobile: cards empilhados */}
            <ul className="md:hidden flex-1 overflow-y-auto space-y-2.5 p-3">
              {filtered.length === 0 && (
                <li className="py-16 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado</li>
              )}
              {filtered.map((f) => {
                const isEntrada = f.tipo === "entrada";
                return (
                  <li key={f.id} className="relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                    <span className={`absolute inset-y-0 left-0 w-1 ${isEntrada ? "bg-success" : "bg-destructive"}`} />
                    <div className="flex items-center justify-between gap-3 p-3.5 pl-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <TipoBadge tipo={f.tipo} />
                          <span className="text-[11px] text-muted-foreground tabular-nums">{formatDate(f.data)}</span>
                        </div>
                        <p className="text-[15px] font-bold leading-snug text-foreground">{f.descricao}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/60">{categoriaLabel(f.categoria)}</p>
                      </div>
                      <Money value={f.valor} className={`shrink-0 text-[15px] font-bold ${isEntrada ? "text-success" : "text-destructive"}`} />
                    </div>
                  </li>
                );
              })}
            </ul>
            {/* Desktop */}
            <div className="hidden md:flex min-h-0 flex-1 flex-col">
              <Table containerClassName="h-full overflow-y-auto">
                <TableHeader className="sticky top-0 z-20 bg-card/95 backdrop-blur">
                  <TableRow className="border-b hover:bg-transparent">
                    <TableHead className="pl-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Tipo</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Descrição</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Categoria</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Data</TableHead>
                    <TableHead className="pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-16 text-center text-muted-foreground">Nenhum lançamento encontrado</TableCell></TableRow>
                  )}
                  {filtered.map((f) => (
                    <TableRow key={f.id} className="group border-l-2 border-transparent transition-colors hover:border-primary/50 hover:bg-muted/25">
                      <TableCell className="pl-4"><TipoBadge tipo={f.tipo} /></TableCell>
                      <TableCell className="min-w-[260px] py-3">
                        <span className="text-sm font-semibold leading-tight text-foreground">{f.descricao}</span>
                      </TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{categoriaLabel(f.categoria)}</span></TableCell>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatDate(f.data)}</TableCell>
                      <TableCell className="min-w-[120px] pr-4">
                        <Money value={f.valor} className={`text-sm font-bold ${f.tipo === "entrada" ? "text-success" : "text-destructive"}`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
