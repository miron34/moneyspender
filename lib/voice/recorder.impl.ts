// Web recorder implementation via the browser MediaRecorder API.
//
// This file is also the *fallback* TypeScript sees when resolving
// `./recorder.impl` — Metro's platform-aware resolver picks
// `recorder.impl.native.ts` on iOS/Android and falls back here on web.
// Keeping this as the bare `.ts` (without `.web` suffix) means tsc finds
// it without any module-resolution magic.
//
// Works in:
//   - Desktop Chrome / Edge / Firefox  → audio/webm;codecs=opus
//   - iOS Safari (>= 14.5)             → audio/mp4 OR audio/ogg (varies)
//   - Mobile Chrome on Android         → audio/webm;codecs=opus
//
// The server's `transcribe-audio` function maps `audio/webm` and
// `audio/ogg` both to SpeechKit's `oggopus` format — they're bit-stream
// compatible enough that SpeechKit accepts either. iOS Safari's `audio/mp4`
// would need conversion; we handle this by preferring webm/ogg via
// `MediaRecorder.isTypeSupported()` and falling back to whatever the
// browser gives us if neither is supported.

import { STTError } from '../errors';

import type { AudioCapture, IRecorder } from './recorder.types';

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

export class Recorder implements IRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private mimeType = '';
  private startedAt = 0;

  async start(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      throw new STTError('MediaDevices API not available in this browser');
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new STTError('MediaRecorder not supported in this browser');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      throw new STTError('Microphone permission denied or unavailable', e);
    }

    const mime =
      PREFERRED_MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
    this.mimeType = mime || 'audio/webm';
    this.chunks = [];

    try {
      this.mediaRecorder = new MediaRecorder(
        this.stream,
        mime ? { mimeType: mime } : {},
      );
    } catch (e) {
      this.cleanup();
      throw new STTError('Failed to construct MediaRecorder', e);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    try {
      this.mediaRecorder.start();
      this.startedAt = Date.now();
    } catch (e) {
      this.cleanup();
      throw new STTError('Failed to start MediaRecorder', e);
    }
  }

  stop(): Promise<AudioCapture> {
    return new Promise<AudioCapture>((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new STTError('Recorder not started'));
        return;
      }
      const recorder = this.mediaRecorder;
      const startedAt = this.startedAt;

      recorder.onstop = async () => {
        try {
          const blob = new Blob(this.chunks, { type: this.mimeType });
          const base64 = await blobToBase64(blob);
          const durationMs = Math.max(0, Date.now() - startedAt);
          this.cleanup();
          resolve({
            base64,
            mimeType: normalizeMime(this.mimeType),
            durationMs,
          });
        } catch (e) {
          this.cleanup();
          reject(
            e instanceof STTError
              ? e
              : new STTError('Failed to encode audio blob', e),
          );
        }
      };

      try {
        recorder.stop();
      } catch (e) {
        this.cleanup();
        reject(new STTError('Failed to stop MediaRecorder', e));
      }
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null;
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore — we're abandoning the take
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.startedAt = 0;
  }
}

function normalizeMime(m: string): string {
  // The server understands the bare type without codec suffix. Safari may
  // hand us `audio/mp4` — we pass it through and let the server reject.
  if (m.startsWith('audio/webm')) return 'audio/webm';
  if (m.startsWith('audio/ogg')) return 'audio/ogg';
  return m;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new STTError('FileReader returned non-string'));
        return;
      }
      // result is a `data:audio/webm;base64,...` URL — strip the prefix.
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new STTError('FileReader error'));
    reader.readAsDataURL(blob);
  });
}
