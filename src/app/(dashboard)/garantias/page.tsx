"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Banknote, Car, FileText, Home, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import type { Credor, Garantia } from "@/lib/db/schema";

type TipoFiltro = "todos" | "imovel" | "veiculo" | "titulo" | "outro";

interface GarantiaRow {
  garantia: Garantia;
  credor: Credor | null;
}

const fmtNum = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const TIPO_META: Record<string, { label: string; icon: typeof Shield; cls: string }> = {
  imovel: { label: "Imóvel", icon: Home, cls: "bg-primary/10 text-primary" },
  veiculo: { label: "Veículo", icon: Car, cls: "bg-success/10 text-success" },
  titulo: { label: "Título", icon: FileText, cls: "bg-warning/10 text-warning" },
  outro: { label: "Outro", icon: Shield, cls: "bg-muted text-muted-foreground" },
};

const TIPO_ACCENT: Record<string, string> = {
  imovel: "bg-primary",
  veiculo: "bg-success",
  titulo: "bg-warning",
  outro: "bg-muted-foreground/40",
};

function Money({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`flex items-baseline justify-end gap-1 tabular-nums ${className ?? ""}`}>
      <span className="shrink-0 text-[10px] text-muted-foreground/40">R$</span>
      <span>{fmtNum.format(value)}</span>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  const meta = TIPO_META[tipo] ?? TIPO_META.outro;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
      <Icon size={12} />
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
  icon: typeof Shield;
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
            <p className="mt-1.5 text-lg sm:text-2xl font-bold tracking-tight tabular-nums text-foreground break-all">{value}</p>
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

function GarantiaForm({
  credores,
  initial,
  onSave,
  onClose,
}: {
  credores: Credor[];
  initial?: Partial<Garantia>;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    tipo: initial?.tipo ?? "imovel",
    descricao: initial?.descricao ?? "",
    valorAvaliado: initial?.valorAvaliado ? String(initial.valorAvaliado) : "",
    documentoRef: initial?.documentoRef ?? "",
    credorId: initial?.credorId ? String(initial.credorId) : "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const method = initial?.id ? "PUT" : "POST";
    const url = initial?.id ? `/api/garantias/${initial.id}` : "/api/garantias";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        valorAvaliado: form.valorAvaliado ? parseFloat(form.valorAvaliado) : null,
        credorId: form.credorId ? parseInt(form.credorId) : null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success(initial?.id ? "Garantia atualizada!" : "Garantia cadastrada!");
      onSave();
      onClose();
    } else {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Erro ao salvar garantia");
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
              <SelectItem value="imovel">Imóvel</SelectItem>
              <SelectItem value="veiculo">Veículo</SelectItem>
              <SelectItem value="titulo">Título/Ativo</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Valor Avaliado (R$)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.valorAvaliado}
            onChange={(e) => setForm({ ...form, valorAvaliado: e.target.value })}
          />
        </div>

        <div className="col-span-2 space-y-1">
          <Label>Descrição *</Label>
          <Input
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Ex: Apartamento 3 quartos, Rua X, nº 100"
            required
          />
        </div>

        <div className="col-span-2 space-y-1">
          <Label>Referência do Documento</Label>
          <Input
            value={form.documentoRef}
            onChange={(e) => setForm({ ...form, documentoRef: e.target.value })}
            placeholder="Matrícula, RENAVAM, etc."
          />
        </div>

        <div className="col-span-2 space-y-1">
          <Label>Credor Vinculado</Label>
          <Select value={form.credorId} onValueChange={(v: string | null) => setForm({ ...form, credorId: v ?? "" })}>
            <SelectTrigger>
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sem vínculo</SelectItem>
              {credores.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

export default function GarantiasPage() {
  const [garantias, setGarantias] = useState<GarantiaRow[]>([]);
  const [credores, setCredores] = useState<Credor[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Garantia | null>(null);
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");

  async function load() {
    const [g, c] = await Promise.all([
      fetch("/api/garantias").then((r) => r.json()),
      fetch("/api/credores").then((r) => r.json()),
    ]);
    setGarantias(g);
    setCredores(c);
  }

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/garantias").then((r) => r.json()),
      fetch("/api/credores").then((r) => r.json()),
    ])
      .then(([g, c]) => {
        if (!active) return;
        setGarantias(g);
        setCredores(c);
      })
      .catch(() => {
        if (active) toast.error("Erro ao carregar garantias");
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Remover esta garantia?")) return;
    const res = await fetch(`/api/garantias/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Erro ao remover garantia");
      return;
    }
    toast.success("Garantia removida");
    load();
  }

  const filtered = garantias
    .filter(({ garantia }) => tipoFiltro === "todos" || garantia.tipo === tipoFiltro)
    .filter(({ garantia, credor }) => {
      const query = search.toLowerCase();
      return (
        garantia.descricao.toLowerCase().includes(query) ||
        (garantia.documentoRef ?? "").toLowerCase().includes(query) ||
        (credor?.nome ?? "").toLowerCase().includes(query)
      );
    })
    .toSorted((a, b) => (b.garantia.valorAvaliado ?? 0) - (a.garantia.valorAvaliado ?? 0));

  const totalValor = garantias.reduce((s, { garantia }) => s + (garantia.valorAvaliado ?? 0), 0);
  const vinculadas = garantias.filter(({ credor }) => Boolean(credor)).length;
  const imoveis = garantias.filter(({ garantia }) => garantia.tipo === "imovel").length;
  const veiculos = garantias.filter(({ garantia }) => garantia.tipo === "veiculo").length;

  const tipoChips: { v: TipoFiltro; label: string }[] = [
    { v: "todos", label: "Todos" },
    { v: "imovel", label: "Imóveis" },
    { v: "veiculo", label: "Veículos" },
    { v: "titulo", label: "Títulos" },
    { v: "outro", label: "Outros" },
  ];

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] flex-col gap-6 sm:h-[calc(100dvh-6.5rem)] md:h-[calc(100dvh-3rem)]">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Garantias</h1>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus size={16} className="mr-2" /> Garantia
        </Button>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Garantia" : "Nova Garantia"}</DialogTitle>
            </DialogHeader>
            <GarantiaForm
              credores={credores}
              initial={editing ?? undefined}
              onSave={load}
              onClose={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Garantias" value={String(garantias.length)} sub="bens cadastrados" icon={Shield} />
        <KpiCard label="Valor avaliado" value={fmtNum.format(totalValor)} sub="total em garantia" icon={Banknote} tone="success" />
        <KpiCard label="Vinculadas" value={String(vinculadas)} sub="com credor" icon={FileText} />
        <KpiCard label="Imóveis / veículos" value={`${imoveis}/${veiculos}`} sub="principais tipos" icon={Home} tone="warning" />
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Buscar por garantia, documento ou credor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {tipoChips.map((chip) => (
            <FilterChip
              key={chip.v}
              active={tipoFiltro === chip.v}
              onClick={() => setTipoFiltro(chip.v)}
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
              <li className="py-16 text-center text-sm text-muted-foreground">
                {garantias.length === 0 ? "Nenhuma garantia cadastrada" : "Nenhuma garantia neste filtro"}
              </li>
            )}
            {filtered.map(({ garantia: g, credor }) => {
              const accent = TIPO_ACCENT[g.tipo] ?? "bg-muted-foreground/40";
              return (
                <li key={g.id} className="relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                  <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
                  <div className="p-3.5 pl-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <TipoBadge tipo={g.tipo} />
                        <p className="mt-1.5 text-[15px] font-bold leading-snug text-foreground">{g.descricao}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="size-8 p-0" onClick={() => { setEditing(g); setOpen(true); }}>
                          <Pencil size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(g.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3 rounded-lg bg-muted/30 p-2.5">
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-[11px] text-muted-foreground/70">
                          {credor?.nome ?? "Sem vínculo"}
                        </p>
                        {g.documentoRef && <p className="truncate text-[11px] text-muted-foreground/70">{g.documentoRef}</p>}
                        {g.createdAt && <p className="text-[11px] text-muted-foreground/50 tabular-nums">{new Date(g.createdAt + "Z").toLocaleDateString("pt-BR")}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">Avaliado</p>
                        <Money value={g.valorAvaliado ?? 0} className="text-[13px] font-bold text-foreground" />
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
                  <TableHead className="pl-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Tipo</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Garantia</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Credor</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Documento</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Valor</TableHead>
                  <TableHead className="pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                      {garantias.length === 0 ? "Nenhuma garantia cadastrada" : "Nenhuma garantia neste filtro"}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(({ garantia: g, credor }) => (
                  <TableRow key={g.id} className="group border-l-2 border-transparent transition-colors hover:border-primary/50 hover:bg-muted/25">
                    <TableCell className="pl-4"><TipoBadge tipo={g.tipo} /></TableCell>
                    <TableCell className="min-w-[260px] py-3">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-semibold leading-tight text-foreground">{g.descricao}</span>
                        <span className="text-[11px] text-muted-foreground/60">
                          {g.createdAt ? new Date(g.createdAt + "Z").toLocaleDateString("pt-BR") : "sem data"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={credor ? "text-xs font-semibold text-foreground" : "text-xs text-muted-foreground"}>{credor?.nome ?? "Sem vínculo"}</span>
                    </TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{g.documentoRef || "—"}</span></TableCell>
                    <TableCell className="min-w-[120px]">
                      <Money value={g.valorAvaliado ?? 0} className="text-sm font-bold text-foreground" />
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="size-7 p-0" onClick={() => { setEditing(g); setOpen(true); }}>
                          <Pencil size={13} /><span className="sr-only">Editar garantia</span>
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(g.id)}>
                          <Trash2 size={13} /><span className="sr-only">Remover garantia</span>
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
