import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider, useI18n } from "../i18n";

const TestComponent = () => {
  const { t, locale, setLocale } = useI18n();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translation">{t("common.loading")}</span>
      <button onClick={() => setLocale("en-US")}>English</button>
    </div>
  );
};

describe("I18nContext", () => {
  it("provides i18n context", () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );
    expect(screen.getByTestId("locale")).toBeInTheDocument();
  });

  it("translates keys", () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );
    expect(screen.getByTestId("translation")).toBeTruthy();
  });
});
