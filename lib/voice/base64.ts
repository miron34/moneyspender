// Tiny zero-dependency base64 codec for binary data.
//
// React Native ships a global `btoa`/`atob` polyfill in modern Expo SDKs,
// but it operates on binary strings (one char per byte) and trips on
// strings longer than ~1MB on some engines. We hand-roll the encoder for
// `Uint8Array` to avoid both quirks.

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode a `Uint8Array` to a base64 string. Pure JS, works on any runtime.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  const len = bytes.length;
  let i = 0;

  for (; i + 2 < len; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];
    out +=
      B64[b1 >> 2] +
      B64[((b1 & 0x03) << 4) | (b2 >> 4)] +
      B64[((b2 & 0x0f) << 2) | (b3 >> 6)] +
      B64[b3 & 0x3f];
  }

  if (i < len) {
    const b1 = bytes[i];
    if (i + 1 < len) {
      const b2 = bytes[i + 1];
      out +=
        B64[b1 >> 2] +
        B64[((b1 & 0x03) << 4) | (b2 >> 4)] +
        B64[(b2 & 0x0f) << 2] +
        '=';
    } else {
      out += B64[b1 >> 2] + B64[(b1 & 0x03) << 4] + '==';
    }
  }

  return out;
}
