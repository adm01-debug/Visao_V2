import React from 'react';

export function FloorPlanSVG() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="5" y="5" width="20" height="15" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary) / 0.3)" strokeWidth="0.3" rx="0.5" />
      <text x="15" y="13" fill="hsl(var(--foreground))" fontSize="2" textAnchor="middle" className="font-medium">Entrada</text>

      <rect x="30" y="15" width="25" height="20" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--border))" strokeWidth="0.2" rx="0.5" />
      <text x="42.5" y="26" fill="hsl(var(--muted-foreground))" fontSize="1.8" textAnchor="middle">Escritório</text>

      <rect x="25" y="40" width="15" height="25" fill="hsl(var(--secondary))" stroke="hsl(var(--border))" strokeWidth="0.2" rx="0.5" />
      <text x="32.5" y="53" fill="hsl(var(--muted-foreground))" fontSize="1.5" textAnchor="middle">Corredor</text>

      <rect x="50" y="25" width="35" height="30" fill="hsl(var(--warning) / 0.1)" stroke="hsl(var(--warning) / 0.3)" strokeWidth="0.3" rx="0.5" />
      <text x="67.5" y="41" fill="hsl(var(--foreground))" fontSize="2" textAnchor="middle" className="font-medium">Linha de Produção</text>

      <rect x="75" y="55" width="20" height="25" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--border))" strokeWidth="0.2" rx="0.5" />
      <text x="85" y="68" fill="hsl(var(--muted-foreground))" fontSize="1.8" textAnchor="middle">Almoxarifado</text>

      <rect x="25" y="70" width="25" height="20" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--border))" strokeWidth="0.2" rx="0.5" />
      <text x="37.5" y="81" fill="hsl(var(--muted-foreground))" fontSize="1.8" textAnchor="middle">Refeitório</text>

      <rect x="2" y="60" width="18" height="35" fill="hsl(var(--secondary))" stroke="hsl(var(--border))" strokeWidth="0.2" rx="0.5" />
      <text x="11" y="78" fill="hsl(var(--muted-foreground))" fontSize="1.8" textAnchor="middle">Estacionamento</text>

      <rect x="85" y="78" width="12" height="18" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--border))" strokeWidth="0.2" rx="0.5" />
      <text x="91" y="88" fill="hsl(var(--muted-foreground))" fontSize="1.5" textAnchor="middle">Doca</text>
    </svg>
  );
}
