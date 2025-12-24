// App Store - VISÃO
// Simple state management using React Context

import { createContext, useContext, useState, ReactNode } from "react";

interface AppState {
  sidebarOpen: boolean;
  theme: "light" | "dark";
  language: string;
}

interface AppStore extends AppState {
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark") => void;
  setLanguage: (lang: string) => void;
}

const AppContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState("pt-BR");

  return (
    <AppContext.Provider value={{
      sidebarOpen, setSidebarOpen,
      theme, setTheme,
      language, setLanguage
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppStoreProvider");
  return context;
}

