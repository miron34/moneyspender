// Platform-routing barrel for the recorder.
//
// Metro's resolution picks `recorder.impl.native.ts` on iOS/Android and
// `recorder.impl.web.ts` on web. Both export the same `Recorder` class
// satisfying `IRecorder`.

export { Recorder } from './recorder.impl';
export type { AudioCapture, IRecorder } from './recorder.types';
