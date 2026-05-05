// Client-side wrapper for the `transcribe-audio` Edge Function.
//
// Takes a base64 audio capture (from the platform recorder) and returns
// the recognized Russian text. Returns `''` for silence/noise (server's
// expected behavior) — the caller decides what to do with empty results.
//
// Throws `STTError` on:
//   - Supabase client not configured
//   - Edge Function transport error
//   - Edge Function returned a structured `{error: ...}`

import { isSupabaseConfigured, supabase } from '../supabase';
import { STTError } from '../errors';

import type { AudioCapture } from './recorder.types';

const TRANSCRIBE_FN = 'transcribe-audio';

interface TranscribeResponse {
  text?: string;
  error?: string;
}

export async function transcribeAudio(capture: AudioCapture): Promise<string> {
  if (!capture.base64) {
    return '';
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new STTError('Supabase is not configured');
  }

  const { data, error } = await supabase.functions.invoke<TranscribeResponse>(
    TRANSCRIBE_FN,
    {
      body: {
        audioBase64: capture.base64,
        mimeType: capture.mimeType,
      },
    },
  );

  if (error) {
    throw new STTError(
      `Edge function transport error: ${error.message ?? 'unknown'}`,
      error,
    );
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new STTError(`Edge function returned error: ${String(data.error)}`, data);
  }

  if (!data || typeof data !== 'object') return '';
  return typeof data.text === 'string' ? data.text : '';
}
