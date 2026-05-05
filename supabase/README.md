# supabase/

SQL-миграции и Edge Functions для Supabase-проекта.

## Структура

```
supabase/
├── config.toml         — конфиг Supabase CLI (создан `supabase init`)
├── migrations/
│   └── 0001_init.sql   — первоначальная схема: categories, expenses, индексы, RLS off
└── functions/
    ├── _shared/
    │   ├── cors.ts              — общие CORS-хелперы для всех функций
    │   └── types.ts             — общие типы между функциями (Deno-runtime)
    ├── parse-expense/           — NLP-парсинг трат через YandexGPT-lite
    │   ├── index.ts             — Deno-handler
    │   ├── prompt.ts            — системный промпт + 14 few-shot
    │   ├── validate.ts          — защитная валидация ответа модели
    │   └── README.md            — контракт, локальный запуск, деплой
    └── transcribe-audio/        — STT через Yandex SpeechKit (sync mode)
        ├── index.ts             — Deno-handler
        └── README.md            — контракт, MIME-типы, цена, деплой
```

## Как применить миграцию

Миграции в этом проекте применяются вручную через Dashboard (CLI-миграции не настроены — `supabase init` создал config только под Edge Functions):

1. Открыть https://supabase.com/dashboard/project/<your-project>
2. Перейти в **SQL Editor** (значок `</>` в боковой панели)
3. Создать новый запрос — **+ New query**
4. Скопировать содержимое нужного файла из `supabase/migrations/`
5. Нажать **Run** (или Cmd/Ctrl + Enter)

Миграции написаны идемпотентно (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) — повторный запуск ничего не сломает.

**Текущий список:**
- `0001_init.sql` — categories, expenses, индексы, RLS off
- `0002_category_description.sql` — `categories.description` (опциональная подсказка для голосового парсера)

## Edge Functions

В отличие от миграций, функции деплоятся через CLI:

```bash
# Одноразово
brew install supabase/tap/supabase
supabase login                                       # открывает браузер
supabase link --project-ref xxqmdykznupmslwspjqd

# Положить секреты на сервер (для parse-expense)
supabase secrets set YANDEX_API_KEY=AQVNxxx... YANDEX_FOLDER_ID=b1gxxx...

# Деплой (после любых правок в functions/)
supabase functions deploy parse-expense
supabase functions deploy transcribe-audio
```

Обе функции читают одни и те же секреты. Сервисному аккаунту в Yandex Cloud нужны обе роли:
- `ai.languageModels.user` (для `parse-expense`)
- `ai.speechkit-stt.user` (для `transcribe-audio`)

Подробности по конкретной функции — в её README, например `functions/parse-expense/README.md` или `functions/transcribe-audio/README.md`.

## RLS

В MVP Row Level Security **выключен** на обеих таблицах. Это даёт anon-ключу полный доступ на чтение/запись. Для личного проекта без публикации — допустимо. Перед публикацией нужно:

1. Ввести auth (email magic link или OAuth)
2. Добавить колонку `user_id UUID REFERENCES auth.users(id)`
3. Включить RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
4. Создать политики `auth.uid() = user_id` для SELECT/INSERT/UPDATE/DELETE

## Seed

Seed-данные (10 дефолтных категорий + 31 mock-трата) льются из приложения при первом запуске, если в БД 0 категорий. См. `lib/sync.ts → seedDatabase` и `store/useStore.ts → loadInitial`.
