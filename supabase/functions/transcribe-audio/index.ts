// Supabase Edge Function: transcribe-audio
// ----------------------------------------------------------------------------
// Accepts a short audio recording (≤ ~15 seconds) and returns its
// Russian-language transcript via Yandex SpeechKit STT (synchronous mode).
//
// Why a proxy and not a direct client → SpeechKit call:
//   Same reason as parse-expense — the YandexGPT/SpeechKit Api-Key is a
//   billable secret. It must never ship in the Expo bundle. See
//   docs/decisions.md.
//
// Contract:
//   Request:  POST application/json
//             { "audioBase64": "<base64>", "mimeType": "audio/ogg" | "audio/webm" | "audio/x-pcm" }
//   Response: 200 { "text": "пятёрочка восемьсот" }
//             400 { "error": "audio_required" | "invalid_json" | "audio_too_large" }
//             500 { "error": "yandex_not_configured" }
//             502 { "error": "upstream_status" | "upstream_unreachable" }
//
// Why base64 + JSON instead of multipart:
//   1. supabase-js v2 `functions.invoke()` serializes body as JSON by default
//      and can't easily attach a Blob as multipart on React Native. Base64
//      keeps the client code uniform across native/web.
//   2. The size penalty (~33% over raw bytes) is acceptable: a 5-second
//      OGG/Opus recording is ~25 KB → ~33 KB base64. Well under the 256 KB
//      cap we enforce.

import {
  corsHeaders,
  handleCorsPreflight,
  jsonResponse,
} from '../_shared/cors.ts';

const SPEECHKIT_URL =
  'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize';

// Yandex SpeechKit synchronous endpoint accepts payloads up to 1 MB. We cap
// lower because: (a) typical voice expense entries are < 5 sec → < 50 KB,
// (b) anything larger likely means a stuck recording or an upload bug, and
// (c) we want predictable bills (longer audio = longer billing units).
const MAX_AUDIO_BYTES = 256 * 1024; // 256 KB raw

// Mime types we accept from the client. Mapped to the `format` query param
// SpeechKit understands. Anything outside this list → 400.
const MIME_TO_SPEECHKIT_FORMAT: Record<string, string> = {
  'audio/ogg': 'oggopus',
  'audio/ogg;codecs=opus': 'oggopus',
  'audio/webm': 'oggopus', // browsers' MediaRecorder webm/opus is bit-compatible enough
  'audio/webm;codecs=opus': 'oggopus',
  'audio/x-pcm': 'lpcm',
  'audio/lpcm': 'lpcm',
};

interface SpeechKitResponse {
  result?: string;
  error_code?: string;
  error_message?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleCorsPreflight();
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  if (!body || typeof body !== 'object') {
    return jsonResponse({ error: 'audio_required' }, 400);
  }

  const { audioBase64, mimeType } = body as {
    audioBase64?: unknown;
    mimeType?: unknown;
  };

  if (typeof audioBase64 !== 'string' || !audioBase64) {
    return jsonResponse({ error: 'audio_required' }, 400);
  }
  if (typeof mimeType !== 'string' || !mimeType) {
    return jsonResponse({ error: 'mime_type_required' }, 400);
  }

  const speechKitFormat = MIME_TO_SPEECHKIT_FORMAT[mimeType.toLowerCase()];
  if (!speechKitFormat) {
    return jsonResponse(
      { error: 'unsupported_mime_type', mimeType },
      400,
    );
  }

  // Decode base64 → bytes. Reject if too large.
  let audioBytes: Uint8Array;
  try {
    audioBytes = base64ToBytes(audioBase64);
  } catch {
    return jsonResponse({ error: 'invalid_base64' }, 400);
  }
  if (audioBytes.byteLength > MAX_AUDIO_BYTES) {
    return jsonResponse(
      {
        error: 'audio_too_large',
        size: audioBytes.byteLength,
        max: MAX_AUDIO_BYTES,
      },
      400,
    );
  }

  const apiKey = Deno.env.get('YANDEX_API_KEY');
  const folderId = Deno.env.get('YANDEX_FOLDER_ID');
  if (!apiKey || !folderId) {
    return jsonResponse({ error: 'yandex_not_configured' }, 500);
  }

  // SpeechKit accepts query params for folderId, language, format, sample
  // rate, channels. Sample rate matters only for lpcm — for ogg/opus the
  // codec carries it. We always set ru-RU and 16kHz mono (lpcm fallback).
  const params = new URLSearchParams({
    folderId,
    lang: 'ru-RU',
    format: speechKitFormat,
  });
  if (speechKitFormat === 'lpcm') {
    params.set('sampleRateHertz', '16000');
  }
  const url = `${SPEECHKIT_URL}?${params.toString()}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        // Content-Type is the *audio* MIME — SpeechKit reads from raw body.
        'Content-Type': 'application/octet-stream',
      },
      body: audioBytes,
    });
  } catch (e) {
    return jsonResponse(
      { error: 'upstream_unreachable', detail: String(e) },
      502,
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return jsonResponse(
      { error: 'upstream_status', status: upstream.status, detail },
      502,
    );
  }

  let upstreamJson: SpeechKitResponse;
  try {
    upstreamJson = (await upstream.json()) as SpeechKitResponse;
  } catch {
    return jsonResponse({ error: 'upstream_invalid_json' }, 502);
  }

  if (upstreamJson.error_code) {
    return jsonResponse(
      {
        error: 'upstream_error',
        code: upstreamJson.error_code,
        detail: upstreamJson.error_message ?? '',
      },
      502,
    );
  }

  // SpeechKit returns `{result: "..."}` for the recognized text. Empty
  // string is a valid response (silence) — we surface it as 200 with text=""
  // and let the client decide how to react (typically: warning toast).
  const text = typeof upstreamJson.result === 'string'
    ? upstreamJson.result
    : '';

  return new Response(JSON.stringify({ text }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

/**
 * Decode base64 string to a Uint8Array. Uses Deno's built-in atob (which
 * returns a binary string) and then maps charCodes to bytes.
 */
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
