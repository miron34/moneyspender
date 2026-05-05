// Common types for the platform-specific recorder implementations.
//
// Both `recorder.impl.native.ts` and `recorder.impl.web.ts` export a class
// that conforms to this `Recorder` interface. The `recorder.ts` barrel
// re-exports whichever Metro picks per platform.

export interface AudioCapture {
  /** Audio bytes encoded as base64 (no data: URL prefix). */
  base64: string;
  /**
   * MIME type the server's `transcribe-audio` function understands.
   * Currently one of: `audio/webm`, `audio/ogg`, `audio/x-pcm`.
   */
  mimeType: string;
  /** Recording length in milliseconds (best-effort, may be inaccurate). */
  durationMs: number;
}

export interface IRecorder {
  /**
   * Request mic permission, prepare and start capturing. Throws `STTError`
   * if permission denied, mic unavailable, or platform API missing.
   */
  start(): Promise<void>;

  /**
   * Stop capture and return the audio. Throws `STTError` if `start()` was
   * not called first or recording failed.
   */
  stop(): Promise<AudioCapture>;

  /**
   * Cancel an in-flight recording without returning audio. Idempotent —
   * safe to call when not recording.
   */
  cancel(): void;
}
