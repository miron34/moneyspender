# lib/

Внешние клиенты и интеграции.

## Файлы

### `supabase.ts`
Синглтон Supabase-клиента. Читает `EXPO_PUBLIC_SUPABASE_URL` и `EXPO_PUBLIC_SUPABASE_ANON_KEY` из переменных окружения. Если хотя бы одна из них пустая — экспортирует `null` и `isSupabaseConfigured = false`. Это позволяет приложению работать на mock-данных без падения.

`auth.persistSession: false` и `autoRefreshToken: false` — явно отключаем сессии, в MVP auth не используется.

### `sync.ts`
Слой синхронизации. Чистые функции, каждая делает один запрос:

| Функция | Что делает |
|---|---|
| `fetchAll()` | `SELECT *` из `categories` и `expenses`, маппит в доменные типы |
| `seedDatabase(cats, expenses)` | One-time INSERT для пустой БД (категории + 31 mock-трата) |
| `pushExpense(e)` | INSERT одной траты |
| `deleteExpenseRemote(id)` | DELETE по id |
| `pushCategory(c)` | INSERT категории |
| `updateCategoryRemote(id, patch)` | UPDATE label/icon/color |
| `deleteCategoryRemote(id)` | DELETE категории |

Все throw'ят на ошибке. Вызывающая сторона (стор) ловит и пишет в `syncError`.

**Маппинг типов:** `expense.date` хранится в БД как `timestamptz` (ISO string), на клиенте — `Date`. Конвертация в обе стороны через `expenseFromDb` / `expenseToDb`.

**ID трат:** генерируются на клиенте — `Date.now() * 1000 + random(0..999)`. Это упрощает optimistic-update (id не нужно ждать с сервера). Коллизия теоретически возможна, но для одного пользователя пренебрежимо мала.

### `haptics.ts`

Тонкая обёртка над `expo-haptics` с no-op fallback на web и обработкой ошибок.

| Функция | Когда использовать |
|---|---|
| `lightTap()` | Переключение табов, выбор пункта в picker'ах |
| `mediumTap()` | FAB, primary actions, открытие важных шитов |
| `success()` | Успешное добавление траты, сохранение категории |
| `warning()` | Удаление, destructive подтверждения |

На web и при `expo-haptics` ошибках — все функции тихо ничего не делают.

```ts
import { mediumTap } from '@/lib/haptics';

<Pressable onPress={() => { mediumTap(); openSheet(); }} />
```

## Принципы

- В `lib/` — только низкоуровневые клиенты и трансформации. Никакой работы с Zustand, никакой реакции на UI.
- Все мутации поверх Supabase — в стор-экшенах (`store/useStore.ts`), которые вызывают эти функции и обрабатывают ошибки.
- Если `isSupabaseConfigured` равен `false` — стор переходит в локальный режим (mock fallback) и не вызывает sync-функции.
