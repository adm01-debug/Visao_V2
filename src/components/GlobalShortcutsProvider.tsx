import React from "react";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { GlobalShortcutsHelp } from "./GlobalShortcutsHelp";

interface GlobalShortcutsProviderProps {
  children: React.ReactNode;
}

export function GlobalShortcutsProvider({ children }: GlobalShortcutsProviderProps) {
  const {
    shortcuts,
    showHelp,
    setShowHelp,
    enabled,
    setEnabled,
    formatShortcut,
  } = useGlobalShortcuts();

  return (
    <>
      {children}
      <GlobalShortcutsHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={shortcuts}
        enabled={enabled}
        onEnabledChange={setEnabled}
        formatShortcut={formatShortcut}
      />
    </>
  );
}

export default GlobalShortcutsProvider;
