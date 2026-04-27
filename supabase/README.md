# supabase/

SQL-миграции для Supabase-проекта.

## Структура

```
supabase/
└── migrations/
    └── 0001_init.sql   — первоначальная схема: categories, expenses, индексы, RLS off
```

## Как применить миграцию

CLI Supabase в проекте не настроен — миграции применяются вручную через Dashboard:

1. Открыть https://supabase.com/dashboard/project/<your-project>
2. Перейти в **SQL Editor** (значок `</>` в боковой панели)
3. Создать новый запрос — **+ New query**
4. Скопировать содержимое нужного файла из `supabase/migrations/`
5. Нажать **Run** (или Cmd/Ctrl + Enter)

Миграции написаны идемпотентно (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) — повторный запуск ничего не сломает.

## RLS

В MVP Row Level Security **выключен** на обеих таблицах. Это даёт anon-ключу полный доступ на чтение/запись. Для личного проекта без публикации — допустимо. Перед публикацией нужно:

1. Ввести auth (email magic link или OAuth)
2. Добавить колонку `user_id UUID REFERENCES auth.users(id)`
3. Включить RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
4. Создать политики `auth.uid() = user_id` для SELECT/INSERT/UPDATE/DELETE

## Seed

Seed-данные (10 дефолтных категорий + 31 mock-трата) льются из приложения при первом запуске, если в БД 0 категорий. См. `lib/sync.ts → seedDatabase` и `store/useStore.ts → loadInitial`.
