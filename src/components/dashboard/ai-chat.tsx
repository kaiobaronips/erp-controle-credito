"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

const SUGESTOES = [
  "Qual o total emprestado?",
  "Quem está em atraso?",
  "Quanto recebi este mês?",
  "Como funciona o status 'executado'?",
];

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function enviar(texto: string) {
    const pergunta = texto.trim();
    if (!pergunta || loading) return;
    const novas: Msg[] = [...messages, { role: "user", content: pergunta }];
    setMessages(novas);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: novas }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessages([
          ...novas,
          { role: "assistant", content: data?.error ?? "Erro ao consultar a IA. Tente novamente." },
        ]);
      } else {
        setMessages([...novas, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages([...novas, { role: "assistant", content: "Falha de conexão. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Assistente de IA"
        className={cn(
          "fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-105 active:scale-95",
          open ? "bg-foreground text-background" : "bg-primary text-primary-foreground"
        )}
      >
        {open ? <X size={22} /> : <Bot size={24} />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex size-3 rounded-full border-2 border-background bg-primary" />
          </span>
        )}
      </button>

      {/* Painel */}
      <div
        className={cn(
          "fixed bottom-24 right-5 z-50 flex w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-200 origin-bottom-right",
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        )}
        style={{ height: "min(560px, calc(100vh - 9rem))" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles size={16} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-card-foreground">Assistente IA</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Federal Credit Pay</p>
          </div>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 pt-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot size={26} />
              </div>
              <p className="text-sm font-medium text-foreground">Como posso ajudar?</p>
              <p className="px-4 text-xs text-muted-foreground">
                Tire dúvidas sobre credores, empréstimos, cobranças e o funcionamento do sistema.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => enviar(s)}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(input);
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo..."
            className="flex-1 rounded-full border border-border bg-background px-3.5 py-2 text-sm outline-none transition-colors focus:border-primary/50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="size-9 shrink-0 rounded-full"
            aria-label="Enviar"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>
    </>
  );
}
