export const KEYBINDINGS = {
  GLOBAL: { SEARCH: 'ctrl+k', HELP: 'shift+?', ESCAPE: 'escape', FULLSCREEN: 'f' },
  NAVIGATION: { HOME: 'g h', CAMERAS: 'g c', ALERTS: 'g a', RECORDINGS: 'g r', SETTINGS: 'g s' },
  CAMERA: { SNAPSHOT: 's', RECORD: 'r', ZOOM_IN: '+', ZOOM_OUT: '-', PTZ_UP: 'arrowup', PTZ_DOWN: 'arrowdown', PTZ_LEFT: 'arrowleft', PTZ_RIGHT: 'arrowright' },
  LIST: { NEXT: 'j', PREVIOUS: 'k', SELECT: 'enter', DELETE: 'delete' },
  MODAL: { CLOSE: 'escape', CONFIRM: 'enter' },
};

export const KEYBINDING_DESCRIPTIONS: Record<string, string> = {
  'ctrl+k': 'Abrir busca',
  'shift+?': 'Mostrar atalhos',
  'escape': 'Fechar/Cancelar',
  'f': 'Tela cheia',
  'g h': 'Ir para Home',
  'g c': 'Ir para Câmeras',
  'g a': 'Ir para Alertas',
};

export default KEYBINDINGS;
