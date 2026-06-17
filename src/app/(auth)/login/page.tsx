"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signIn } from "@/lib/auth-client";
import { toast } from "sonner";

const USERNAME_MAP: Record<string, string> = {
  admin: "admin@cambio.com",
};

/* ─── Animated background orbs ─────────────────────────────────── */
function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Grid scanlines */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(168,255,83,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(168,255,83,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Orb top-right */}
      <div
        className="absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, #a8ff53 0%, transparent 70%)",
          animation: "pulse-orb 8s ease-in-out infinite",
        }}
      />
      {/* Orb bottom-left */}
      <div
        className="absolute -bottom-48 -left-48 h-[700px] w-[700px] rounded-full opacity-[0.06]"
        style={{
          background: "radial-gradient(circle, #9c9af2 0%, transparent 70%)",
          animation: "pulse-orb 12s ease-in-out infinite reverse",
        }}
      />
      {/* Orb center-right subtle */}
      <div
        className="absolute top-1/2 right-1/4 h-[300px] w-[300px] -translate-y-1/2 rounded-full opacity-[0.04]"
        style={{
          background: "radial-gradient(circle, #a8ff53 0%, transparent 70%)",
          animation: "pulse-orb 6s ease-in-out infinite 2s",
        }}
      />
    </div>
  );
}

/* ─── Floating badge ─────────────────────────────────────────────── */
function StatBadge({ label, value, delay = "0s" }: { label: string; value: string; delay?: string }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 backdrop-blur-sm"
      style={{ animation: `float 4s ease-in-out infinite ${delay}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary" style={{ boxShadow: "0 0 6px #a8ff53" }} />
      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-mono text-sm font-semibold text-primary">{value}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const email = USERNAME_MAP[username.toLowerCase()] ?? username;
    const res = await signIn.email({ email, password });
    setLoading(false);
    if (res.error) {
      toast.error("Usuário ou senha inválidos");
    } else {
      router.push("/overview");
    }
  }

  return (
    <>
      <style>{`
        @keyframes pulse-orb {
          0%, 100% { transform: scale(1) translate(0, 0); opacity: inherit; }
          50% { transform: scale(1.12) translate(12px, -12px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(168,255,83,0); }
          50%       { box-shadow: 0 0 24px 2px rgba(168,255,83,0.18); }
        }
        @keyframes spin-border {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .fade-up-1 { animation: fade-up 0.5s ease both 0.1s; opacity: 0; }
        .fade-up-2 { animation: fade-up 0.5s ease both 0.2s; opacity: 0; }
        .fade-up-3 { animation: fade-up 0.5s ease both 0.3s; opacity: 0; }
        .fade-up-4 { animation: fade-up 0.5s ease both 0.4s; opacity: 0; }
        .fade-up-5 { animation: fade-up 0.5s ease both 0.5s; opacity: 0; }

        .input-glow:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(168,255,83,0.35), 0 0 16px rgba(168,255,83,0.12);
          border-color: #a8ff53 !important;
        }
        .btn-primary-glow {
          position: relative;
          overflow: hidden;
          background: #a8ff53;
          color: #121317;
          font-weight: 600;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .btn-primary-glow:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 24px rgba(168,255,83,0.4);
        }
        .btn-primary-glow:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-primary-glow::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%);
          background-size: 200% 100%;
          animation: shimmer 2.4s linear infinite;
        }
        .card-glow {
          animation: glow-pulse 4s ease-in-out infinite;
        }
      `}</style>

      <div className="relative min-h-screen overflow-hidden bg-background">
        <BackgroundOrbs />

        {/* ─── Layout: split on md+, stacked on mobile ─── */}
        <div className={`relative z-10 flex min-h-screen flex-col md:flex-row ${mounted ? "" : "invisible"}`}>

          {/* ── LEFT PANEL — branding (hidden on small mobile) ── */}
          <div className="hidden flex-col justify-between p-10 md:flex md:w-1/2 lg:p-16">
            {/* Logo */}
            <div className="fade-up-1">
              <Image src="/cash-logo.png" alt="cash" width={1070} height={454} priority className="h-8 w-auto" />
            </div>

            {/* Headline */}
            <div className="space-y-6">
              <div className="fade-up-2 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Plataforma de Gestão
                </p>
                <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight text-card-foreground lg:text-5xl">
                  Controle de<br />
                  <span className="text-primary">Crédito</span>
                </h1>
                <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Gestão centralizada de empréstimos, credores, garantias e fluxo de caixa.
                </p>
              </div>

              {/* Stat badges */}
              <div className="fade-up-3 flex flex-wrap gap-2">
                <StatBadge label="Operações" value="Ativas" delay="0s" />
                <StatBadge label="Garantias" value="Monitoradas" delay="0.4s" />
                <StatBadge label="Fluxo" value="Tempo real" delay="0.8s" />
              </div>
            </div>

            {/* Footer */}
            <p className="fade-up-4 text-[11px] text-muted-foreground/50">
              © 2025 ERP Controle de Crédito
            </p>
          </div>

          {/* ── RIGHT PANEL — form ── */}
          <div className="flex flex-1 items-center justify-center px-4 py-12 md:px-8 md:py-0">
            {/* Card */}
            <div
              className="card-glow relative w-full max-w-[360px] rounded-2xl border border-white/[0.08] bg-card/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
            >
              {/* Thin top accent line */}
              <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              {/* Mobile logo (shown only on small screens) */}
              <div className="fade-up-1 mb-6 flex justify-center md:hidden">
                <Image src="/cash-logo.png" alt="cash" width={1070} height={454} priority className="h-9 w-auto" />
              </div>

              {/* Header */}
              <div className="fade-up-2 mb-7 space-y-1">
                <h2 className="font-heading text-xl font-bold tracking-tight text-card-foreground">
                  Controle de Crédito
                </h2>
                <p className="text-xs text-muted-foreground">Gestão de Operações</p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="fade-up-3 space-y-1.5">
                  <label htmlFor="username" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Usuário
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="input-glow w-full rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 transition-all duration-200 focus:bg-background/80"
                  />
                </div>

                <div className="fade-up-4 space-y-1.5">
                  <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="input-glow w-full rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 transition-all duration-200 focus:bg-background/80"
                  />
                </div>

                <div className="fade-up-5 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary-glow w-full rounded-md px-4 py-2.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Entrando...
                      </span>
                    ) : (
                      "Entrar"
                    )}
                  </button>
                </div>
              </form>

              {/* Bottom status indicator */}
              <div className="fade-up-5 mt-6 flex items-center justify-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Sistema online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
