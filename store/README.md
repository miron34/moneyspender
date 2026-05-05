# store/

Глобальный стейт приложения на Zustand.

## Файлы

- **`useStore.ts`** — основной стор. Поля: `expenses`, `categories`, `userName`. Экшены для CRUD трат и категорий.
- **`mockData.ts`** — фикстура из 31 траты для разработки UI без БД. Используется как initial state в `useStore`.

## Использование

```ts
import { useStore } from '@/store/useStore';

// Селектор (рекомендуется — ререндер только на изменении конкретного поля)
const expenses = useStore((s) => s.expenses);
const addExpense = useStore((s) => s.addExpense);

// Прямой доступ (без подписки) — для использования внутри функций / эффектов
const expenses = useStore.getState().expenses;
```

## Контракты экшенов

- **`addExpense({ cat, name, amount, date }) → Expense`** — создаёт запись с `id = Date.now()`, кладёт в начало списка. Возвращает созданный объект.
- **`deleteExpense(id) → Expense | undefined`** — удаляет, возвращает удалённый объект (для swipe-undo).
- **`restoreExpense(e)`** — возвращает обратно (для undo). Проверяет, что такой id ещё не существует.
- **`setPendingDelete(e | null)`** — устанавливает последнюю удалённую трату для показа Undo-тоста. После 3.5с (тоста) или явного undo возвращается в `null`.
- **`addCategory(draft) → Category`** — создаёт категорию с `id = 'cat_' + timestamp`.
- **`updateCategory(id, draft)`** — мерж draft в существующую категорию.
- **`deleteCategory(id)`** — удаляет. Существующие траты с этим cat будут показывать `FALLBACK_CATEGORY` через `findCategory`.
- **`setVoicePending(p | null)`** — кладёт `ParsedExpense` для передачи между `VoiceConfirmSheet` и `AddExpenseSheet`. Используется ровно когда пользователь нажал «Изменить» в confirm-шите: confirm устанавливает значение, AddExpenseSheet читает на open и сбрасывает в `null`. Не предназначен для других целей — это узкоспециализированный handoff slot, не общая «черновик-форма».

## Поток swipe-to-delete

```
SwipeableRow.onDelete (после анимации)
    │
    ▼
deleteExpense(id) → removed
    │
    ▼
setPendingDelete(removed)
    │
    ▼
UndoToast рендерится, ставит таймер 3.5с
    │
    ├── Тап "Отменить" → restoreExpense(removed) + setPendingDelete(null)
    └── Таймер истёк → setPendingDelete(null), удаление становится постоянным
```

## Хелперы

- **`findCategory(categories, id)`** — экспортируется из `useStore.ts`. Возвращает `Category | undefined`. На уровне UI использовать с фолбэком: `findCategory(cats, id) ?? FALLBACK_CATEGORY`.

## Будущее (вне MVP-каркаса)

- Persist middleware для офлайн-кэша
- Sync layer с Supabase (см. `docs/architecture.md`)
- Селекторы агрегаций (catStats, byPeriod) — сейчас живут в `utils/`, могут переехать сюда как мемоизированные.
