// High-level orchestrator for the voice → expense flow.
//
// Owns a single Recorder instance per session. Exposes three methods that
// match the UI state machine in AddExpenseSheet:
//
//   start()    → begin recording (call on press-in)
//   finish()   → stop, transcribe, parse → ParsedExpense (call on press-out)
//   cancel()   → abandon current take (call on unmount or error)
//
// Why a class with state instead of one big async function:
//   The "press" and "release" are two separate user events. We need to
//   start recording immediately on press-in, then await transcription only
//   after press-out. A single function would have to take two callbacks
//   and own the gesture state internally — messier than a small class.

import { parseExpenseText } from '../parseExpense';
import { STTError } from '../errors';

import { Recorder } from './recorder';
import { transcribeAudio } from './transcribe';
import type { Category } from '@/types';
import type { ParsedExpense } from '@/types/voice';

// Minimum useful recording length. Shorter than this is almost always an
// accidental tap — return null instead of wasting an STT call.
export const MIN_DURATION_MS = 500;

// Hard cap to protect against a stuck press / app backgrounding mid-record.
// Caller should also enforce a UI-side timer that auto-stops here.
export const MAX_DURATION_MS = 15_000;

export interface VoiceCaptureResult {
  /** The parsed expense, or null if input was too short or empty. */
  parsed: ParsedExpense | null;
  /** Raw transcript from STT — useful for debugging / logging. */
  transcript: string;
  /** Recording duration in ms. */
  durationMs: number;
}

export class VoiceCaptureSession {
  private recorder: Recorder | null = null;

  /**
   * Start recording. Throws STTError on permission denial or platform
   * problems. Idempotent guard: if already recording, throws immediately
   * rather than silently restarting.
   */
  async start(): Promise<void> {
    if (this.recorder) {
      throw new STTError('Recording already in progress');
    }
    const recorder = new Recorder();
    await recorder.start();
    this.recorder = recorder;
  }

  /**
   * Stop recording, send to STT, then to NLP. Returns null `parsed` if the
   * recording was too short (< MIN_DURATION_MS) or transcript was empty.
   * Throws on transport / server errors.
   *
   * @param categories User's current category list — passed to NLP so the
   *                   model can return real ids from this list. The caller
   *                   (typically `_layout.tsx`) reads them from Zustand
   *                   right before calling finish() so the matching uses
   *                   the most recent state (handles renames/edits done
   *                   while the user was speaking).
   */
  async finish(categories: Category[]): Promise<VoiceCaptureResult> {
    if (!this.recorder) {
      throw new STTError('No active recording');
    }
    const recorder = this.recorder;
    this.recorder = null;

    const capture = await recorder.stop();

    if (capture.durationMs < MIN_DURATION_MS) {
      return { parsed: null, transcript: '', durationMs: capture.durationMs };
    }

    const transcript = await transcribeAudio(capture);
    if (!transcript.trim()) {
      return { parsed: null, transcript: '', durationMs: capture.durationMs };
    }

    const parsed = await parseExpenseText(transcript, categories);
    // If every field came back null, treat it as "didn't parse" so the
    // caller surfaces a single "не распознано" toast instead of opening
    // an empty confirm card.
    const allNull =
      parsed.amount === null && parsed.name === null && parsed.cat === null;

    return {
      parsed: allNull ? null : parsed,
      transcript,
      durationMs: capture.durationMs,
    };
  }

  /**
   * Abandon the current recording without transcribing. Safe to call when
   * not recording (no-op).
   */
  cancel(): void {
    if (this.recorder) {
      this.recorder.cancel();
      this.recorder = null;
    }
  }

  get isRecording(): boolean {
    return this.recorder !== null;
  }
}
