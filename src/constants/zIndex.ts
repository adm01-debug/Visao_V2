export const Z_INDEX = {
  hide: -1,
  base: 0,
  raised: 1,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  backdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
  overlay: 1090,
  max: 9999,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;

export const getZIndex = (key: ZIndexKey): number => Z_INDEX[key];

export default Z_INDEX;
