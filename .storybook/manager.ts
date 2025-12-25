import { addons } from "@storybook/manager-api";
import { create } from "@storybook/theming/create";

const theme = create({
  base: "dark",
  brandTitle: "VISÃO - Component Library",
  brandUrl: "https://github.com/adm01-debug/vis-o",
  brandImage: undefined,
  brandTarget: "_self",

  // UI
  appBg: "#1a1a2e",
  appContentBg: "#16213e",
  appBorderColor: "#0f3460",
  appBorderRadius: 8,

  // Typography
  fontBase: '"Inter", "Open Sans", sans-serif',
  fontCode: "monospace",

  // Text colors
  textColor: "#e8e8e8",
  textInverseColor: "#1a1a2e",

  // Toolbar default and active colors
  barTextColor: "#9e9e9e",
  barSelectedColor: "#00d9ff",
  barBg: "#1a1a2e",

  // Form colors
  inputBg: "#16213e",
  inputBorder: "#0f3460",
  inputTextColor: "#e8e8e8",
  inputBorderRadius: 4,
});

addons.setConfig({
  theme,
  sidebar: {
    showRoots: true,
  },
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
});
