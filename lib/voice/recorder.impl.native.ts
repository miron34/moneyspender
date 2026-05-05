// Native (iOS / Android) recorder implementation via expo-audio.
//
// Strategy:
//   1. Record raw 16-bit PCM @ 16 kHz mono into a `.wav` file (iOS).
//      SpeechKit's `lpcm` format wants raw PCM, but expo-audio always wraps
//      output in a container (WAV on iOS). We strip the WAV header on the
//      client before uploading.
//   2. Read the file via `fetch(file://uri)` → ArrayBuffer (works in RN
//      without `expo-file-system` because RN's fetch handles file:// URIs).
//   3. Strip the RIFF/WAVE header → raw PCM bytes.
//   4. Base64-encode.
//   5. Send `audio/x-pcm` to the server, which forwards to SpeechKit
//      with `format=lpcm&sampleRateHertz=16000`.
//
// Why not Android-specific options here:
//   The current target is iOS (Expo Go on iPhone) and web. Android works
//   with the same lpcm extension via the shared `extension`/`sampleRate`
//   fields, but the audio container differs. If/when Android becomes a
//   real target we'll add android-specific options. For now the user
//   tests only on iOS Expo Go and Safari, and the web impl handles both
//   desktop and mobile Safari.

import {
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
} from 'expo-audio';

import { STTError } from '../errors';

import { bytesToBase64 } from './base64';
import { stripWavHeader } from './wavStrip';
import type { AudioCapture, IRecorder } from './recorder.types';

const SAMPLE_RATE = 16000; // SpeechKit expects 8 or 16 kHz for lpcm
const NUM_CHANNELS = 1;

// 16 kHz × 1 ch × 16-bit = 256 kbps raw PCM. We pass this for Android's
// MediaRecorder to size buffers; iOS ignores it for LINEARPCM.
const PCM_BIT_RATE = SAMPLE_RATE * NUM_CHANNELS * 16;

const RECORDING_OPTIONS = {
  extension: '.wav',
  sampleRate: SAMPLE_RATE,
  numberOfChannels: NUM_CHANNELS,
  bitRate: PCM_BIT_RATE,
  isMeteringEnabled: false,
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    sampleRate: SAMPLE_RATE,
    numberOfChannels: NUM_CHANNELS,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    extension: '.m4a',
    outputFormat: 'mpeg4' as const,
    audioEncoder: 'aac' as const,
    sampleRate: SAMPLE_RATE,
    numberOfChannels: NUM_CHANNELS,
    bitRate: 64000,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

export class Recorder implements IRecorder {
  private recorder: AudioRecorder | null = null;
  private startedAt = 0;

  async start(): Promise<void> {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      throw new STTError('Microphone permission denied');
    }

    try {
      // iOS needs the audio session set to "allowsRecording" before record
      // starts. setAudioModeAsync is a no-op on Android.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    } catch (e) {
      throw new STTError('Failed to configure audio mode', e);
    }

    try {
      // SDK 54 exposes the AudioRecorder constructor on AudioModule.
      this.recorder = new AudioModule.AudioRecorder(RECORDING_OPTIONS);
      await this.recorder.prepareToRecordAsync();
      this.recorder.record();
      this.startedAt = Date.now();
    } catch (e) {
      this.recorder = null;
      throw new STTError('Failed to start recording', e);
    }
  }

  async stop(): Promise<AudioCapture> {
    if (!this.recorder) {
      throw new STTError('Recorder not started');
    }
    const recorder = this.recorder;
    const startedAt = this.startedAt;

    try {
      await recorder.stop();
    } catch (e) {
      this.cleanup();
      throw new STTError('Failed to stop recording', e);
    }

    const uri = recorder.uri;
    if (!uri) {
      this.cleanup();
      throw new STTError('Recording produced no file');
    }

    let bytes: Uint8Array;
    try {
      const res = await fetch(uri);
      const ab = await res.arrayBuffer();
      bytes = new Uint8Array(ab);
    } catch (e) {
      this.cleanup();
      throw new STTError('Failed to read recording file', e);
    }

    const { pcm } = stripWavHeader(bytes);
    const base64 = bytesToBase64(pcm);
    const durationMs = Math.max(0, Date.now() - startedAt);

    this.cleanup();

    return {
      base64,
      mimeType: 'audio/x-pcm',
      durationMs,
    };
  }

  cancel(): void {
    if (this.recorder) {
      // Best-effort stop; ignore errors since caller is abandoning the take.
      this.recorder.stop().catch(() => {});
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.recorder = null;
    this.startedAt = 0;
  }
}
