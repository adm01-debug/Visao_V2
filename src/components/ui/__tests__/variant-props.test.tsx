/**
 * VISÃO - Testes de contrato de props (variant/side)
 *
 * Garante que Button, Badge e SheetContent:
 *  1. Aceitam props `variant`/`side` documentadas e aplicam a classe correta.
 *  2. Caem no default esperado quando a prop é omitida.
 *  3. Falham (via checagem estática expect-error + runtime CVA) para valores inválidos.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
describe("Button — prop `variant`", () => {
  const variants = ["default", "destructive", "outline", "secondary", "ghost", "link", "premium", "success"] as const;

  it.each(variants)("aceita variant=%s e aplica a classe correta", (variant) => {
    render(<Button variant={variant}>btn-{variant}</Button>);
    const btn = screen.getByRole("button", { name: `btn-${variant}` });
    expect(btn.className).toContain(buttonVariants({ variant }).split(" ")[0]);
  });

  it("usa variant=default quando omitido", () => {
    render(<Button>x</Button>);
    const btn = screen.getByRole("button", { name: "x" });
    expect(btn.className).toContain("bg-primary");
  });

  it("variant inválido em runtime não aplica classe do design system", () => {
    // @ts-expect-error - 'nope' não é uma variant válida (TS falha em compile)
    const cls = buttonVariants({ variant: "nope" });
    // CVA retorna apenas as classes base, sem estilos de nenhuma variant conhecida.
    expect(cls).not.toContain("bg-primary");
    expect(cls).not.toContain("bg-destructive");
    expect(cls).not.toContain("bg-secondary");
  });
});

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
describe("Badge — prop `variant`", () => {
  const variants = ["default", "secondary", "destructive", "outline"] as const;

  it.each(variants)("aceita variant=%s", (variant) => {
    render(<Badge variant={variant}>tag-{variant}</Badge>);
    const el = screen.getByText(`tag-${variant}`);
    expect(el.className).toContain(badgeVariants({ variant }).split(" ")[0]);
  });

  it("usa variant=default quando omitido", () => {
    render(<Badge>x</Badge>);
    expect(screen.getByText("x").className).toContain("bg-primary");
  });

  it("variant inválido não gera classes de nenhuma variant conhecida", () => {
    // @ts-expect-error - 'bogus' não é válido
    const cls = badgeVariants({ variant: "bogus" });
    expect(cls).not.toContain("bg-primary");
    expect(cls).not.toContain("bg-destructive");
    expect(cls).not.toContain("bg-secondary");
  });
});

// ---------------------------------------------------------------------------
// SheetContent
// ---------------------------------------------------------------------------
describe("SheetContent — prop `side`", () => {
  const sides = [
    { side: "top", cls: "top-0" },
    { side: "bottom", cls: "bottom-0" },
    { side: "left", cls: "left-0" },
    { side: "right", cls: "right-0" },
  ] as const;

  it.each(sides)("aceita side=$side e aplica classe posicional", ({ side, cls }) => {
    render(
      <Sheet defaultOpen>
        <SheetTrigger>open</SheetTrigger>
        <SheetContent side={side} data-testid={`sheet-${side}`}>
          conteúdo
        </SheetContent>
      </Sheet>,
    );
    const content = screen.getByTestId(`sheet-${side}`);
    expect(content.className).toContain(cls);
  });

  it("usa side=right quando omitido", () => {
    render(
      <Sheet defaultOpen>
        <SheetTrigger>open</SheetTrigger>
        <SheetContent data-testid="sheet-default">conteúdo</SheetContent>
      </Sheet>,
    );
    expect(screen.getByTestId("sheet-default").className).toContain("right-0");
  });

  it("side inválido é rejeitado pelo TypeScript", () => {
    // Este bloco não é executado — a asserção acontece em tempo de compilação.
    // Se a assinatura de SheetContent regredir, o @ts-expect-error falhará o build.
    () => (
      // @ts-expect-error - 'diagonal' não é um lado válido
      <SheetContent side="diagonal" />
    );
    expect(true).toBe(true);
  });
});
