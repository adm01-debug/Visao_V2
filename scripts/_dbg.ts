import { createFrameBus, publishFrame } from '../src/lib/vision/frameBus';
const bus = createFrameBus('c');
const o = publishFrame(bus, { frameId: 1, capturedAtMs: 1000 }, 1000);
console.log(JSON.stringify(o.drops), o.bus.lastPublishedFrameId, o.bus.lastPublishedCapturedAtMs, o.bus.droppedOutOfOrder);
const o2 = publishFrame(o.bus, { frameId: 2, capturedAtMs: 1100 }, 1100);
console.log(JSON.stringify(o2.drops), o2.bus.droppedOutOfOrder);
