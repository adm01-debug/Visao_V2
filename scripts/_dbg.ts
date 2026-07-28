import { createPipeline, registerProcessor, tickPipeline } from '../src/lib/vision/visionPipeline';
let s = registerProcessor(createPipeline('c'), { id:'p', capabilities:['track'], minIntervalMs:0, maxFrameAgeMs:900, failureThreshold:3, quarantineMs:1000 });
const now = 1_700_000_000_000;
let t = tickPipeline(s, { frameId:1, capturedAtMs: now }, { capturedAtMs: now, hasActivity:true, trackId:null, trackEverIdentified:false }, now);
s = t.state; console.log('f1 ooo', s.bus.droppedOutOfOrder, s.bus.lastPublishedCapturedAtMs, s.bus.lastPublishedFrameId);
// frame 2 com captura anterior
t = tickPipeline(s, { frameId:2, capturedAtMs: now-50 }, { capturedAtMs: now-50, hasActivity:true, trackId:null, trackEverIdentified:false }, now+30);
console.log('f2 ooo', t.state.bus.droppedOutOfOrder, JSON.stringify(t.busDrops), t.tasks.length);
