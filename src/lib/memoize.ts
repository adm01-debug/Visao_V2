/**
 * Memoize utilities - Re-exports from @/utils/memoize
 * src/utils/memoize is the source of truth
 */

export { memoize, memoizeWeak, memoizeAsync } from '@/utils/memoize';

import { memoize as _memoize, memoizeWeak, memoizeAsync } from '@/utils/memoize';

// Legacy alias for backward compatibility
export const memoizeOne = _memoize;

export default _memoize;
