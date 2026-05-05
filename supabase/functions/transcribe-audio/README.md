# supabase/functions/transcribe-audio/

Edge Function-прокси к Yandex SpeechKit STT (синхронный режим). Принимает
короткое аудио на русском языке (≤ 15 сек), возвращает транскрипт.

## Зачем функция, а не прямой вызов из клиента

Тот же ключ `YANDEX_API_KEY`, что используется в `parse-expense`. См.
`docs/decisions.md` — полное обоснование.

## Контракт

**Запрос:**
```
POST /functions/v1/transcribe-audio
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY>

{
  "audioBase64": "<base64-encoded audio bytes>",
  "mimeType": "audio/ogg" | "audio/webm" | "audio/x-pcm"
}
```

**Ответ 200:**
```json
{ "text": "пятёрочка восемьсот" }
```

`text` может быть пустой строкой — это валидный ответ SpeechKit при тишине.
Клиент в этом случае показывает warning toast «Не удалось распознать».

**Ответы 4xx/5xx:**

| HTTP | error | Когда |
|---|---|---|
| 400 | `invalid_json` | Body — не JSON |
| 400 | `audio_required` | Нет поля `audioBase64` |
| 400 | `mime_type_required` | Нет поля `mimeType` |
| 400 | `unsupported_mime_type` | MIME не из списка ниже |
| 400 | `invalid_base64` | `audioBase64` — не валидный base64 |
| 400 | `audio_too_large` | Аудио > 256 КБ |
| 405 | `method_not_allowed` | Не POST/OPTIONS |
| 500 | `yandex_not_configured` | Нет `YANDEX_API_KEY` или `YANDEX_FOLDER_ID` |
| 502 | `upstream_unreachable` | Сеть до SpeechKit упала |
| 502 | `upstream_status` | SpeechKit вернул не-2xx |
| 502 | `upstream_invalid_json` | SpeechKit вернул не-JSON |
| 502 | `upstream_error` | SpeechKit вернул `{error_code, error_message}` |

## Поддерживаемые MIME-типы

| MIME клиента | SpeechKit format |
|---|---|
| `audio/ogg`, `audio/ogg;codecs=opus` | `oggopus` |
| `audio/webm`, `audio/webm;codecs=opus` | `oggopus` (совместимы по битстриму) |
| `audio/x-pcm`, `audio/lpcm` | `lpcm` (16 кГц моно, обязательно) |

## Почему base64 в JSON, а не multipart

`supabase-js` `functions.invoke()` сериализует body как JSON по дефолту, и
прицепить `Blob` через multipart на React Native неудобно. Base64 даёт
единый клиентский код для native/web ценой +33% к размеру (3,3 КБ → 4,4 КБ
на 1 секунду opus — несущественно).

## Лимиты и цена

- **Размер:** жёсткий cap 256 КБ → реально ≈ 60 секунд oggopus, защита от
  залипшей записи / ошибки клиента.
- **Длительность аудио:** клиент сам ограничивает 15 сек (см.
  `lib/voice/recorder.ts`). Сервер не парсит длительность — только размер.
- **Цена:** ~0.18 ₽ за 15 секунд распознавания. Округляется вверх до 15-сек
  единиц. Реальная фраза 3-5 сек = 0.18 ₽ за вызов.

Актуальный прайс — https://yandex.cloud/ru/docs/speechkit/pricing.

## Локальное тестирование

```bash
# 1. Положить секреты в .env.local (рядом с supabase/)
echo "YANDEX_API_KEY=AQVNxxx..." > supabase/.env.local
echo "YANDEX_FOLDER_ID=b1gxxx..." >> supabase/.env.local

# 2. Запустить функцию локально
supabase functions serve transcribe-audio --env-file supabase/.env.local --no-verify-jwt

# 3. Подготовить тестовое аудио (oggopus, ≤ 256 КБ)
ffmpeg -f lavfi -i "sine=frequency=440:duration=1" -c:a libopus test.ogg
B64=$(base64 -i test.ogg)

# 4. Дёрнуть curl
curl -X POST http://localhost:54321/functions/v1/transcribe-audio \
  -H "Content-Type: application/json" \
  -d "{\"audioBase64\":\"$B64\",\"mimeType\":\"audio/ogg\"}"
```

## Деплой

```bash
supabase functions deploy transcribe-audio
```

Секреты деплоятся отдельно (см. `supabase/README.md`):

```bash
supabase secrets set YANDEX_API_KEY=AQVN... YANDEX_FOLDER_ID=b1g...
```

Если ты уже задеплоил `parse-expense` — секреты уже на сервере, повторно
выставлять не нужно. Обе функции читают одни и те же переменные.

## Где взять доступ к SpeechKit в Yandex Cloud

1. Зайти в каталог Yandex Cloud Console.
2. SpeechKit → Подключить (если ещё не подключён).
3. У того же сервисного аккаунта (что для `parse-expense`) добавить роль
   `ai.speechkit-stt.user`.

## Будущие улучшения

- Сейчас sync-режим (одна короткая фраза). Для >30 сек переходить на
  long-running async API SpeechKit с polling — но для нашего сценария
  «голос → одна трата» sync достаточен.
- При необходимости — переход на streaming API SpeechKit для live-транскрипта.
  Это потребует WebSocket в Edge Function (Deno поддерживает) + менять
  клиентский recorder на стрим-чанки.
