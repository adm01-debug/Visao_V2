/**
 * Event utilities
 * Re-exports from @/utils/event for backward compatibility
 */

export {
  on,
  off,
  emit,
  once,
  EventBus,
  eventBus,
} from '@/utils/event';

import eventUtils from '@/utils/event';
export default eventUtils;
