/**
 * DOM utilities - Re-exports from @/utils/dom
 */

export {
  $,
  $$,
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  getOffset,
  isVisible,
  scrollTo,
  copyToClipboard,
} from '@/utils/dom';

// Legacy API compatibility
import {
  $ as _$,
  $$ as _$$,
  addClass as _addClass,
  removeClass as _removeClass,
  toggleClass as _toggleClass,
  hasClass as _hasClass,
} from '@/utils/dom';

/**
 * @deprecated Use element.style.display = '' instead
 */
export function show(element: HTMLElement): void {
  element.style.display = "";
}

/**
 * @deprecated Use element.style.display = 'none' instead
 */
export function hide(element: HTMLElement): void {
  element.style.display = "none";
}

export default {
  $: _$,
  $$: _$$,
  addClass: _addClass,
  removeClass: _removeClass,
  toggleClass: _toggleClass,
  hasClass: _hasClass,
  show,
  hide,
};
