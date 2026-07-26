/**
 * Testes unitários de `describeConfig` — garante que o resumo textual usado
 * na UI e no PDF reflete fielmente tipos de evento, janela, dias e severidades.
 */
import { describe, it, expect } from "vitest";
import {
  describeConfig,
  DEFAULT_PRODUCTIVITY_CONFIG,
  EVENT_TYPE_LABEL,
  SEVERITY_LABEL,
  PRODUCTIVITY_PRESETS,
  type ProductivityConfig,
} from "@/lib/productivityConfig";

function makeConfig(overrides: Partial<ProductivityConfig> = {}): ProductivityConfig {
  return {
    ...DEFAULT_PRODUCTIVITY_CONFIG,
    eventTypes: [...DEFAULT_PRODUCTIVITY_CONFIG.eventTypes],
    weekdays: [...DEFAULT_PRODUCTIVITY_CONFIG.weekdays],
    severities: [...DEFAULT_PRODUCTIVITY_CONFIG.severities],
    ...overrides,
  };
}

describe("describeConfig — tipos de evento", () => {
  it("lista todos os rótulos quando todos os tipos estão ativos", () => {
    const text = describeConfig(makeConfig());
    expect(text).toContain(EVENT_TYPE_LABEL.alerts);
    expect(text).toContain(EVENT_TYPE_LABEL.panic);
    expect(text).toContain(EVENT_TYPE_LABEL.recognitions);
  });

  it("lista apenas os tipos selecionados", () => {
    const text = describeConfig(makeConfig({ eventTypes: ["panic"] }));
    expect(text).toContain(EVENT_TYPE_LABEL.panic);
    expect(text).not.toContain(EVENT_TYPE_LABEL.recognitions);
  });

  it("preserva a ordem em que os tipos foram selecionados", () => {
    const text = describeConfig(makeConfig({ eventTypes: ["recognitions", "alerts"] }));
    expect(text.indexOf(EVENT_TYPE_LABEL.recognitions)).toBeLessThan(
      text.indexOf(EVENT_TYPE_LABEL.alerts)
    );
  });

  it("informa explicitamente quando nenhum tipo está selecionado", () => {
    expect(describeConfig(makeConfig({ eventTypes: [] }))).toContain("nenhum tipo selecionado");
  });
});

describe("describeConfig — janela de tempo", () => {
  it("mostra a janela no formato início–fim", () => {
    const text = describeConfig(makeConfig({ windowStart: "08:00", windowEnd: "18:00" }));
    expect(text).toContain("08:00–18:00");
  });

  it("mostra corretamente janelas que cruzam a meia-noite", () => {
    const text = describeConfig(makeConfig({ windowStart: "19:00", windowEnd: "06:00" }));
    expect(text).toContain("19:00–06:00");
  });

  it("reproduz os valores exatamente como configurados, sem normalizar", () => {
    const text = describeConfig(makeConfig({ windowStart: "08:00:00", windowEnd: "18:30" }));
    expect(text).toContain("08:00:00–18:30");
  });
});

describe("describeConfig — dias da semana", () => {
  it("resume como 'todos os dias' quando os 7 dias estão ativos", () => {
    expect(describeConfig(makeConfig())).toContain("todos os dias");
  });

  it("informa 'nenhum dia' quando a lista está vazia", () => {
    expect(describeConfig(makeConfig({ weekdays: [] }))).toContain("nenhum dia");
  });

  it("lista os dias abreviados em ordem crescente, independente da ordem de entrada", () => {
    const text = describeConfig(makeConfig({ weekdays: [5, 1, 3] }));
    expect(text).toContain("Seg/Qua/Sex");
  });

  it("descreve um único dia sem separador", () => {
    const text = describeConfig(makeConfig({ weekdays: [6] }));
    expect(text).toContain("Sáb");
    expect(text).not.toContain("Sáb/");
  });

  it("descreve o fim de semana com domingo primeiro", () => {
    expect(describeConfig(makeConfig({ weekdays: [6, 0] }))).toContain("Dom/Sáb");
  });
});

describe("describeConfig — severidades", () => {
  it("resume como 'todas as severidades' quando todas estão ativas", () => {
    expect(describeConfig(makeConfig())).toContain("todas as severidades");
  });

  it("lista os rótulos quando há seleção parcial", () => {
    const text = describeConfig(makeConfig({ severities: ["high", "critical"] }));
    expect(text).toContain(SEVERITY_LABEL.high);
    expect(text).toContain(SEVERITY_LABEL.critical);
    expect(text).not.toContain("todas as severidades");
  });

  it("informa 'nenhuma severidade' quando a lista está vazia", () => {
    expect(describeConfig(makeConfig({ severities: [] }))).toContain("nenhuma severidade");
  });
});

describe("describeConfig — formato e invariantes", () => {
  it("usa quatro seções separadas por ' · '", () => {
    expect(describeConfig(makeConfig()).split(" · ")).toHaveLength(4);
  });

  it("mantém a ordem: tipos · janela · dias · severidades", () => {
    const parts = describeConfig(
      makeConfig({ eventTypes: ["panic"], windowStart: "19:00", windowEnd: "06:00", weekdays: [1], severities: ["critical"] })
    ).split(" · ");
    expect(parts[0]).toBe(EVENT_TYPE_LABEL.panic);
    expect(parts[1]).toBe("19:00–06:00");
    expect(parts[2]).toBe("Seg");
    expect(parts[3]).toBe(SEVERITY_LABEL.critical);
  });

  it("gera descrição não vazia para todos os presets", () => {
    for (const preset of PRODUCTIVITY_PRESETS) {
      const text = describeConfig(preset.config);
      expect(text.length).toBeGreaterThan(0);
      expect(text.split(" · ")).toHaveLength(4);
    }
  });

  it("não muta a configuração recebida", () => {
    const config = makeConfig({ weekdays: [5, 1, 3] });
    const snapshot = JSON.stringify(config);
    describeConfig(config);
    expect(JSON.stringify(config)).toBe(snapshot);
  });

  it("é determinístico para a mesma entrada", () => {
    const config = makeConfig({ severities: ["low", "high"], weekdays: [2, 0] });
    expect(describeConfig(config)).toBe(describeConfig(config));
  });
});
