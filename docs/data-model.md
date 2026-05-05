# Модель данных

## TypeScript-типы

Все формы данных живут в `types/index.ts`.

### Expense

Запись о трате.

| Поле | Тип | Описание |
|---|---|---|
| `id` | `number` | Уникальный идентификатор. Локально — `Date.now()`, в БД — `BIGSERIAL` |
| `cat` | `string` | ID категории (foreign key на `Category.id`) |
| `name` | `string` | Название/комментарий. Если пустое при добавлении — подставляется label категории |
| `amount` | `number` | Сумма в рублях, всегда > 0. Знак минус добавляется только при отображении |
| `date` | `Date` | Дата и время траты, с точностью до минуты |

### Category

Категория траты.

| Поле | Тип | Описание |
|---|---|---|
| `id` | `string` | Уникальный идентификатор. У дефолтных — слаги (`food`, `cafe`...), у пользовательских — `cat_${timestamp}` |
| `label` | `string` | Название на русском |
| `color` | `string` | Hex-цвет (`#ff7043`). Используется для иконки, бара в чарте, обводки пилюли |
| `icon` | `string` | Эмодзи (один символ) |
| `description?` | `string` | Опциональная подсказка для голосового парсера (`parse-expense`). Список синонимов / брендов / ключевых слов через запятую. Лимит 200 символов. БД: nullable text-колонка (миграция `0002_category_description.sql`). У дефолтных предзаполнено в `constants/categories.ts`; пользовательские — пустые по умолчанию. |

## Категории по умолчанию

Живут в `constants/categories.ts`. При первом запуске пользователь получает этот набор; может добавлять/удалять/редактировать.

| ID | Label | Color | Icon |
|---|---|---|---|
| `food` | Еда | `#ff7043` | 🛒 |
| `cafe` | Кафе | `#ffb300` | ☕ |
| `trans` | Транспорт | `#29b6f6` | 🚇 |
| `shop` | Покупки | `#26c6da` | 🛍️ |
| `housing` | ЖКХ | `#ab47bc` | 💡 |
| `health` | Здоровье | `#66bb6a` | 💊 |
| `sport` | Спорт | `#9ccc65` | 🏋️ |
| `entert` | Развлечения | `#ec407a` | 🎮 |
| `travel` | Путешествия | `#42a5f5` | ✈️ |
| `other` | Другое | `#78909c` | 📌 |

Также там же — пулы для редактора категорий:
- `ICON_OPTIONS` — массив из ~20 эмодзи на выбор
- `COLOR_OPTIONS` — массив из 12 hex-цветов

## Схема Supabase

В MVP — две таблицы. Без RLS, без auth (anon key с публичным доступом). Финальная схема — в `supabase/migrations/0001_init.sql`.

**Таблица `categories`:**
- `id TEXT PRIMARY KEY` — слаги дефолтных + `cat_<timestamp>` пользовательских
- `label TEXT NOT NULL`
- `color TEXT NOT NULL`
- `icon TEXT NOT NULL`
- `sort_order INT DEFAULT 0`
- `created_at TIMESTAMPTZ DEFAULT NOW()`

**Таблица `expenses`:**
- `id BIGINT PRIMARY KEY` — генерируется на клиенте (`Date.now() * 1000 + random`)
- `cat TEXT REFERENCES categories(id) ON DELETE SET NULL` — при удалении категории траты не пропадают
- `name TEXT NOT NULL`
- `amount NUMERIC NOT NULL CHECK (amount > 0)`
- `date TIMESTAMPTZ NOT NULL`
- `created_at TIMESTAMPTZ DEFAULT NOW()`

**Индексы:**
- `expenses(date DESC)` — для сортировки по дате
- `expenses(cat)` — для фильтра по категории

**Маппинг типов клиент ↔ БД:**

| Поле | Клиент | БД | Конверсия |
|---|---|---|---|
| `expense.id` | `number` | `BIGINT` | прямой |
| `expense.date` | `Date` | `TIMESTAMPTZ` | `toISOString()` ↔ `new Date()` |
| `expense.amount` | `number` | `NUMERIC` | `Number(row.amount)` (Supabase отдаёт как string для precision) |
| `category.id` | `string` | `TEXT` | прямой |

Конверсия живёт в `lib/sync.ts → expenseFromDb / expenseToDb / categoryFromDb / categoryToDb`.

## Селекторы и агрегации

Чистые функции в `utils/`. Принимают массив, возвращают новый — без мутаций.

### `byPeriod(expenses, period)`

Фильтрует траты по периоду относительно текущего момента.

Период | Дни от текущего момента
---|---
`'day'` | < 1
`'week'` | < 7
`'month'` | < 30
`'quarter'` | < 90

### `catStats(expenses)`

Возвращает массив `{id, total}` отсортированный по убыванию суммы. Используется для бар-чарта и donut-чарта.

### `groupByDay(expenses)`

Группирует траты по календарному дню. Возвращает массив `{label, items, total}`.

`label` форматируется через `dayHeader`:
- сегодня → `'Сегодня'`
- вчера → `'Вчера'`
- иначе → `'25 апреля'`

Внутри каждой группы траты отсортированы по дате убыв.

## Форматтеры

В `utils/format.ts`.

| Функция | Вход | Выход |
|---|---|---|
| `fmt(n)` | `1840` | `'1 840 ₽'` (NBSP перед знаком) |
| `fmtK(n)` | `24875` | `'24.9к'` (для donut-центра) |
| `hhmm(d)` | `Date` | `'14:30'` |
| `fmtLabel(d)` | `Date` | `'Сегодня, 14:30'` / `'Вчера, ...'` / `'25 апр, ...'` |
| `dayHeader(d)` | `Date` | `'Сегодня'` / `'Вчера'` / `'25 апреля'` |

Локаль для всех — `ru-RU`. NBSP (` `) используется между числом и `₽`, чтобы они не разрывались переносом.

## Mock-данные

Для отладки UI без подключения к БД — фикстура из 31 траты в `store/mockData.ts`. Покрывает:
- Текущий день, вчера, 2–8 дней назад (для проверки группировки и периодов week/month)
- Прошлый месяц (для аналитики quarter и сравнения периодов)
- Все 10 категорий (для проверки чарта)

Источник — `handoff/MoneySpender v4.html`, переменная `SAMPLE`.
