# Deployment

Где живёт приложение и его данные, как обновлять.

---

## Где что лежит

| Слой | Где | URL / Идентификатор |
|---|---|---|
| Веб-приложение | Vercel | https://moneyspender.vercel.app |
| Source code | GitHub | https://github.com/miron34/moneyspender |
| База данных | Supabase | проект `xxqmdykznupmslwspjqd` (Frankfurt, eu-west-1, FREE / NANO) |
| Доменное имя | Vercel auto | `*.vercel.app` (custom domain — не настроен) |
| HTTPS-сертификат | Vercel auto | Let's Encrypt, обновляется автоматически |

---

## Как обновлять веб-приложение

Полностью автоматически:

```
git push origin main
   ↓
GitHub отправляет webhook в Vercel
   ↓
Vercel клонирует репо, запускает npm install
   ↓
Vercel запускает `npx expo export --platform web` (см. vercel.json)
   ↓
Vercel загружает dist/ в свой CDN
   ↓
Через ~2-3 мин новая версия живёт на moneyspender.vercel.app
```

Видеть логи можно на https://vercel.com/miron34s-projects/moneyspender → вкладка **Deployments**.

Каждый деплой получает уникальный preview-URL (`*-xxx-miron34s-projects.vercel.app`) — это нужно если хочешь посмотреть конкретную версию из истории. На основной URL (`moneyspender.vercel.app`) уезжает только последний успешный билд из ветки `main`.

### Откатить обновление

В Vercel Dashboard → Deployments → найти нужный билд → "Promote to Production". Через несколько секунд `moneyspender.vercel.app` укажет на эту версию.

---

## Конфигурация деплоя

### `vercel.json` (в репо)

```json
{
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "cleanUrls": true,
  "trailingSlash": false
}
```

**Почему `cleanUrls: true`:** Expo web-export генерирует плоские файлы `index.html`, `history.html`, `analytics.html`, `profile.html`. Без `cleanUrls` URL `/history` вернул бы 404, потому что Vercel не подставляет `.html` суффикс. С `cleanUrls` — `/history` → `history.html`, `/analytics` → `analytics.html` и так далее.

### Environment Variables на Vercel

Заданы вручную в Vercel Dashboard → Project Settings → Environment Variables:

| Имя | Значение | Где видно |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://xxqmdykznupmslwspjqd.supabase.co` | в bundle (публично, ок) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | в bundle (публично, ок) |

**Префикс `EXPO_PUBLIC_`** — обязателен для Expo: только переменные с этим префиксом попадают в клиентский код. Без префикса они недоступны (нет SSR в нашей сборке).

**Anon key — публичный по дизайну.** Он встроен в JS-bundle и виден любому, кто заходит на сайт. Это нормально. Реальный приватный ключ — `service_role` — есть в Supabase Dashboard, но мы его никогда не используем, и он никогда не должен попасть в репо или env vars клиента.

---

## Локальный `.env`

Файл `.env` в корне проекта (не в git, исключён через `.gitignore`):

```
EXPO_PUBLIC_SUPABASE_URL=https://xxqmdykznupmslwspjqd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Если `.env` отсутствует, `lib/supabase.ts` детектит это (`isSupabaseConfigured = false`) и стор работает в mock-режиме (in-memory фикстура).

При клонировании репо на новой машине:
1. `cp .env.example .env`
2. Заполнить значения (взять из Supabase Dashboard → Project Settings → API)
3. `npm install && npm run web`

---

## База данных (Supabase)

### Где Dashboard

https://supabase.com/dashboard/project/xxqmdykznupmslwspjqd

### Применить миграцию

Schema-изменения хранятся в `supabase/migrations/*.sql`. Их нужно вручную применить в Dashboard:

1. Открыть **SQL Editor** в боковой панели
2. **+ New query**
3. Скопировать содержимое нужного `.sql` файла из репо
4. **Run** (или `Cmd + Enter`)

Все миграции написаны идемпотентно (`CREATE TABLE IF NOT EXISTS`), повторный запуск ничего не сломает.

В будущем можно автоматизировать через Supabase CLI (`supabase db push`), но для одного проекта это лишняя зависимость.

### Сбросить данные (для отладки)

```sql
TRUNCATE TABLE expenses, categories CASCADE;
```

После этого перезагрузить приложение — `loadInitial()` увидит пустую БД и автоматически зальёт seed (10 категорий + 31 mock-трату).

### Мониторинг

В Dashboard:
- **Table Editor** — содержимое таблиц с фильтрами
- **SQL Editor** — произвольные запросы
- **Logs** — слова "API logs" (видно все запросы клиента)
- **Authentication** — пусто, потому что auth не используется в MVP

---

## Стоимость

| Сервис | Тариф | Лимит | Стоимость |
|---|---|---|---|
| Vercel | Hobby | 100 GB трафика / мес | **$0** |
| Supabase | Free | 500 MB БД, 5 GB трафика, 50 000 monthly active users | **$0** |
| GitHub | Free | публичный репо | **$0** |
| Apple Developer | (не нужен в текущем deploy) | для App Store | $99/год |

Текущий месячный счёт за production = **0**.

---

## Что делать перед публикацией для других пользователей

Сейчас приложение технически публично (любой по URL зайдёт), но БД одна на всех — все будут видеть одни и те же траты. Перед публикацией нужно (см. `docs/roadmap.md → E`):

1. Включить Supabase Auth
2. Добавить `user_id` в обе таблицы и RLS-политики
3. Сделать экран логина
4. Заменить хардкод "Мирон" на имя из `auth.user.user_metadata`
5. Опционально: настроить custom domain в Vercel (`moneyspender.com` или `moneyspender.miron.dev`)
