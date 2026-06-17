/**
 * Atmosfera de fundo da marca — grid scanlines + orbs radiais pulsantes.
 * Renderizada uma única vez atrás de todo o conteúdo interno (no layout).
 * Mesma assinatura visual da tela de login.
 */
export function AppBackground() {
  return (
    <div className="brand-backdrop" aria-hidden>
      <div className="brand-backdrop__grid" />
      {/* Orb superior direita — spring green */}
      <div
        className="brand-backdrop__orb"
        style={{
          top: "-12rem",
          right: "-12rem",
          height: "560px",
          width: "560px",
          opacity: 0.08,
          background: "radial-gradient(circle, #a8ff53 0%, transparent 70%)",
          animation: "brand-pulse-orb 9s ease-in-out infinite",
        }}
      />
      {/* Orb inferior esquerda — violeta */}
      <div
        className="brand-backdrop__orb"
        style={{
          bottom: "-16rem",
          left: "-16rem",
          height: "640px",
          width: "640px",
          opacity: 0.05,
          background: "radial-gradient(circle, #9c9af2 0%, transparent 70%)",
          animation: "brand-pulse-orb 13s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}
