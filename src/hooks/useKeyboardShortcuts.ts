/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useKeyboardShortcuts
 * 
 * Atalhos de teclado globais para navegação e ações rápidas
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  category: 'navigation' | 'actions' | 'media' | 'general';
  action: () => void;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onShortcutTriggered?: (shortcut: KeyboardShortcut) => void;
}

interface UseKeyboardShortcutsReturn {
  shortcuts: KeyboardShortcut[];
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  showHelp: boolean;
  toggleHelp: () => void;
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string) => void;
}

// ============================================
// HELPERS
// ============================================

function getShortcutLabel(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.meta) parts.push('⌘');
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
}

function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
  const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
  const altMatch = !!shortcut.alt === event.altKey;
  const shiftMatch = !!shortcut.shift === event.shiftKey;
  
  return keyMatch && ctrlMatch && altMatch && shiftMatch;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {}
): UseKeyboardShortcutsReturn {
  const { enabled: initialEnabled = true, onShortcutTriggered } = options;
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const [enabled, setEnabled] = useState(initialEnabled);
  const [showHelp, setShowHelp] = useState(false);
  const [customShortcuts, setCustomShortcuts] = useState<KeyboardShortcut[]>([]);

  // Atalhos padrão
  const defaultShortcuts: KeyboardShortcut[] = [
    // Navegação
    {
      key: 'd',
      alt: true,
      description: 'Ir para Dashboard',
      category: 'navigation',
      action: () => navigate('/'),
    },
    {
      key: 'c',
      alt: true,
      description: 'Ir para Câmeras',
      category: 'navigation',
      action: () => navigate('/cameras'),
    },
    {
      key: 'a',
      alt: true,
      description: 'Ir para Alertas',
      category: 'navigation',
      action: () => navigate('/alerts'),
    },
    {
      key: 'p',
      alt: true,
      description: 'Ir para Pessoas',
      category: 'navigation',
      action: () => navigate('/people'),
    },
    {
      key: 'r',
      alt: true,
      description: 'Ir para Regras',
      category: 'navigation',
      action: () => navigate('/security'),
    },
    {
      key: 'l',
      alt: true,
      description: 'Ir para Placas (ALPR)',
      category: 'navigation',
      action: () => navigate('/license-plates'),
    },
    {
      key: 'h',
      alt: true,
      description: 'Ir para Heatmap',
      category: 'navigation',
      action: () => navigate('/heatmap'),
    },
    {
      key: 'z',
      alt: true,
      description: 'Ir para Zonas',
      category: 'navigation',
      action: () => navigate('/zones'),
    },
    {
      key: 's',
      alt: true,
      description: 'Ir para Configurações',
      category: 'navigation',
      action: () => navigate('/settings'),
    },
    {
      key: 'n',
      alt: true,
      description: 'Ir para Analytics',
      category: 'navigation',
      action: () => navigate('/analytics'),
    },
    
    // Ações gerais
    {
      key: '/',
      description: 'Abrir busca global',
      category: 'actions',
      action: () => {
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Buscar"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          toast.info('Busca ativada');
        }
      },
    },
    {
      key: 'Escape',
      description: 'Fechar modal/diálogo',
      category: 'actions',
      action: () => {
        // Tenta fechar modais abertos
        const closeButton = document.querySelector('[data-dismiss], [aria-label="Close"], .dialog-close') as HTMLButtonElement;
        if (closeButton) {
          closeButton.click();
        }
        setShowHelp(false);
      },
    },
    {
      key: '?',
      shift: true,
      description: 'Mostrar atalhos de teclado',
      category: 'general',
      action: () => setShowHelp(prev => !prev),
    },
    {
      key: 'F1',
      description: 'Ajuda / Atalhos',
      category: 'general',
      action: () => setShowHelp(prev => !prev),
    },
    
    // Ações rápidas
    {
      key: 'n',
      ctrl: true,
      description: 'Nova câmera',
      category: 'actions',
      action: () => {
        if (location.pathname === '/cameras') {
          const addButton = document.querySelector('[data-add-camera], button:has(.lucide-plus)') as HTMLButtonElement;
          if (addButton) addButton.click();
        } else {
          navigate('/cameras');
          toast.info('Navegue para Câmeras para adicionar');
        }
      },
    },
    {
      key: 'r',
      ctrl: true,
      description: 'Atualizar dados',
      category: 'actions',
      action: () => {
        window.location.reload();
      },
    },
    {
      key: 'm',
      alt: true,
      description: 'Marcar todos alertas como lidos',
      category: 'actions',
      action: () => {
        toast.info('Marcando alertas como lidos...');
        // Dispatch custom event para NotificationsPanel
        window.dispatchEvent(new CustomEvent('mark-all-alerts-read'));
      },
    },
    
    // Controles de mídia
    {
      key: ' ',
      ctrl: true,
      description: 'Play/Pause stream ativo',
      category: 'media',
      action: () => {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) {
          if (video.paused) {
            video.play();
            toast.info('▶️ Reproduzindo');
          } else {
            video.pause();
            toast.info('⏸️ Pausado');
          }
        }
      },
    },
    {
      key: 'f',
      alt: true,
      description: 'Tela cheia no stream ativo',
      category: 'media',
      action: () => {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            video.requestFullscreen();
          }
        }
      },
    },
  ];

  const shortcuts = [...defaultShortcuts, ...customShortcuts];

  const toggleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
  }, []);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setCustomShortcuts(prev => [...prev.filter(s => s.key !== shortcut.key), shortcut]);
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    setCustomShortcuts(prev => prev.filter(s => s.key !== key));
  }, []);

  // Handler de teclado
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar se estiver digitando em input/textarea
      const target = event.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || 
                       target.isContentEditable;
      
      // Permitir apenas alguns atalhos mesmo quando digitando
      const allowedWhileTyping = ['Escape', 'F1'];
      if (isTyping && !allowedWhileTyping.includes(event.key)) {
        return;
      }

      // Procurar shortcut correspondente
      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          
          shortcut.action();
          onShortcutTriggered?.(shortcut);
          
          // Log para debug
          // rm
          
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, shortcuts, onShortcutTriggered]);

  // Salvar preferência no localStorage
  useEffect(() => {
    localStorage.setItem('visao-keyboard-shortcuts-enabled', JSON.stringify(enabled));
  }, [enabled]);

  // Carregar preferência do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('visao-keyboard-shortcuts-enabled');
    if (saved !== null) {
      setEnabled(JSON.parse(saved));
    }
  }, []);

  return {
    shortcuts,
    enabled,
    setEnabled,
    showHelp,
    toggleHelp,
    registerShortcut,
    unregisterShortcut,
  };
}

export { getShortcutLabel };
export default useKeyboardShortcuts;
