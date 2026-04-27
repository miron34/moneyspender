# components/

UI-компоненты. Делятся на три подпапки по назначению.

## Структура

```
components/
├── ui/              # Низкоуровневые примитивы (BottomSheet, BarChart, ExpenseRow, PhoneFrame...)
├── sheets/          # Готовые bottom sheets (AddExpenseSheet, CategoryPickerSheet, DatePickerSheet...)
└── navigation/      # Кастомный TabBar с FAB
```

## Принципы

- **`ui/`** — переиспользуемые компоненты без бизнес-логики. Принимают пропсы, рисуют. Не читают стор.
- **`sheets/`** — конкретные bottom sheets с бизнес-логикой. Читают стор, диспатчат экшены, используют примитивы из `ui/`.
- **`navigation/`** — компоненты, привязанные к Expo Router (TabBar). Читают `usePathname` и т.п.

## Текущее состояние (шаг 2)

Создан только `ui/PhoneFrame.tsx` — iPhone-фрейм для web. Остальные компоненты будут добавлены на следующих шагах (UI-примитивы → шиты → навигация).
