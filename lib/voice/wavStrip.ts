// Strip the WAV/RIFF header from a PCM file produced by expo-audio on iOS.
//
// Yandex SpeechKit's `format=lpcm` mode expects raw PCM bytes (no RIFF
// wrapper). expo-audio with `outputFormat: 'lpcm'` writes a `.wav` file
// which contains a header (44 bytes for canonical PCM, but can vary if
// extra chunks like `LIST` or `fact` are present). To stay robust we
// scan for the "data" chunk marker.
//
// WAV layout (canonical PCM):
//   bytes  0-3  "RIFF"
//   bytes  4-7  fileSize - 8 (LE)
//   bytes  8-11 "WAVE"
//   bytes 12-15 "fmt "
//   ... fmt chunk ...
//   bytes XX..  "data"           ← we look for this marker
//   bytes XX+4..XX+7 dataSize
//   bytes XX+8..  raw PCM data   ← what we want

const RIFF = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const DATA = [0x64, 0x61, 0x74, 0x61]; // "data"

export interface StripResult {
  pcm: Uint8Array;
  /** Number of bytes the header took. Useful for diagnostics. */
  headerBytes: number;
}

/**
 * If the buffer looks like a WAV file, return the PCM payload (data chunk
 * contents). Otherwise return the buffer unchanged.
 *
 * Never throws — falls back to the original buffer on any parse problem so
 * a slightly unusual WAV variant doesn't kill the voice flow.
 */
export function stripWavHeader(buffer: Uint8Array): StripResult {
  if (buffer.length < 12 || !startsWith(buffer, RIFF)) {
    return { pcm: buffer, headerBytes: 0 };
  }

  // Search for "data" marker. Limit search to first 4KB — real headers are
  // < 100 bytes; anything larger means this isn't a normal WAV.
  const limit = Math.min(buffer.length - 4, 4096);
  for (let i = 12; i < limit; i++) {
    if (
      buffer[i] === DATA[0] &&
      buffer[i + 1] === DATA[1] &&
      buffer[i + 2] === DATA[2] &&
      buffer[i + 3] === DATA[3]
    ) {
      const pcmStart = i + 8; // 4 bytes "data" + 4 bytes size
      if (pcmStart >= buffer.length) {
        return { pcm: buffer, headerBytes: 0 };
      }
      return {
        pcm: buffer.subarray(pcmStart),
        headerBytes: pcmStart,
      };
    }
  }

  return { pcm: buffer, headerBytes: 0 };
}

function startsWith(buffer: Uint8Array, prefix: number[]): boolean {
  for (let i = 0; i < prefix.length; i++) {
    if (buffer[i] !== prefix[i]) return false;
  }
  return true;
}
