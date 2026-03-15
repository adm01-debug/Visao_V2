import { describe, it, expect } from "vitest";
import { getSeverityColor, getSeverityLabel, getAlertTypeLabel, shouldPlaySound, formatAlertMessage } from "@/lib/alertUtils";

describe("alertUtils", () => {
  describe("getSeverityColor", () => {
    it("low = green", () => expect(getSeverityColor("low")).toBe("#22c55e"));
    it("medium = amber", () => expect(getSeverityColor("medium")).toBe("#f59e0b"));
    it("high = red", () => expect(getSeverityColor("high")).toBe("#ef4444"));
    it("critical = dark red", () => expect(getSeverityColor("critical")).toBe("#dc2626"));
  });

  describe("getSeverityLabel", () => {
    it("low = Baixa", () => expect(getSeverityLabel("low")).toBe("Baixa"));
    it("medium = Média", () => expect(getSeverityLabel("medium")).toBe("Média"));
    it("high = Alta", () => expect(getSeverityLabel("high")).toBe("Alta"));
    it("critical = Crítica", () => expect(getSeverityLabel("critical")).toBe("Crítica"));
  });

  describe("getAlertTypeLabel", () => {
    it("motion", () => expect(getAlertTypeLabel("motion")).toBe("Movimento"));
    it("intrusion", () => expect(getAlertTypeLabel("intrusion")).toBe("Intrusão"));
    it("face", () => expect(getAlertTypeLabel("face")).toBe("Reconhecimento Facial"));
    it("object", () => expect(getAlertTypeLabel("object")).toBe("Objeto Detectado"));
    it("system", () => expect(getAlertTypeLabel("system")).toBe("Sistema"));
    it("connection", () => expect(getAlertTypeLabel("connection")).toBe("Conexão"));
  });

  describe("shouldPlaySound", () => {
    it("true for high", () => expect(shouldPlaySound("high")).toBe(true));
    it("true for critical", () => expect(shouldPlaySound("critical")).toBe(true));
    it("false for medium", () => expect(shouldPlaySound("medium")).toBe(false));
    it("false for low", () => expect(shouldPlaySound("low")).toBe(false));
  });

  describe("formatAlertMessage", () => {
    it("formats without details", () => {
      expect(formatAlertMessage("motion", "Câmera 1")).toBe("Movimento detectado em Câmera 1");
    });
    it("formats with details", () => {
      expect(formatAlertMessage("face", "Entrada", "João identificado"))
        .toBe("Reconhecimento Facial detectado em Entrada: João identificado");
    });
  });
});
