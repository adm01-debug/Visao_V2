export const KEYBINDINGS = {
  GLOBAL: { 
    SEARCH: 'meta+k', 
    HELP: 'shift+?', 
    ESCAPE: 'escape', 
    FULLSCREEN: 'meta+f' 
  },
  NAVIGATION: { 
    DASHBOARD: 'meta+d',
    CAMERAS: 'meta+c', 
    ALERTS: 'meta+a', 
    RECORDINGS: 'meta+r', 
    PEOPLE: 'meta+p',
    ZONES: 'meta+z',
    ANALYTICS: 'meta+y',
    SETTINGS: 'meta+,' 
  },
  CAMERA: { 
    SNAPSHOT: 's', 
    RECORD: 'r', 
    ZOOM_IN: '+', 
    ZOOM_OUT: '-', 
    PTZ_UP: 'arrowup', 
    PTZ_DOWN: 'arrowdown', 
    PTZ_LEFT: 'arrowleft', 
    PTZ_RIGHT: 'arrowright' 
  },
  LIST: { 
    NEXT: 'j', 
    PREVIOUS: 'k', 
    SELECT: 'enter', 
    DELETE: 'delete' 
  },
  MODAL: { 
    CLOSE: 'escape', 
    CONFIRM: 'enter' 
  },
  ACTIONS: {
    NEW_CAMERA: 'meta+shift+n',
    SEARCH_ALT: '/'
  }
};

export const KEYBINDING_DESCRIPTIONS: Record<string, string> = {
  'meta+k': 'Abrir busca global',
  '/': 'Abrir busca (alternativo)',
  'shift+?': 'Mostrar atalhos',
  'escape': 'Fechar/Cancelar',
  'meta+f': 'Tela cheia',
  'meta+d': 'Ir para Dashboard',
  'meta+c': 'Ir para Câmeras',
  'meta+a': 'Ir para Alertas',
  'meta+r': 'Ir para Gravações',
  'meta+p': 'Ir para Pessoas',
  'meta+z': 'Ir para Zonas',
  'meta+y': 'Ir para Analytics',
  'meta+,': 'Configurações',
  'meta+shift+n': 'Nova câmera',
};

export const SHORTCUT_CATEGORIES = {
  NAVIGATION: 'Navegação',
  ACTIONS: 'Ações',
  SYSTEM: 'Sistema',
  CAMERA: 'Câmera',
  LIST: 'Lista',
};

export default KEYBINDINGS;
