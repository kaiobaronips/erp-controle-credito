"use client";
import { createContext, useContext, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Shield,
  ArrowLeftRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

/* ─── Sidebar collapse context ────────────────────────────────── */
const SidebarCtx = createContext<{ collapsed: boolean; toggle: () => void }>({
  collapsed: false,
  toggle: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <SidebarCtx.Provider value={{ collapsed, toggle: () => setCollapsed((c) => !c) }}>
      {children}
    </SidebarCtx.Provider>
  );
}

/* ─── Nav sections ─────────────────────────────────────────────── */
const sections = [
  {
    label: "Visão Geral",
    items: [{ href: "/overview", label: "Dashboard", title: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operação",
    items: [
      { href: "/credores",   label: "Credores",    title: "Credores",    icon: Users },
      { href: "/emprestimos",label: "Empréstimos", title: "Empréstimos", icon: FileText },
      { href: "/parcelas",   label: "Cobranças",   title: "Cobranças",   icon: Calendar },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/garantias", label: "Garantias",      title: "Garantias",      icon: Shield },
      { href: "/fluxo",     label: "Fluxo de Caixa", title: "Fluxo de Caixa", icon: ArrowLeftRight },
    ],
  },
];

/* ─── Logo ─────────────────────────────────────────────────────── */
function LogoMark() {
  return (
    <Image
      src="/cash-logo.png"
      alt="cash"
      width={1070}
      height={454}
      priority
      className="h-7 w-auto shrink-0"
    />
  );
}

/* ─── Sidebar navigation (shared between desktop rail + mobile sheet) ── */
function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 overflow-y-auto py-3">
      {sections.map((sec) => (
        <div key={sec.label} className="mb-1">
          {!collapsed && (
            <span className="block px-4 pb-1 pt-3 text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
              {sec.label}
            </span>
          )}
          {collapsed && <div className="pb-1 pt-3" />}
          {sec.items.map(({ href, label, title, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={title}
                className={cn(
                  "flex items-center transition-colors duration-150",
                  collapsed
                    ? cn(
                        "mx-2 justify-center rounded-md p-2.5",
                        active
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/65 hover:bg-white/[0.04] hover:text-sidebar-foreground"
                      )
                    : cn(
                        "gap-2.5 border-l-2 px-4 py-2.5 text-sm",
                        active
                          ? "border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-primary"
                          : "border-transparent text-sidebar-foreground/65 hover:bg-white/[0.04] hover:text-sidebar-foreground"
                      )
                )}
              >
                <Icon size={collapsed ? 18 : 15} className={active ? "" : "opacity-60"} />
                {!collapsed && label && <span>{label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/* ─── Logout ────────────────────────────────────────────────────── */
function LogoutButton({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  async function handleLogout() {
    onNavigate?.();
    await signOut();
    router.push("/login");
  }
  return (
    <div className="border-t border-sidebar-border p-3">
      <Button
        variant="ghost"
        title="Sair"
        className={cn(
          "w-full text-sm text-sidebar-foreground/65 hover:bg-white/[0.04] hover:text-sidebar-foreground",
          collapsed ? "justify-center px-0" : "justify-start gap-2"
        )}
        onClick={handleLogout}
      >
        <LogOut size={15} />
        {!collapsed && "Sair"}
      </Button>
    </div>
  );
}

/* ─── Desktop sidebar rail ──────────────────────────────────────── */
export function AppSidebar() {
  const { collapsed } = useContext(SidebarCtx);
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar/70 text-sidebar-foreground backdrop-blur-xl transition-all duration-200 md:flex",
        collapsed ? "w-[52px]" : "w-56"
      )}
    >
      <SidebarNav collapsed={collapsed} />
      <LogoutButton collapsed={collapsed} />
    </aside>
  );
}

/* ─── Topbar ────────────────────────────────────────────────────── */
export function AppTopbar() {
  const [open, setOpen] = useState(false);
  const { collapsed, toggle } = useContext(SidebarCtx);

  return (
    <header className="brand-accent-top sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu" />
            }
          >
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="flex w-72 max-w-[80%] flex-col bg-sidebar p-0 text-sidebar-foreground"
          >
            <SheetTitle className="sr-only">Navegação</SheetTitle>
            <SidebarNav onNavigate={() => setOpen(false)} />
            <LogoutButton onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Desktop sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex"
          onClick={toggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </Button>

        <div className="flex items-center gap-2.5">
          <LogoMark />
          <div className="leading-tight">
            <p className="font-heading text-[15px] font-semibold tracking-tight text-card-foreground">
              ERP I Controle de Crédito
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Gestão de Operações
            </p>
          </div>
        </div>
      </div>

      <div className="hidden items-center gap-4 sm:flex">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-primary">Online</span>
        </div>
      </div>
    </header>
  );
}
