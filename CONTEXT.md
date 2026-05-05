# Onboarding: как войти в проект

Этот файл — точка входа для новой сессии (новый чат Claude, новый разработчик, ты сам через год). Он не дублирует документацию, а **указывает что в каком порядке читать**, чтобы быстро восстановить контекст.

---

## За 5 минут — обязательный минимум

Прочитай в этом порядке:

1. **[README.md](README.md)** — что за проект, стек, где запущено
2. **[docs/decisions.md](docs/decisions.md)** — почему сделано именно так, а не иначе
3. **[docs/roadmap.md](docs/roadmap.md)** — что уже работает, что в планах

Этого хватит, чтобы понимать **что есть** и **куда движемся**.

---

## За 15 минут — глубже

4. **[docs/architecture.md](docs/architecture.md)** — поток данных, навигация, sync с Supabase
5. **[docs/data-model.md](docs/data-model.md)** — формы Expense, Category, схема БД, маппинг типов
6. **[docs/design-system.md](docs/design-system.md)** — токены, типографика, паттерны компонентов
7. **[docs/deployment.md](docs/deployment.md)** — где задеплоено, как обновлять, env vars

После этого ты можешь открывать любой компонент / экран и понимать что там происходит без догадок.

---

## По папкам

Если нужно копаться в конкретной части кода — у каждой папки свой README:

| Где | О чём |
|---|---|
| [app/README.md](app/README.md) | Expo Router, layouts, контракт с шрифтами |
| [components/README.md](components/README.md) | Принципы разбивки на ui/sheets/navigation |
| [components/ui/README.md](components/ui/README.md) | Все примитивы с примерами использования |
| [components/sheets/README.md](components/sheets/README.md) | Bottom sheets, контракт размещения |
| [components/navigation/README.md](components/navigation/README.md) | Кастомный TabBar с FAB |
| [constants/README.md](constants/README.md) | Дизайн-токены |
| [store/README.md](store/README.md) | Zustand-стор, поток swipe-to-delete |
| [lib/README.md](lib/README.md) | Supabase client, sync layer, haptics |
| [supabase/README.md](supabase/README.md) | Миграции (через Dashboard) и Edge Functions (через CLI) |
| [lib/voice/README.md](lib/voice/README.md) | Голосовой ввод: recorder / transcribe / captureExpense |
| [utils/README.md](utils/README.md) | format / date / analytics |
| [types/README.md](types/README.md) | Глобальные типы |

---

## Если ты — Claude (новая сессия)

**Правила работы**, согласованные с продукт-лидом (хранятся в auto-memory):

1. **Язык общения — русский.** Код / комментарии в коде — английский.
2. **План словами перед кодом.** Никогда не писать код без явного "ок". Сначала описать архитектурное решение / изменение словами, дождаться апрува, потом править файлы.
3. **Документация одновременно с кодом.** Если меняется архитектура / появляется новая папка — обновить соответствующий `README.md` или `docs/*.md` в той же сессии.
4. **На стадии планирования не вставлять код в чат.** Только текст, таблицы, списки. Код — в файлах.

Эти правила также продублированы в `~/.claude/projects/-Users-miron-Desktop-moneyspender/memory/MEMORY.md` (загружается автоматически).

---

## Текущий статус (на момент написания этого файла)

✅ MVP полностью функционален end-to-end:
- Все 4 экрана работают
- Добавление/удаление трат, swipe-to-delete с undo
- Категории редактируются
- Чарты (bar / donut) с анимацией
- Drum-пикер даты
- Bottom sheets с drag-to-close, keyboard avoidance
- Haptics на native
- Supabase БД с seed-функцией, optimistic-first sync
- Production deploy на Vercel
- Тестируется на iPhone через Expo Go

🟡 В работе: возможно следующие шаги — D (новые фичи) или E (auth + RLS)

См. [docs/roadmap.md](docs/roadmap.md) для актуального списка.
