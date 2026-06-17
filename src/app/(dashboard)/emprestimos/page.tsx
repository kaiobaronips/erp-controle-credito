"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { Plus, Calendar, Check, ChevronsUpDown } from "lucide-react";
import { jurosMensal, valorADevolver, formatCurrency } from "@/lib/finance";
import type { Credor, Garantia } from "@/lib/db/schema";
import Link from "next/link";

interface EmprestimoRow {
  emprestimo: {
    id: number;
    valorPrincipal: number;
    taxaJuros: number;
    parcelaMensal: number;
    modalidade: string;
    dataInicio: string | null;
    valorDevolvido: number;
    mesesInadimplente: number;
    jurosNaoPagos: number;
    status: string;
    observacoes: string | null;
  };
  credor: Credor | null;
  garantia: Garantia | null;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ativo:     { label: "Ativo",     cls: "bg-success/10 text-success" },
  parcial:   { label: "Parcial",   cls: "bg-warning/10 text-warning" },
  quitado:   { label: "Quitado",   cls: "bg-info/10 text-info" },
  executado: { label: "Executado", cls: "bg-destructive/10 text-destructive" },
  devedor:   { label: "Pendente",  cls: "bg-warning/10 text-warning" },
};

const STATUS_ACCENT: Record<string, string> = {
  ativo: "bg-success",
  parcial: "bg-warning",
  quitado: "bg-info",
  executado: "bg-destructive",
  devedor: "bg-warning",
};

const fmtNum = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Money({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`flex items-baseline justify-end gap-1 tabular-nums ${className ?? ""}`}>
      <span className="text-[10px] text-muted-foreground/40 shrink-0">R$</span>
      <span>{fmtNum.format(value)}</span>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">{label}</p>
      {children}
    </div>
  );
}

function EmprestimoForm({
  credores,
  onSave,
  onClose,
}: {
  credores: Credor[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    credorId: "",
    garantiaId: "",
    valorPrincipal: "",
    taxaJuros: "7",
    dataInicio: new Date().toISOString().split("T")[0],
    observacoes: "",
  });
  const [loading, setLoading] = useState(false);

  const p = parseFloat(form.valorPrincipal);
  const r = parseFloat(form.taxaJuros);
  const parcela = p > 0 && r > 0 ? jurosMensal(p, r) : 0;
  const aDevolver = parcela > 0 ? valorADevolver(p, parcela) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!(parcela > 0) || !form.credorId) return;
    setLoading(true);
    const res = await fetch("/api/emprestimos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credorId: parseInt(form.credorId),
        garantiaId: form.garantiaId ? parseInt(form.garantiaId) : null,
        valorPrincipal: p,
        taxaJuros: r,
        dataInicio: form.dataInicio,
        observacoes: form.observacoes,
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Empréstimo registrado");
      onSave();
      onClose();
    } else {
      toast.error("Erro ao registrar empréstimo");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Credor (bem em garantia) *</Label>
          <Select value={form.credorId} onValueChange={(v: string | null) => setForm({ ...form, credorId: v ?? "" })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar credor" />
            </SelectTrigger>
            <SelectContent>
              {credores.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Valor Principal (R$) *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.valorPrincipal}
            onChange={(e) => setForm({ ...form, valorPrincipal: e.target.value })}
            required
          />
        </div>

        <div className="space-y-1">
          <Label>Juros (% ao mês) *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.taxaJuros}
            onChange={(e) => setForm({ ...form, taxaJuros: e.target.value })}
            required
          />
        </div>

        <div className="col-span-2 space-y-1">
          <Label>Data de Início *</Label>
          <Input
            type="date"
            value={form.dataInicio}
            onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
            required
          />
        </div>

        <div className="col-span-2 space-y-1">
          <Label>Observações</Label>
          <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
      </div>

      {parcela > 0 && (
        <div className="space-y-1 rounded-lg border border-primary/20 bg-accent p-3 text-sm">
          <p className="font-semibold text-primary">Simulação — juros mensais</p>
          <div className="flex justify-between">
            <span className="text-primary">Juros por mês:</span>
            <span className="font-bold text-primary tabular-nums">{formatCurrency(parcela)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-primary">A devolver (principal + 1 mês):</span>
            <span className="font-bold text-primary tabular-nums">{formatCurrency(aDevolver)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || !(parcela > 0) || !form.credorId}>
          {loading ? "Salvando..." : "Registrar Empréstimo"}
        </Button>
      </div>
    </form>
  );
}

export default function EmprestimosPage() {
  const [emprestimos, setEmprestimos] = useState<EmprestimoRow[]>([]);
  const [credores, setCredores] = useState<Credor[]>([]);
  const [open, setOpen] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<string>("");
  const [credorFiltro, setCredorFiltro] = useState<string>("");

  async function load() {
    const [emps, creds] = await Promise.all([
      fetch("/api/emprestimos").then((r) => r.json()),
      fetch("/api/credores").then((r) => r.json()),
    ]);
    setEmprestimos(emps);
    setCredores(creds);
  }

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/emprestimos").then((r) => r.json()),
      fetch("/api/credores").then((r) => r.json()),
    ])
      .then(([emps, creds]) => {
        if (!active) return;
        setEmprestimos(emps);
        setCredores(creds);
      })
      .catch(() => {
        if (active) toast.error("Erro ao carregar empréstimos");
      });

    return () => {
      active = false;
    };
  }, []);

  async function alterarStatus(id: number, status: string) {
    await fetch(`/api/emprestimos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast.success("Status atualizado");
    load();
  }

  const vivos = emprestimos.filter(
    ({ emprestimo: e }) => e.status === "ativo" || e.status === "parcial"
  ).length;

  // Credores distintos para o filtro.
  const nomesCredores = Array.from(
    new Set(emprestimos.map((r) => r.credor?.nome).filter((n): n is string => !!n))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const filtered = emprestimos
    .filter(({ emprestimo: e, credor }) => {
      const passaStatus = !statusFiltro || e.status === statusFiltro;
      const passaCredor = !credorFiltro || credor?.nome === credorFiltro;
      return passaStatus && passaCredor;
    })
    .toSorted((a, b) => {
      const atraso = b.emprestimo.mesesInadimplente - a.emprestimo.mesesInadimplente;
      if (atraso !== 0) return atraso;

      const juros = b.emprestimo.jurosNaoPagos - a.emprestimo.jurosNaoPagos;
      if (juros !== 0) return juros;

      return (a.credor?.nome ?? "").localeCompare(b.credor?.nome ?? "", "pt-BR");
    });

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] flex-col gap-5 sm:h-[calc(100dvh-6.5rem)] md:h-[calc(100dvh-3rem)]">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Empréstimos</h1>
          <p className="text-sm text-muted-foreground">
            {emprestimos.length} no total · {vivos} ativo
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1.5" /> Empréstimo
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Empréstimo</DialogTitle>
            </DialogHeader>
            <EmprestimoForm credores={credores} onSave={load} onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Select value={statusFiltro} onValueChange={(v: string | null) => setStatusFiltro(v === "__all__" ? "" : v ?? "")}>
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="quitado">Quitado</SelectItem>
            <SelectItem value="executado">Executado</SelectItem>
            <SelectItem value="devedor">Devedor</SelectItem>
          </SelectContent>
        </Select>
        <CredorCombobox value={credorFiltro} onChange={setCredorFiltro} options={nomesCredores} />
        {(statusFiltro || credorFiltro) && (
          <button
            onClick={() => {
              setStatusFiltro("");
              setCredorFiltro("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar filtros
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} de {emprestimos.length}
        </span>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden py-0">
        <CardContent className="min-h-0 flex-1 px-0 flex flex-col">
          {/* Mobile: cards empilhados (10 colunas não cabem em tela pequena) */}
          <ul className="md:hidden flex-1 overflow-y-auto space-y-2.5 p-3">
            {filtered.length === 0 && (
              <li className="py-16 text-center text-sm text-muted-foreground">
                {emprestimos.length === 0 ? "Nenhum empréstimo cadastrado" : "Nenhum empréstimo neste filtro"}
              </li>
            )}
            {filtered.map(({ emprestimo: e, credor }) => {
              const meta = STATUS_META[e.status] ?? { label: e.status, cls: "bg-muted text-foreground" };
              const accent = STATUS_ACCENT[e.status] ?? "bg-muted-foreground";
              const aDevolver = valorADevolver(e.valorPrincipal, e.parcelaMensal);
              const emAtraso = e.mesesInadimplente > 0 && e.status !== "quitado";
              return (
                <li key={e.id} className="relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                  <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
                  <div className="p-3.5 pl-4">
                    {/* Cabeçalho: credor + status + ação */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold leading-tight text-foreground">{credor?.nome ?? "—"}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                            {meta.label}
                          </span>
                          {e.dataInicio && (
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {new Date(e.dataInicio + "T00:00:00").toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link href={`/emprestimos/${e.id}/cobrancas`} className="shrink-0">
                        <Button size="sm" variant="outline" className="size-8 p-0" title="Cobranças">
                          <Calendar size={14} />
                        </Button>
                      </Link>
                    </div>

                    {/* Valores em grid */}
                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg bg-muted/30 p-2.5">
                      <Campo label="Principal">
                        <Money value={e.valorPrincipal} className="text-[13px] font-bold text-foreground" />
                      </Campo>
                      <Campo label={`Juros/mês · ${e.taxaJuros}%`}>
                        <Money value={e.parcelaMensal} className="text-[13px] font-semibold text-foreground" />
                      </Campo>
                      <Campo label="A devolver">
                        <Money value={aDevolver} className="text-[13px] font-bold text-success" />
                      </Campo>
                      <Campo label="Não pagos">
                        {e.jurosNaoPagos > 0 ? (
                          <Money value={e.jurosNaoPagos} className="text-[13px] font-bold text-destructive" />
                        ) : (
                          <span className="text-[13px] font-semibold text-muted-foreground/40">—</span>
                        )}
                      </Campo>
                    </div>

                    {/* Rodapé: atraso + select */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      {emAtraso ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive tabular-nums">
                          <span className="size-1.5 rounded-full bg-destructive" />
                          {e.mesesInadimplente} {e.mesesInadimplente === 1 ? "mês pendente" : "meses pendentes"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-success">Em dia</span>
                      )}
                      <Select
                        value={["ativo","parcial","quitado","executado","devedor"].includes(e.status) ? e.status : ""}
                        onValueChange={(v: string | null) => { if (v) alterarStatus(e.id, v); }}
                      >
                        <SelectTrigger size="sm" className="h-8 w-[110px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="quitado">Quitado</SelectItem>
                          <SelectItem value="executado">Executado</SelectItem>
                          <SelectItem value="devedor">Devedor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {/* Desktop: tabela completa */}
          <div className="hidden md:flex min-h-0 flex-1 flex-col">
          <Table containerClassName="h-full overflow-y-auto">
            <TableHeader className="sticky top-0 z-20 bg-card/95 backdrop-blur">
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="pl-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Status</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Credor</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Data</TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Principal</TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Juros/mês</TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">%</TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">A devolver</TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Não pagos</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Pendente</TableHead>
                <TableHead className="pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-16 text-center text-muted-foreground">
                    {emprestimos.length === 0 ? "Nenhum empréstimo cadastrado" : "Nenhum empréstimo neste filtro"}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(({ emprestimo: e, credor }) => {
                const meta = STATUS_META[e.status] ?? { label: e.status, cls: "bg-muted text-foreground" };
                const aDevolver = valorADevolver(e.valorPrincipal, e.parcelaMensal);
                const emAtraso = e.mesesInadimplente > 0 && e.status !== "quitado";
                return (
                  <TableRow
                    key={e.id}
                    className="group border-l-2 border-transparent transition-colors hover:border-primary/50 hover:bg-muted/25"
                  >
                    <TableCell className="pl-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-foreground leading-tight whitespace-nowrap">{credor?.nome ?? "—"}</span>
                    </TableCell>
                    <TableCell className="tabular-nums text-xs text-muted-foreground whitespace-nowrap">
                      {e.dataInicio ? new Date(e.dataInicio + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="min-w-[110px]">
                      <Money value={e.valorPrincipal} className="text-xs font-bold text-foreground" />
                    </TableCell>
                    <TableCell className="min-w-[110px]">
                      <Money value={e.parcelaMensal} className="text-xs font-semibold text-foreground" />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs tabular-nums text-muted-foreground">{e.taxaJuros}%</span>
                    </TableCell>
                    <TableCell className="min-w-[110px]">
                      <Money value={aDevolver} className="text-xs font-bold text-success" />
                    </TableCell>
                    <TableCell className="min-w-[110px]">
                      {e.jurosNaoPagos > 0 ? (
                        <Money value={e.jurosNaoPagos} className="text-xs font-bold text-destructive" />
                      ) : (
                        <span className="text-xs text-muted-foreground/40 pl-5">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {emAtraso ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive tabular-nums">
                          <span className="size-1.5 rounded-full bg-destructive" />
                          {e.mesesInadimplente} {e.mesesInadimplente === 1 ? "mês" : "meses"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/emprestimos/${e.id}/cobrancas`}>
                          <Button size="sm" variant="outline" className="size-7 p-0 opacity-60 transition-opacity group-hover:opacity-100" title="Cobranças">
                            <Calendar size={13} />
                          </Button>
                        </Link>
                        <Select
                          value={["ativo","parcial","quitado","executado","devedor"].includes(e.status) ? e.status : ""}
                          onValueChange={(v: string | null) => {
                            if (v) alterarStatus(e.id, v);
                          }}
                        >
                          <SelectTrigger size="sm" className="w-[100px] opacity-70 transition-opacity group-hover:opacity-100">
                            <SelectValue placeholder="Ações" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="quitado">Quitado</SelectItem>
                            <SelectItem value="executado">Executado</SelectItem>
                            <SelectItem value="devedor">Devedor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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

function CredorCombobox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="w-[200px] justify-between font-normal" />
        }
      >
        <span className="truncate">{value || "Todos os credores"}</span>
        <ChevronsUpDown size={14} className="ml-2 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-0">
        <Command>
          <CommandInput placeholder="Buscar credor..." />
          <CommandList>
            <CommandEmpty>Nenhum credor encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Todos os credores"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <Check size={14} className={value === "" ? "opacity-100" : "opacity-0"} />
                Todos os credores
              </CommandItem>
              {options.map((nome) => (
                <CommandItem
                  key={nome}
                  value={nome}
                  onSelect={() => {
                    onChange(nome);
                    setOpen(false);
                  }}
                >
                  <Check size={14} className={value === nome ? "opacity-100" : "opacity-0"} />
                  {nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
