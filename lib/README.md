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

### `voice/`

Голосовой ввод трат: запись микрофона → STT → NLP → структурированный `ParsedExpense`. Подробности — `lib/voice/README.md` и `docs/voice-input.md`. Публичный API:

```ts
import { VoiceCaptureSession, MIN_DURATION_MS, MAX_DURATION_MS } from '@/lib/voice';

const session = new VoiceCaptureSession();
await session.start();        // на press-in иконки mic
const result = await session.finish();   // на press-out → {parsed, transcript, durationMs}
session.cancel();             // на отмену / unmount
```

### `parseExpense.ts`

Клиентская обёртка над Edge Function `parse-expense`. Принимает свободную русскую фразу о трате, возвращает структурированный `ParsedExpense` (`{amount, name, cat}`).

| Вход | Выход |
|---|---|
| `"в пятёрочке на 800"` | `{amount: 800, name: "Пятёрочка", cat: "food"}` |
| `"такси 350"` | `{amount: 350, name: "Такси", cat: "trans"}` |
| `""` | `{amount: null, name: null, cat: null}` (без сетевого запроса) |

Бросает `ParseExpenseError` при сетевых ошибках, отсутствии конфигурации Supabase и при структурированных `{error: ...}` ответах функции. **Не** бросает при «модель не смогла распарсить» — возвращает all-null, вызывающая сторона решает что делать (обычно — оставить форму как есть и показать тост).

`cat` приходит slug'ом (`food/cafe/...`). Маппинг slug → `Category.id` пользователя — на стороне вызывающего компонента (типично `AddExpenseSheet`), потому что только он знает текущий выбранный fallback.

### `errors.ts`

| Класс | Когда бросается |
|---|---|
| `ParseExpenseError` | Ошибка вызова `parse-expense` Edge Function (сеть, конфиг, ответ функции с `error`) |
| `STTError` | Ошибка записи микрофона или вызова `transcribe-audio` (нет разрешения, MediaRecorder не поддерживается, сетевой сбой) |

Оба класса наследуются от `Error`, имеют `.name` и опциональный `.cause` для оригинальной transport-ошибки.

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
