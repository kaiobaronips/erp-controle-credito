"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Banknote, ChevronsUpDown, Pencil, Plus, Trash2, Users } from "lucide-react";
import type { Credor } from "@/lib/db/schema";

type EmprestimoStatus = "ativo" | "parcial" | "quitado" | "executado" | "devedor";

type CredorRow = Credor & {
  rowId: string;
  emprestimoId: number | null;
  emprestimoData: string | null;
  emprestimoValor: number;
  emprestimosTotal: number;
  status: EmprestimoStatus | null;
};

const STATUS_META: Record<EmprestimoStatus, { label: string; cls: string }> = {
  ativo:     { label: "Ativo",     cls: "bg-success/10 text-success" },
  parcial:   { label: "Parcial",   cls: "bg-warning/10 text-warning" },
  quitado:   { label: "Quitado",   cls: "bg-info/10 text-info" },
  executado: { label: "Executado", cls: "bg-destructive/10 text-destructive" },
  devedor:   { label: "Pendente",  cls: "bg-warning/10 text-warning" },
};

const STATUS_ACCENT: Record<EmprestimoStatus, string> = {
  ativo: "bg-success",
  parcial: "bg-warning",
  quitado: "bg-info",
  executado: "bg-destructive",
  devedor: "bg-warning",
};

type DateSort = "asc" | "desc";
type StatusFiltro = "todos" | EmprestimoStatus;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const fmtNum = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Money({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`flex items-baseline justify-end gap-1 tabular-nums ${className ?? ""}`}>
      <span className="text-[10px] text-muted-foreground/40 shrink-0">R$</span>
      <span>{fmtNum.format(value)}</span>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const [date] = value.split(" ");
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(parsed);
}

function dateSortValue(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const [date] = value.split(" ");
  const timestamp = new Date(`${date}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function StatusBadge({ status }: { status: EmprestimoStatus | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
      {meta.label}
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
  icon: typeof Users;
  tone?: "neutral" | "success" | "warning";
}) {
  const iconCls =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/10 text-warning"
        : "bg-primary/10 text-primary";
  return (
    <Card className="py-5">
      <CardContent className="px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1.5 text-lg sm:text-2xl font-bold tracking-tight tabular-nums text-foreground break-all">
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

function CredorForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Credor>;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    cpfCnpj: initial?.cpfCnpj ?? "",
    email: initial?.email ?? "",
    telefone: initial?.telefone ?? "",
    endereco: initial?.endereco ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const method = initial?.id ? "PUT" : "POST";
    const url = initial?.id ? `/api/credores/${initial.id}` : "/api/credores";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false);
    if (res.ok) {
      toast.success(initial?.id ? "Credor atualizado!" : "Credor cadastrado!");
      onSave();
      onClose();
    } else {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Erro ao salvar credor");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Nome *</Label>
          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        </div>
        <div className="space-y-1">
          <Label>CPF / CNPJ</Label>
          <Input value={form.cpfCnpj} onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Telefone</Label>
          <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>E-mail</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Endereço</Label>
          <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Observações</Label>
          <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
      </div>
    </form>
  );
}

export default function CredoresPage() {
  const [credores, setCredores] = useState<CredorRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CredorRow | null>(null);
  const [search, setSearch] = useState("");
  const [dateSort, setDateSort] = useState<DateSort>("asc");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");

  async function load() {
    const res = await fetch("/api/credores");
    if (!res.ok) {
      toast.error("Erro ao carregar credores");
      return;
    }
    const data = await res.json();
    setCredores(data);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/credores")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar credores");
        return res.json();
      })
      .then((data) => {
        if (active) setCredores(data);
      })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : "Erro ao carregar credores");
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleDelete(id: number, nome: string) {
    if (!confirm(`Remover ${nome}?`)) return;
    const res = await fetch(`/api/credores/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Erro ao remover credor");
      return;
    }
    toast.success("Credor removido");
    load();
  }

  const filtered = credores
    .filter((c) => statusFiltro === "todos" || c.status === statusFiltro)
    .filter((c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.cpfCnpj ?? "").includes(search)
    )
    .toSorted((a, b) => {
      const result = dateSortValue(a.emprestimoData) - dateSortValue(b.emprestimoData);
      return dateSort === "asc" ? result : -result;
    });

  const totalCredores = new Set(credores.map((c) => c.id)).size;
  const ativos = new Set(credores.filter((c) => c.status === "ativo" || c.status === "parcial").map((c) => c.id)).size;
  const quitados = new Set(credores.filter((c) => c.status === "quitado").map((c) => c.id)).size;
  const valorEmprestado = credores.reduce((s, c) => s + c.emprestimoValor, 0);

  const statusChips: { v: StatusFiltro; label: string }[] = [
    { v: "todos", label: "Todos" },
    { v: "ativo", label: "Ativo" },
    { v: "parcial", label: "Parcial" },
    { v: "quitado", label: "Quitado" },
    { v: "executado", label: "Executado" },
    { v: "devedor", label: "Devedor" },
  ];

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] flex-col gap-6 sm:h-[calc(100dvh-6.5rem)] md:h-[calc(100dvh-3rem)]">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <p className="brand-eyebrow">Operação</p>
          <h1 className="font-heading text-xl font-bold tracking-tight text-card-foreground sm:text-2xl">Credores</h1>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus size={16} className="mr-2" /> Novo Credor
        </Button>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Credor" : "Novo Credor"}</DialogTitle>
            </DialogHeader>
            <CredorForm
              initial={editing ?? undefined}
              onSave={load}
              onClose={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total de credores" value={String(totalCredores)} sub="cadastrados" icon={Users} />
        <KpiCard label="Ativos" value={String(ativos)} sub="empréstimo em aberto" icon={Users} tone="success" />
        <KpiCard label="Valor emprestado" value={formatCurrency(valorEmprestado)} sub="principal total" icon={Banknote} />
        <KpiCard label="Quitados" value={String(quitados)} sub="crédito encerrado" icon={Users} tone="warning" />
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Buscar por nome ou CPF/CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {statusChips.map((chip) => (
            <FilterChip
              key={chip.v}
              active={statusFiltro === chip.v}
              onClick={() => setStatusFiltro(chip.v)}
            >
              {chip.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden py-0">
        <CardContent className="min-h-0 flex-1 px-0 flex flex-col">
          {/* Mobile: cards empilhados */}
          <ul className="md:hidden flex-1 overflow-y-auto space-y-2.5 p-3">
            {filtered.length === 0 && (
              <li className="py-16 text-center text-sm text-muted-foreground">Nenhum credor encontrado</li>
            )}
            {filtered.map((c) => {
              const accent = c.status ? STATUS_ACCENT[c.status] : "bg-muted-foreground/30";
              return (
                <li key={c.rowId} className="relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                  <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
                  <div className="p-3.5 pl-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold leading-tight text-foreground">{c.nome}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <StatusBadge status={c.status} />
                          <span className="text-[11px] text-muted-foreground tabular-nums">{formatDate(c.emprestimoData)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="size-8 p-0" onClick={() => { setEditing(c); setOpen(true); }}>
                          <Pencil size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id, c.nome)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3 rounded-lg bg-muted/30 p-2.5">
                      <div className="min-w-0 space-y-0.5">
                        {c.cpfCnpj && <p className="truncate text-[11px] text-muted-foreground/70">{c.cpfCnpj}</p>}
                        {c.telefone && <p className="truncate text-[11px] text-muted-foreground/70">{c.telefone}</p>}
                        {c.email && <p className="truncate text-[11px] text-muted-foreground/70">{c.email}</p>}
                        {!c.cpfCnpj && !c.telefone && !c.email && <p className="text-[11px] text-muted-foreground/40">Sem contato</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">Valor</p>
                        <Money value={c.emprestimoValor} className="text-[13px] font-bold text-foreground" />
                      </div>
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
                  <TableHead className="w-[36%] pl-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">CREDOR</TableHead>
                  <TableHead className="w-[18%] text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    <button
                      type="button"
                      onClick={() => setDateSort((current) => (current === "asc" ? "desc" : "asc"))}
                      className="inline-flex items-center gap-1.5 rounded-sm text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-label={`Ordenar data do emprestimo em ordem ${dateSort === "asc" ? "decrescente" : "crescente"}`}
                    >
                      DATA DO EMPRÉSTIMO
                      <ChevronsUpDown size={13} className={dateSort === "asc" ? "rotate-180 text-primary" : "text-primary"} />
                    </button>
                  </TableHead>
                  <TableHead className="w-[20%] text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">VALOR</TableHead>
                  <TableHead className="w-[20%] text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">STATUS</TableHead>
                  <TableHead className="w-[88px] text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">Nenhum credor encontrado</TableCell>
                  </TableRow>
                )}
                {filtered.map((c) => (
                  <TableRow key={c.rowId} className="group border-l-2 border-transparent transition-colors hover:border-primary/50 hover:bg-muted/25">
                    <TableCell className="min-w-[260px] py-3 pl-4">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold text-foreground leading-tight">{c.nome}</span>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {c.cpfCnpj && <span className="text-[11px] text-muted-foreground/60">{c.cpfCnpj}</span>}
                          {c.telefone && <span className="text-[11px] text-muted-foreground/60">{c.telefone}</span>}
                          {c.email && <span className="text-[11px] text-muted-foreground/60 truncate">{c.email}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-foreground">{formatDate(c.emprestimoData)}</TableCell>
                    <TableCell className="min-w-[120px]">
                      <Money value={c.emprestimoValor} className="text-sm font-bold text-foreground" />
                    </TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="size-7 p-0" onClick={() => { setEditing(c); setOpen(true); }}>
                          <Pencil size={13} /><span className="sr-only">Editar credor</span>
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id, c.nome)}>
                          <Trash2 size={13} /><span className="sr-only">Remover credor</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
