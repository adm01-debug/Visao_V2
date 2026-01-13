/**
 * Event Emitter
 * Re-exports from @/utils/event for backward compatibility
 */

export { EventBus as EventEmitter, eventBus } from '@/utils/event';

import { eventBus } from '@/utils/event';
export default eventBus;
