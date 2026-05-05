# lib/voice/

Голосовой ввод трат: запись микрофона → STT (Yandex SpeechKit через Edge Function) → NLP-парсинг (через `lib/parseExpense.ts`) → структурированный `ParsedExpense` (`{amount, name, cat, date}`).

⚠️ **Web не поддерживается.** При нажатии mic на web — toast «Только в приложении на iPhone» и запись не стартует. Обоснование — `docs/decisions.md` от 2026-05-04. Web-recorder остаётся в коде (`recorder.impl.ts`) на будущее.

## Публичный API

UI-компоненты импортируют только из `lib/voice` (барель `index.ts`). Сейчас единственный потребитель — `app/(tabs)/_layout.tsx`, где живёт state-машина голоса (см. `docs/voice-input.md`).

```ts
import { VoiceCaptureSession, MIN_DURATION_MS, MAX_DURATION_MS } from '@/lib/voice';
```

### `VoiceCaptureSession`

Класс с тремя методами, соответствующими UI-state-machine «press → release»:

| Метод | Когда вызывать |
|---|---|
| `start(): Promise<void>` | На press-in иконки mic. Просит разрешение, начинает запись. Бросает `STTError` если разрешение отклонено или платформа не поддерживается |
| `finish(): Promise<VoiceCaptureResult>` | На press-out. Останавливает запись, отправляет в STT и NLP, возвращает `{parsed, transcript, durationMs}` |
| `cancel(): void` | На размонтирование компонента или при ручной отмене. Идемпотентно |

`finish()` возвращает `parsed: null` в трёх случаях:
1. Длительность < `MIN_DURATION_MS` (500 ms) — случайный тап
2. STT вернул пустую строку — пользователь молчал / шум
3. NLP вернул `{amount:null, name:null, cat:null}` — модель не смогла распарсить

В UI на `parsed === null` показываем warning toast «Не удалось распознать», иначе — confirm-карточку.

## Структура файлов

| Файл | Назначение |
|---|---|
| `index.ts` | Барель публичного API |
| `captureExpense.ts` | Высокоуровневый `VoiceCaptureSession` — orchestrator всего flow |
| `transcribe.ts` | Клиентская обёртка над Edge Function `transcribe-audio` |
| `recorder.ts` | Барель платформенно-зависимой записи аудио |
| `recorder.types.ts` | Общие типы (`IRecorder`, `AudioCapture`) |
| `recorder.impl.ts` | Web-реализация через `MediaRecorder` API. Также fallback для TS-резолюции типов |
| `recorder.impl.native.ts` | Native-реализация через `expo-audio` (iOS/Android). Metro выбирает её на native |
| `wavStrip.ts` | Парсер WAV-заголовка: достаёт raw PCM из `.wav`-файла, который пишет expo-audio в LPCM-режиме |
| `base64.ts` | Бинарный `Uint8Array → base64` без зависимостей |

## Как работает резолюция платформы

Metro при импорте `./recorder.impl` смотрит файлы в таком порядке:
- На native (iOS/Android): `recorder.impl.native.ts` → `recorder.impl.ts`
- На web: `recorder.impl.web.ts` → `recorder.impl.ts`

У нас нет `.web.ts` (он не нужен), но есть `.native.ts` и `.ts`. То есть native берёт `.native.ts`, web берёт `.ts`. TypeScript видит только `.ts` (и для типов этого достаточно — оба файла экспортируют один и тот же `class Recorder implements IRecorder`).

## Аудио-формат (native)

| Платформа | Чем пишем | MIME клиента | SpeechKit format |
|---|---|---|---|
| iOS native (Expo Go / dev client / прод-билд) | expo-audio LPCM 16 кГц mono `.wav` → `wavStrip` режет header → raw PCM | `audio/x-pcm` | `lpcm` |

Web-recorder (`recorder.impl.ts`) валиден и записывает в webm/opus или ogg/opus, но не вызывается — UI на `Platform.OS === 'web'` показывает toast и не доходит до записи. Подробности — `docs/decisions.md` от 2026-05-04.

## Защитные пороги

- **Минимальная длительность:** `MIN_DURATION_MS = 500ms`. Короче — игнорируем (случайный тап), не делаем STT-вызов
- **Максимальная длительность:** `MAX_DURATION_MS = 15s`. UI должен сам останавливать запись по таймеру; сервер дополнительно режет аудио > 256 КБ
- **Permissions:** на native — `requestRecordingPermissionsAsync` из `expo-audio`. На web — браузерный диалог при `getUserMedia`

## Поток данных целиком

```
press-in     session.start()                        Recorder.start()
                                                    ├─ requestPermission
                                                    ├─ getUserMedia / setAudioModeAsync
                                                    └─ begin capture

press-out    session.finish()                       Recorder.stop()
                                                    └─ → AudioCapture {base64, mimeType, durationMs}

             ├─ if duration < MIN → return null
             │
             ├─ transcribeAudio(capture)            Edge: transcribe-audio
             │                                      ├─ → SpeechKit STT
             │                                      └─ → text
             │
             ├─ if text empty → return null
             │
             ├─ parseExpenseText(text)              Edge: parse-expense
             │                                      ├─ → YandexGPT-lite
             │                                      └─ → ParsedExpense
             │
             └─ return {parsed, transcript, durationMs}
```

## Зависимости

- `expo-audio` ~1.1.x — нативная запись. Установлен как config-plugin, разрешения микрофона прописаны в `app.json`
- Браузерный `MediaRecorder` + `getUserMedia` — без npm-зависимостей
