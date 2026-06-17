"use client";
import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency, formatDate, jurosMensal } from "@/lib/finance";

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
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Check,
  Undo2,
  Pencil,
  Banknote,
  CalendarDays,
  Percent,
  Receipt,
  Printer,
} from "lucide-react";

interface Cob {
  id: number;
  competencia: string;
  valor: number;
  vencimento: string;
  status: "pendente" | "pago" | "atrasado";
  dataPagamento: string | null;
  valorPago: number | null;
}
interface Dev {
  id: number;
  valor: number;
  data: string;
  descricao: string;
}
interface Payload {
  emprestimo: {
    id: number;
    valorPrincipal: number;
    taxaJuros: number;
    parcelaMensal: number;
    dataInicio: string | null;
    valorDevolvido: number;
    status: string;
  } | null;
  credor: Credor | null;
  cobrancas: Cob[];
  devolucoes: Dev[];
}

// Linha unificada do histórico: parcela de juros (cobrança) OU devolução de principal.
type Linha = {
  key: string;
  kind: "cobranca" | "devolucao";
  competencia: string; // YYYY-MM (real na cobrança; derivada da data na devolução)
  vencimento: string | null;
  dataPagamento: string | null;
  valor: number;
  status: "pago" | "aberto" | "devolucao";
  cob?: Cob;
};

export default function HistoricoCobrancasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [mesFiltro, setMesFiltro] = useState<string>("");
  const [anoFiltro, setAnoFiltro] = useState<string>("");

  const load = useCallback(async () => {
    const d: Payload = await fetch(`/api/emprestimos/${id}`).then((r) => r.json());
    setData(d);
  }, [id]);

  useEffect(() => {
    let active = true;
    fetch(`/api/emprestimos/${id}`)
      .then((r) => r.json())
      .then((d: Payload) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) toast.error("Erro ao carregar empréstimo");
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function toggle(c: Cob) {
    setBusy(c.id);
    const acao = c.status === "pago" ? "estornar" : "pagar";
    const res = await fetch(`/api/cobrancas/${c.id}/${acao}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setBusy(null);
    if (res.ok) {
      toast.success(acao === "pagar" ? "Pagamento registrado" : "Pagamento estornado");
      load();
    } else {
      toast.error("Não foi possível atualizar");
    }
  }

  if (!data) {
    return <div className="py-16 text-center text-muted-foreground">Carregando…</div>;
  }

  const { emprestimo: e, credor, cobrancas, devolucoes } = data;
  const pagas = cobrancas.filter((c) => c.status === "pago");
  const abertas = cobrancas.filter((c) => c.status !== "pago");

  // Juros pagos = soma das parcelas mensais quitadas.
  const jurosPagos = pagas.reduce((s, c) => s + (c.valorPago ?? c.valor), 0);
  // Crédito devolvido = só o principal devolvido (devoluções), sem as parcelas.
  const creditoDevolvido = devolucoes.reduce((s, d) => s + d.valor, 0);
  // Total pago = tudo que o credor pagou de entrada: parcelas + devoluções.
  const totalPagoGeral = jurosPagos + creditoDevolvido;
  // Em aberto = parcelas de juros ainda não pagas.
  const totalAberto = abertas.reduce((s, c) => s + c.valor, 0);

  // Histórico unificado: parcelas de juros + devoluções de principal.
  const linhas: Linha[] = [
    ...cobrancas.map((c): Linha => ({
      key: `cob-${c.id}`,
      kind: "cobranca",
      competencia: c.competencia,
      vencimento: c.vencimento,
      dataPagamento: c.status === "pago" ? c.dataPagamento : null,
      valor: c.status === "pago" ? (c.valorPago ?? c.valor) : c.valor,
      status: c.status === "pago" ? "pago" : "aberto",
      cob: c,
    })),
    ...devolucoes.map((d): Linha => ({
      key: `dev-${d.id}`,
      kind: "devolucao",
      competencia: d.data.slice(0, 7),
      vencimento: null,
      dataPagamento: d.data,
      valor: d.valor,
      status: "devolucao",
    })),
  ];
  const dataChave = (l: Linha) => l.dataPagamento ?? l.vencimento ?? `${l.competencia}-01`;
  linhas.sort((a, b) => dataChave(b).localeCompare(dataChave(a)));

  const anos = Array.from(new Set(linhas.map((l) => l.competencia.slice(0, 4)))).sort((a, b) =>
    b.localeCompare(a)
  );
  const linhasFiltradas = linhas.filter(
    (l) =>
      (!mesFiltro || l.competencia.slice(5, 7) === mesFiltro) &&
      (!anoFiltro || l.competencia.slice(0, 4) === anoFiltro)
  );

  return (
    <div className="flex flex-col gap-5 md:h-[calc(100dvh-3rem)]">
      <Link
        href="/emprestimos"
        className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={15} /> Empréstimos
      </Link>

      {/* Header completo do credor */}
      <Card className="shrink-0 py-4">
        <CardContent className="px-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {credor?.nome ?? "—"}
            </h1>
            <div className="flex shrink-0 items-center gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={13} className="mr-1.5" /> Editar
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer size={13} className="mr-1.5" /> PDF
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <HeaderField
              icon={Banknote}
              label="Valor emprestado"
              value={e ? formatCurrency(e.valorPrincipal) : "—"}
            />
            <HeaderField
              icon={CalendarDays}
              label="Data de início"
              value={e?.dataInicio ? formatDate(e.dataInicio) : "—"}
            />
            <HeaderField
              icon={Percent}
              label="Juros"
              value={e ? `${e.taxaJuros}% a.m.` : "—"}
            />
            <HeaderField
              icon={Receipt}
              label="Valor da parcela"
              value={e ? formatCurrency(e.parcelaMensal) : "—"}
            />
          </div>
        </CardContent>
      </Card>

      {e && (
        <EditEmprestimoDialog
          key={`${e.id}-${editOpen ? "open" : "closed"}-${e.valorPrincipal}-${e.taxaJuros}-${e.parcelaMensal}-${e.dataInicio ?? ""}`}
          open={editOpen}
          onOpenChange={setEditOpen}
          emprestimo={e}
          onSaved={() => {
            setEditOpen(false);
            load();
          }}
        />
      )}

      {/* Cards de resumo */}
      <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        <ResumoCard
          label="Crédito devolvido"
          value={formatCurrency(creditoDevolvido)}
          sub={`${devolucoes.length} devolução(ões)`}
          icon={Undo2}
          tone="success"
        />
        <ResumoCard
          label="Total pago"
          value={formatCurrency(totalPagoGeral)}
          sub="parcelas + crédito"
          icon={CheckCircle}
          tone="success"
        />
        <ResumoCard
          label="Juros pagos (juros mensal)"
          value={formatCurrency(jurosPagos)}
          sub={`${pagas.length} parcela(s)`}
          icon={Percent}
          tone="neutral"
        />
        <ResumoCard
          label="Em aberto"
          value={formatCurrency(totalAberto)}
          sub={`${abertas.length} parcela(s)`}
          icon={AlertTriangle}
          tone="alert"
        />
      </div>

      {/* Tabela mensal — uma linha por competência */}
      {linhas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {e?.dataInicio
              ? "Nenhuma competência gerada ainda."
              : "Este empréstimo não tem data de início — defina-a para gerar o cronograma de cobranças."}
          </CardContent>
        </Card>
      ) : (
        <Card className="flex flex-col overflow-hidden py-0 md:min-h-0 md:flex-1">
          <CardContent className="flex flex-col px-0 md:min-h-0 md:flex-1">
            {/* Filtros mobile */}
            <div className="md:hidden flex items-center gap-2 border-b border-border px-4 py-2">
              <Select value={mesFiltro} onValueChange={(v: string | null) => setMesFiltro(v === "__all__" ? "" : v ?? "")}>
                <SelectTrigger size="sm" className="h-7 flex-1 border-border">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os meses</SelectItem>
                  {MESES.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={anoFiltro} onValueChange={(v: string | null) => setAnoFiltro(v === "__all__" ? "" : v ?? "")}>
                <SelectTrigger size="sm" className="h-7 w-[80px] border-border">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {anos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Mobile: cards empilhados — sem scroll interno, rola com a página */}
            <ul className="space-y-2.5 p-3 md:hidden">
              {linhasFiltradas.length === 0 && (
                <li className="py-10 text-center text-sm text-muted-foreground">Nenhuma competência neste filtro</li>
              )}
              {linhasFiltradas.map((l) => {
                const isDev = l.kind === "devolucao";
                const accent = isDev ? "bg-primary" : l.status === "pago" ? "bg-success" : "bg-destructive";
                return (
                  <li key={l.key} className="relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                    <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
                    <div className="flex items-center justify-between gap-3 p-3.5 pl-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold capitalize text-foreground">
                          {isDev ? "Devolução" : mesNome(l.competencia)} {l.competencia.slice(0, 4)}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {l.vencimento && <span className="text-[11px] text-muted-foreground/60">vence {formatDate(l.vencimento)}</span>}
                          {l.dataPagamento && <span className="text-[11px] text-muted-foreground/60">pago {formatDate(l.dataPagamento)}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Money value={l.valor} className="text-[15px] font-bold text-foreground" />
                        {isDev ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            <Banknote size={11} /> Devolução
                          </span>
                        ) : (
                          <button
                            disabled={busy === l.cob!.id}
                            onClick={() => toggle(l.cob!)}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                              l.status === "pago" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {l.status === "pago" ? <Check size={11} /> : <Undo2 size={11} className="rotate-180" />}
                            {l.status === "pago" ? "Pago" : "Aberto"}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {/* Desktop: tabela */}
            <div className="hidden md:flex min-h-0 flex-1 flex-col">
              <Table containerClassName="h-full overflow-y-auto">
                <TableHeader className="sticky top-0 z-20 bg-card/95 backdrop-blur">
                  <TableRow className="border-b hover:bg-transparent">
                    <TableHead className="w-[120px]">
                      <Select value={mesFiltro} onValueChange={(v: string | null) => setMesFiltro(v === "__all__" ? "" : v ?? "")}>
                        <SelectTrigger size="sm" className="h-7 w-[104px] border-0 px-1 font-medium shadow-none">
                          <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todos os meses</SelectItem>
                          {MESES.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="w-[110px]">
                      <Select value={anoFiltro} onValueChange={(v: string | null) => setAnoFiltro(v === "__all__" ? "" : v ?? "")}>
                        <SelectTrigger size="sm" className="h-7 w-[94px] border-0 px-1 font-medium shadow-none">
                          <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todos os anos</SelectItem>
                          {anos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Data pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhasFiltradas.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhuma competência neste filtro</TableCell></TableRow>
                  )}
                  {linhasFiltradas.map((l) => {
                    const isDev = l.kind === "devolucao";
                    return (
                      <TableRow key={l.key} className={`hover:bg-muted/40 ${isDev ? "bg-primary/[0.035]" : ""}`}>
                        <TableCell className="font-medium capitalize">{isDev ? "Devolução" : mesNome(l.competencia)}</TableCell>
                        <TableCell className="tabular-nums">{l.competencia.slice(0, 4)}</TableCell>
                        <TableCell className="tabular-nums">{l.vencimento ? formatDate(l.vencimento) : "—"}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{l.dataPagamento ? formatDate(l.dataPagamento) : "—"}</TableCell>
                        <TableCell className="min-w-[120px]">
                          <Money value={l.valor} className="text-sm font-semibold text-foreground" />
                        </TableCell>
                        <TableCell className="text-right">
                          {isDev ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                              <Banknote size={12} /> Devolução
                            </span>
                          ) : (
                            <button
                              disabled={busy === l.cob!.id}
                              onClick={() => toggle(l.cob!)}
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                l.status === "pago" ? "bg-success/15 text-success hover:bg-success/25" : "bg-destructive/15 text-destructive hover:bg-destructive/25"
                              }`}
                            >
                              {l.status === "pago" ? <Check size={12} /> : <Undo2 size={12} className="rotate-180" />}
                              {l.status === "pago" ? "Pago" : "Aberto"}
                            </button>
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
      )}
    </div>
  );
}

const MESES = [
  { v: "01", l: "Jan" }, { v: "02", l: "Fev" }, { v: "03", l: "Mar" },
  { v: "04", l: "Abr" }, { v: "05", l: "Mai" }, { v: "06", l: "Jun" },
  { v: "07", l: "Jul" }, { v: "08", l: "Ago" }, { v: "09", l: "Set" },
  { v: "10", l: "Out" }, { v: "11", l: "Nov" }, { v: "12", l: "Dez" },
];

function mesNome(competencia: string) {
  const m = competencia.slice(5, 7);
  return MESES.find((x) => x.v === m)?.l ?? m;
}

function HeaderField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] leading-4 font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="whitespace-nowrap text-[13px] leading-5 font-medium tabular-nums text-foreground sm:text-base">{value}</p>
      </div>
    </div>
  );
}

function EditEmprestimoDialog({
  open,
  onOpenChange,
  emprestimo,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  emprestimo: { id: number; valorPrincipal: number; taxaJuros: number; parcelaMensal: number; dataInicio: string | null };
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    valorPrincipal: String(emprestimo.valorPrincipal),
    taxaJuros: String(emprestimo.taxaJuros),
    dataInicio: emprestimo.dataInicio ?? "",
    parcelaMensal: String(emprestimo.parcelaMensal),
  });
  const [saving, setSaving] = useState(false);

  // Recalcula a parcela automaticamente ao mudar principal/juros.
  function setPrincipalOuJuros(campo: "valorPrincipal" | "taxaJuros", v: string) {
    const next = { ...form, [campo]: v };
    const p = parseFloat(campo === "valorPrincipal" ? v : form.valorPrincipal);
    const t = parseFloat(campo === "taxaJuros" ? v : form.taxaJuros);
    if (p > 0 && t > 0) next.parcelaMensal = String(jurosMensal(p, t));
    setForm(next);
  }

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/emprestimos/${emprestimo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        valorPrincipal: parseFloat(form.valorPrincipal),
        taxaJuros: parseFloat(form.taxaJuros),
        dataInicio: form.dataInicio || null,
        parcelaMensal: parseFloat(form.parcelaMensal),
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Empréstimo atualizado");
      onSaved();
    } else {
      toast.error("Erro ao salvar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar empréstimo</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valor emprestado (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.valorPrincipal}
                onChange={(e) => setPrincipalOuJuros("valorPrincipal", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Juros (% a.m.)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.taxaJuros}
                onChange={(e) => setPrincipalOuJuros("taxaJuros", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Data de início</Label>
              <Input
                type="date"
                value={form.dataInicio}
                onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Valor da parcela (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.parcelaMensal}
                onChange={(e) => setForm({ ...form, parcelaMensal: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Alterar a data de início recria o cronograma de cobranças. Alterar a parcela atualiza
            o valor de todas as competências.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResumoCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone: "neutral" | "success" | "alert";
}) {
  const ring =
    tone === "alert" ? "bg-destructive-muted ring-destructive/25" : "";
  const iconCls =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "alert"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/10 text-primary";
  const valCls = tone === "alert" ? "text-destructive" : "text-foreground";
  return (
    <Card className={`py-4 ${ring}`}>
      <CardContent className="px-4">
        {/* Desktop (sm+): bloco de texto à esquerda + ícone à direita (layout original) */}
        <div className="flex items-center justify-between gap-2 sm:items-start sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium leading-snug text-muted-foreground">{label}</p>
            <p className={`mt-1 hidden text-xl font-bold tracking-tight tabular-nums sm:block ${valCls}`}>{value}</p>
            {sub && <p className="mt-0.5 hidden text-xs text-muted-foreground tabular-nums sm:block">{sub}</p>}
          </div>
          <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${iconCls}`}>
            <Icon size={16} />
          </div>
        </div>
        {/* Mobile: valor em linha cheia (não quebra) + sub abaixo */}
        <p className={`mt-1 whitespace-nowrap text-[15px] font-bold tracking-tight tabular-nums sm:hidden ${valCls}`}>{value}</p>
        {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums sm:hidden">{sub}</p>}
      </CardContent>
    </Card>
  );
}
