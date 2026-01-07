import { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  category: string;
}

export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const shortcuts: ShortcutConfig[] = [
    // Navegação Principal
    { key: "d", meta: true, action: () => navigate("/dashboard"), description: "Ir para Dashboard", category: "Navegação" },
    { key: "c", meta: true, action: () => navigate("/cameras"), description: "Ir para Câmeras", category: "Navegação" },
    { key: "a", meta: true, action: () => navigate("/alerts"), description: "Ir para Alertas", category: "Navegação" },
    { key: "r", meta: true, action: () => navigate("/recordings"), description: "Ir para Gravações", category: "Navegação" },
    { key: "p", meta: true, action: () => navigate("/people"), description: "Ir para Pessoas", category: "Navegação" },
    { key: "z", meta: true, action: () => navigate("/zones"), description: "Ir para Zonas", category: "Navegação" },
    { key: "y", meta: true, action: () => navigate("/analytics"), description: "Ir para Analytics", category: "Navegação" },
    
    // Ações Rápidas
    { key: "k", meta: true, action: () => document.dispatchEvent(new CustomEvent('open-search')), description: "Abrir busca global", category: "Ações" },
    { key: "/", action: () => document.dispatchEvent(new CustomEvent('open-search')), description: "Abrir busca (alternativo)", category: "Ações" },
    { key: "n", meta: true, shift: true, action: () => document.dispatchEvent(new CustomEvent('new-camera')), description: "Nova câmera", category: "Ações" },
    { key: "f", meta: true, action: () => toggleFullscreen(), description: "Tela cheia", category: "Ações" },
    
    // Configurações
    { key: ",", meta: true, action: () => navigate("/settings"), description: "Configurações", category: "Sistema" },
    { key: "?", shift: true, action: () => setShowHelp(prev => !prev), description: "Mostrar atalhos", category: "Sistema" },
    { key: "Escape", action: () => { setShowHelp(false); document.dispatchEvent(new CustomEvent('close-modal')); }, description: "Fechar/Cancelar", category: "Sistema" },
  ];

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignorar se estiver em input, textarea ou contenteditable
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Permitir apenas Escape em inputs
      if (event.key !== 'Escape') return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const metaMatch = !!shortcut.meta === (event.metaKey || event.ctrlKey);
      const shiftMatch = !!shortcut.shift === event.shiftKey;
      const altMatch = !!shortcut.alt === event.altKey;
      const ctrlMatch = !shortcut.meta || (event.metaKey || event.ctrlKey);

      if (keyMatch && metaMatch && shiftMatch && altMatch) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [enabled, shortcuts]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const getShortcutsByCategory = useCallback(() => {
    const grouped: Record<string, ShortcutConfig[]> = {};
    for (const shortcut of shortcuts) {
      if (!grouped[shortcut.category]) {
        grouped[shortcut.category] = [];
      }
      grouped[shortcut.category].push(shortcut);
    }
    return grouped;
  }, [shortcuts]);

  const formatShortcut = useCallback((shortcut: ShortcutConfig) => {
    const parts: string[] = [];
    if (shortcut.meta) parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
    if (shortcut.shift) parts.push('⇧');
    if (shortcut.alt) parts.push('⌥');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  }, []);

  return {
    shortcuts,
    showHelp,
    setShowHelp,
    enabled,
    setEnabled,
    getShortcutsByCategory,
    formatShortcut,
  };
}

export default useGlobalShortcuts;
