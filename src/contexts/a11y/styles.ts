/**
 * VISÃO - Accessibility Styles
 */
export const accessibilityStyles = `
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
.sr-only-focusable:focus, .sr-only-focusable:active {
  position: static; width: auto; height: auto; padding: inherit; margin: inherit;
  overflow: visible; clip: auto; white-space: normal;
}
.reduce-motion * {
  animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
.high-contrast {
  --foreground: 0 0% 0%; --background: 0 0% 100%; --primary: 0 0% 0%; --border: 0 0% 0%;
}
.high-contrast .dark {
  --foreground: 0 0% 100%; --background: 0 0% 0%; --primary: 0 0% 100%; --border: 0 0% 100%;
}
.large-text { font-size: 1.25rem; }
.large-text h1 { font-size: 2.5rem; }
.large-text h2 { font-size: 2rem; }
.large-text h3 { font-size: 1.75rem; }
.large-text h4 { font-size: 1.5rem; }
.keyboard-navigation *:focus { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
.keyboard-navigation *:focus:not(:focus-visible) { outline: none; }
.keyboard-navigation *:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
`;
