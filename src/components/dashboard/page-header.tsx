/**
 * Cabeçalho de página padronizado da marca: eyebrow verde em caixa alta +
 * título em fonte heading. Slot opcional à direita para ações (botões, etc).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`brand-fade-up flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0 space-y-0.5">
        {eyebrow && <p className="brand-eyebrow">{eyebrow}</p>}
        <h1 className="font-heading text-xl font-bold tracking-tight text-card-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
