# Голосовой ввод трат

Зажал микрофон в TabBar → сказал «вчера такси 350» → отпустил → подтвердил карточку → трата сохранена.

## ⚠️ Поддерживаемые платформы

| Платформа | Статус |
|---|---|
| iOS native (Expo Go / dev client / прод-билд) | ✅ работает |
| Android native | ✅ работает (теоретически — не тестировали в боевом режиме) |
| Web (Chrome / Firefox / Safari / любой браузер) | ❌ **не поддерживается** |

При нажатии mic-FAB на web показывается тост «Только в приложении на iPhone» и запись не стартует. Обоснование — `docs/decisions.md` запись от 2026-05-04 «Голос на web не поддерживаем».

## Где живёт голос в UI

```
                                                    ┌──────┐
                                                    │ 🎙️  │  ← VoiceFab (60×60),
                                                    └──────┘     bottom-right
                                                                 thumb zone
[ home  clock   ➕   bar-chart  user ]   ← floating pill TabBar
                                            (frosted-glass blur)
```

**VoiceFab** — самостоятельная floating-кнопка в правом нижнем углу, над TabBar. Push-to-talk: зажал → пишем (concentric ripples), отпустил → стоп → processing (вращающийся loader + breathing pulse) → VoiceConfirmSheet.

**TabBar** — pill-shaped frosted-glass island внизу экрана. 4 иконки (без текстовых лейблов) + центральный «+» FAB для ручного ввода. Подсветка активного таба — accent-цвет + pill-фон под иконкой.

## Слои

| Слой | Где | Что делает |
|---|---|---|
| State-машина голоса | `app/(tabs)/_layout.tsx` | Держит `voiceState`, `pending`, ref на VoiceCaptureSession. Обрабатывает press-in / press-out с VoiceFab. Скрывает VoiceFab пока открыт любой шит |
| VoiceFab UI | `components/navigation/VoiceFab.tsx` | Hero-FAB 60×60 в правом нижнем углу. Concentric ripples при recording, вращающийся loader + pulse при processing |
| TabBar UI | `components/navigation/TabBar.tsx` | Floating pill-bar с blur-фоном. Только навигация + центральный «+» FAB для ручного ввода. Голос вынесен в VoiceFab |
| Confirm UI | `components/sheets/VoiceConfirmSheet.tsx` | Bottom sheet с распознанными значениями, две кнопки |
| Manual-edit handoff | `useStore.voicePending` (Zustand) | Когда «Изменить» — confirm кладёт ParsedExpense сюда, AddExpenseSheet читает на open |
| Запись | `lib/voice/recorder.impl.native.ts` | expo-audio LPCM 16 кГц mono → strip wav header → audio/x-pcm |
| Orchestrator | `lib/voice/captureExpense.ts` | `VoiceCaptureSession` — `start() / finish() / cancel()` |
| STT | `supabase/functions/transcribe-audio/` | Прокси к Yandex SpeechKit |
| NLP | `supabase/functions/parse-expense/` | Прокси к YandexGPT-lite + few-shot. Принимает today/tz для дат |

## Полный поток (sequence)

```
[idle]   Иконка mic в TabBar — обычный градиентный круг
         (web: тап → toast «Только в приложении на iPhone», конец)
   │
   │ press-in
   ▼
session.start()
   │ ─── if user lifts finger before start() resolves ──▶ cancel, [idle]
   ▼
[recording]  Иконка accent + pulse, lightTap-haptic
   │ — auto-stop через 15 сек
   │ press-out
   ▼
session.finish()
   │   · stop expo-audio recorder
   │   · read .wav, strip header → raw PCM
   │   · POST /transcribe-audio → text
   │   · if duration < 500ms → return null (случайный тап)
   │   · if text empty → return null (тишина)
   │   · POST /parse-expense (с today + tz) → ParsedExpense
   │   · if all fields null → return null
   │
   ├─ null parsed ──▶ toast «Не удалось распознать», [idle]
   ├─ throws ──▶ toast «Ошибка распознавания», [idle]
   ▼
[confirm]  VoiceConfirmSheet открывается, success-haptic
   │   Карточка: сумма, chip категории, name, дата (если ≠ today)
   │
   ├─ «Сохранить» ──▶ addExpense (date = pending.date или today),
   │                  закрыть confirm, [idle]
   │
   └─ «Изменить» ──▶ store.setVoicePending(pending),
                     закрыть confirm,
                     через 60мс открыть AddExpenseSheet
                       └─ AddExpenseSheet useEffect on open читает
                          voicePending, заполняет поля, делает
                          setVoicePending(null) — очищает slot
```

## Контракты Edge Functions

### `parse-expense`
- **Запрос:**
  ```json
  {
    "text": "вчера такси 350",
    "today": "2026-05-04",
    "tz": "Europe/Moscow",
    "categories": [
      { "id": "food", "label": "Еда", "description": "продукты, Пятёрочка..." },
      { "id": "cat_99", "label": "Инструменты", "description": "дрель, фрезер" }
    ]
  }
  ```
  - `today` / `tz` — без них модель не понимает «вчера», «3 дня назад»
  - `categories` — обязательно, 1..30 элементов. Модель возвращает id из этого списка или null
- **Ответ:** `{ "amount": 350, "name": "Такси", "cat": "trans", "date": "2026-05-03" }`
- Подробности — `supabase/functions/parse-expense/README.md`

### `transcribe-audio`
- **Запрос:** `{ "audioBase64": "<...>", "mimeType": "audio/x-pcm" }`
- **Ответ:** `{ "text": "пятёрочка восемьсот" }` (пустая = тишина)
- **Лимит:** 256 КБ raw bytes
- Подробности — `supabase/functions/transcribe-audio/README.md`

## Дата в матчинге

Модель умеет вытаскивать дату из фразы, если она названа явно. Иначе — `null`, и клиент подставляет сегодня при сохранении.

| Фраза пользователя | Что вернёт модель (today=2026-05-04) |
|---|---|
| «такси 350» | `date: null` → клиент сохранит как 2026-05-04 |
| «вчера такси 350» | `date: "2026-05-03"` |
| «позавчера обед 500» | `date: "2026-05-02"` |
| «3 дня назад продукты 1200» | `date: "2026-05-01"` |
| «25 апреля такси 350» | `date: "2026-04-25"` |
| «25 декабря подарок 5000» | `date: "2025-12-25"` (год прошлый) |
| «в понедельник кофе 200» | дата ближайшего прошедшего понедельника |
| «завтра кофе 200» | `date: null` (будущее → сервер режет) |
| «5 лет назад машина 1млн» | `date: null` (старше 365 дней — сервер режет) |

## Directive parsing — явные команды (с 2026-05-04)

Модель понимает явные указания, которые перебивают контекст:

| Тип директивы | Триггеры | Пример |
|---|---|---|
| **Категория** | «в категорию X», «отнеси к X», «запиши в X», «категория X» | «такси 350 в категорию работа» → cat = id «Работа» |
| **Имя/комментарий** | «в комментарий X», «напиши в комментарии X», «в название X» | «500 на еду, в комментарий пятёрочка» → name = "пятёрочка", cat = food |

Если директива указала несуществующую категорию — модель пытается найти ближайшую по смыслу из списка (best-effort). Если ничего не подходит — `cat=null`, пользователь добавит вручную через «Изменить».

## Подсказки для голоса (description у категорий)

Каждая категория имеет опциональное поле `description` — фраза-подсказка для модели. Например, для пользовательской «Образование» можно вписать «учебники, курсы, книги». Тогда «учебник 500» правильно определится в эту категорию.

Дефолтные 10 категорий приходят с предзаполненными descriptions (Pятёрочка/Магнит для food, дрель/фрезер для… не для дефолтных, а для эвентуально создаваемых пользовательских — но логика та же).

Редактируется в Профиле → редактирование категории → поле «Подсказка для голоса». Лимит — 200 символов.

В Confirm-карточке дата показывается строкой «Вчера», «5 апреля» (через `dayHeader` из `utils/format.ts`). Если дата = today — строка скрыта.

При «Изменить» — дата подставляется в DrumPicker формы через `voicePending`, можно править руками.

## Защитные пороги

- **MIN_DURATION_MS = 500** — короче считается случайным тапом
- **MAX_DURATION_MS = 15000** — UI авто-стопит
- **MAX_AUDIO_BYTES = 256 КБ** на сервере — последняя линия обороны
- **Date sanity window:** today + 1 день (TZ tolerance) … today − 365 дней
- **MAX_INPUT_LEN = 500** символов на сервере — защита от prompt-injection
- **Permissions:** на native — `expo-audio.requestRecordingPermissionsAsync`. iOS показывает диалог с текстом из `app.json` → `ios.infoPlist.NSMicrophoneUsageDescription`

## Цена

| Шаг | Цена за вызов |
|---|---|
| SpeechKit STT | ~0.18 ₽ (округление до 15 сек) |
| YandexGPT-lite NLP | ~0.30 ₽ (~1500 промпт-токенов + ~30 ответ) |
| **Итого** | **~0.48 ₽ за фразу** |

При 100 фразах/день — ~48 ₽/мес. Грант 4000 ₽ покроет на ~2 года.

## Что НЕ делаем (отказались осознанно)

- **Live-транскрипт** — нет, требует выйти из Expo Go (`expo-speech-recognition` + dev client). См. `docs/decisions.md`.
- **Не показываем сырой STT-текст** — пользователь видит только итоговый матч.
- **Web-голос** — отложен (см. `docs/decisions.md` от 2026-05-04). Тост «Только в приложении на iPhone».
- **Без retry-очереди** — голос интерактивный, пользователь сразу видит провал и переговаривает.
- **Без offline-режима** — STT и NLP оба требуют сеть.

## Подключение и деплой

См. `supabase/README.md` (раздел Edge Functions). Обе функции (`parse-expense` и `transcribe-audio`) используют одни секреты `YANDEX_API_KEY` + `YANDEX_FOLDER_ID`.

Сервисный аккаунт в Yandex Cloud Console должен иметь обе роли:
- `ai.languageModels.user`
- `ai.speechkit-stt.user`
