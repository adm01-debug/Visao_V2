/**
 * Cookie utilities
 * Re-exports from @/utils/cookie for backward compatibility
 */

export {
  get,
  set,
  remove,
  getAll,
  has,
  clear,
} from '@/utils/cookie';

import cookie from '@/utils/cookie';
export default cookie;
