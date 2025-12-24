import { addons } from "@storybook/manager-api";
import { create } from "@storybook/theming/create";

const theme = create({
  base: "dark",
  brandTitle: "VISÃO Design System",
  brandUrl: "https://github.com/adm01-debug/vis-o",
  brandTarget: "_blank",
  appBg: "#0f172a",
  appContentBg: "#1e293b",
  appBorderColor: "#334155",
  appBorderRadius: 8,
  fontBase: "Inter, sans-serif",
  fontCode: "Fira Code, monospace",
  textColor: "#f8fafc",
  textInverseColor: "#0f172a",
  textMutedColor: "#94a3b8",
  barTextColor: "#cbd5e1",
  barSelectedColor: "#3b82f6",
  barBg: "#1e293b",
  inputBg: "#334155",
  inputBorder: "#475569",
  inputTextColor: "#f8fafc",
  inputBorderRadius: 4,
  colorPrimary: "#3b82f6",
  colorSecondary: "#8b5cf6",
});

addons.setConfig({
  theme,
  sidebar: { showRoots: true },
  toolbar: { title: { hidden: false }, zoom: { hidden: false }, eject: { hidden: false }, copy: { hidden: false }, fullscreen: { hidden: false } },
});
