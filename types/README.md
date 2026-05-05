# types/

Глобальные TypeScript-типы домена.

## Файлы

- **`index.ts`** — `Expense`, `Category`, `Period`, `CategoryStat`, `DayGroup`. Реэкспортирует типы из `voice.ts`.
- **`voice.ts`** — `ExpenseCat` (slug-таксономия из 10 категорий) и `ParsedExpense` (`{amount, name, cat}`) — структура ответа `parse-expense` Edge Function. Зеркалится в `supabase/functions/_shared/types.ts`.

## Контракты

- **`Expense`** — `{ id, cat, name, amount, date }`. `amount` всегда положительный, знак минус добавляется только при отображении.
- **`Category`** — `{ id, label, color, icon }`. У дефолтных id — слаги (`food`, `cafe`...), у пользовательских — `cat_<timestamp>`.
- **`Period`** — `'day' | 'week' | 'month' | 'quarter'`. Используется в `byPeriod` и переключателях.
- **`CategoryStat`** — `{ id, total }`, выход `catStats`.
- **`DayGroup`** — `{ label, items, total }`, выход `groupByDay`.

## Правила

- Импортировать через `import type { Expense } from '@/types'`.
- Не дублировать формы в других местах. Если расширяется — расширять здесь.
- Расхождение между этими типами и схемой Supabase отслеживать в `docs/data-model.md`.
