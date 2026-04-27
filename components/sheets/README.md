# components/sheets/

Готовые bottom sheets с конкретной бизнес-логикой. Все строятся поверх базового `BottomSheet` из `components/ui/`.

## Файлы

### `CategoryPickerSheet.tsx`

Выбор категории из сетки 4 колонки. Используется в:
- **History** — фильтр по категории (с кнопкой "Сбросить")
- **AddExpenseSheet** — выбор категории для новой траты
- **Profile** — потенциально для просмотра записей по категории

```tsx
<CategoryPickerSheet
  open={open}
  onClose={onClose}
  categories={categories}
  selected={filterCat}            // string | null
  onSelect={(id) => {...}}
  title="Фильтр по категории"
  onClear={() => setFilterCat(null)}    // если задан — показывается кнопка "Сбросить"
/>
```

При `selected !== null` соответствующая ячейка подсвечивается фоном `category.color@13%` и обводкой `@33%`. При `null` — все ячейки нейтральные.

### `AddExpenseSheet.tsx`

Главный шит добавления траты. Открывается из FAB на TabBar. Размещается в `app/(tabs)/_layout.tsx` рядом с `<Tabs>` чтобы покрывать весь экран включая таб-бар.

```tsx
<AddExpenseSheet open={open} onClose={onClose} />
```

Внутри:
- Поле суммы (32px Inter Light, autofocus через 350ms после открытия). Принимает decimal — точку и запятую как разделитель.
- Декоративная иконка микрофона (Feather `mic`, opacity 0.6, без onPress)
- Пилюля категории (фон `category.color@13%`, обводка `@27%`) → открывает `CategoryPickerSheet`
- Пилюля даты/времени (нейтральный `surfaceTop`) → открывает `DatePickerSheet`
- Поле комментария
- Кнопка "Добавить" — disabled (`surfaceTop`/`textMuted`) при сумме ≤ 0, иначе синяя

При сохранении: если комментарий пустой — `name` подставляется = `category.label`. Сама запись пишется в стор через `addExpense`.

Внутренние шиты `CategoryPickerSheet` и `DatePickerSheet` рендерятся как **сиблинги** AddExpenseSheet (а не вложенные внутри него), потому что вложенный sheet получил бы `position: 'absolute'` относительно родительского sheet и не покрывал бы весь экран. Им передаётся `zIndex={500}` чтобы лежать поверх AddExpenseSheet (`zIndex 400` по умолчанию).

### `DatePickerSheet.tsx`

Тонкая обёртка над `DrumPicker` (5-колоночный barrel-picker) с кнопкой "Готово" внизу. Используется внутри AddExpenseSheet как nested-шит.

```tsx
<DatePickerSheet
  open={dateOpen}
  onClose={() => setDateOpen(false)}
  value={date}
  onChange={setDate}
  zIndex={500}
/>
```

`onChange` вызывается на каждом изменении любой колонки — компонент-родитель держит актуальную дату. Кнопка "Готово" просто закрывает шит.

### `SortPickerSheet.tsx`

Универсальный выбор из списка. Дженерик по типу `id`. Каждый пункт — иконка/эмодзи слева, лейбл, ✓ галочка справа у активного.

```tsx
const SORT_OPTIONS: SortPickerOption<'date' | 'amount'>[] = [
  { id: 'date', label: 'По дате', emoji: '📅' },
  { id: 'amount', label: 'По сумме', emoji: '💰' },
];

<SortPickerSheet
  open={open}
  onClose={onClose}
  options={SORT_OPTIONS}
  value={sortMode}
  onChange={setSortMode}
/>
```

При тапе на пункт сразу вызывается `onChange(id)` и `onClose()` — закрывается без отдельной кнопки "Готово".

## Принципы

- Шиты живут в дереве компонентов рядом со state, который ими управляет (обычно — экран). Это значит шит покрывает только текущий screen, не TabBar. Для шитов, которым нужно покрывать TabBar (например, AddExpenseSheet с FAB), они поднимаются в `app/(tabs)/_layout.tsx`.
- Прокидывают `zIndex` дальше в `BottomSheet` для управления слоёностью при вложенности.
- Не читают Zustand сами — данные приходят через пропсы. Это упрощает тестирование и переиспользование.
