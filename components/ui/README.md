# components/ui/

Низкоуровневые переиспользуемые UI-примитивы. Без бизнес-логики, без чтения стора. Принимают пропсы — рисуют.

## Файлы

### `Card.tsx`
Обёртка-карточка. `bg = surface`, тонкая граница, скруглённые углы.

```tsx
<Card size="lg">  {/* sm | md | lg, default lg */}
  ...
</Card>
```

| Size | Radius | Padding |
|---|---|---|
| `sm` | 14 | 12 |
| `md` | 16 | 14 |
| `lg` | 18 | 16 |

Принимает `style` для override (например, `marginBottom`).

### `EmptyState.tsx`
Унифицированный пустой стейт. Иконка (опц., Feather) с круглым "halo"-фоном, заголовок, подсказка, опциональная стрелка вниз (намёк на FAB).

```tsx
<EmptyState
  title="Нет трат"
  hint="Нажмите + внизу, чтобы добавить первую"
  icon="inbox"
  arrowDown            // стрелка вниз под подсказкой
  iconHalo             // круглый акцентный фон под иконкой (по умолчанию true)
/>
<EmptyState compact />   {/* меньшие отступы — для пустых карточек */}
```

| Пропс | По умолчанию | Что делает |
|---|---|---|
| `title` | `'Нет данных'` | Заголовок |
| `hint` | — | Подсказка (вторая строка) |
| `icon` | — | Имя иконки Feather |
| `iconHalo` | `true` | Круглый фон `accent@8%` 64×64 под иконкой |
| `arrowDown` | `false` | Иконка `arrow-down` под подсказкой (для намёка к FAB) |
| `compact` | `false` | Меньшие отступы и серый текст — для случаев внутри карточек |

### `PeriodSwitcher.tsx`
Универсальный переключатель пилюлями. Дженерик по типу `id`.

```tsx
const PERIODS = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
] as const satisfies PeriodOption[];

<PeriodSwitcher options={PERIODS} value={period} onChange={setPeriod} />
```

Используется на Главной (День/Неделя/Месяц) и в Аналитике (Нед./Месяц/Кв.).

### `ExpenseRow.tsx`
Строка траты — иконка-квадрат, название + дата, сумма красным.

```tsx
<ExpenseRow expense={e} categories={cats} />          {/* full */}
<ExpenseRow expense={e} categories={cats} compact />  {/* для Главной/Истории */}
```

Если `expense.cat` не найден в `categories`, использует `FALLBACK_CATEGORY` из `constants/categories`.

### `BottomSheet.tsx`
Базовый bottom sheet. Анимация slideUp 320ms на cubic-bezier(0.16, 1, 0.3, 1), overlay fadeIn 200ms.

```tsx
<BottomSheet open={show} onClose={() => setShow(false)} title="Заголовок">
  ...
</BottomSheet>
```

**Важно:** не использует `Modal`. Рендерится как `position: 'absolute'` поверх ближайшего родителя — поэтому шит должен размещаться в компоненте-родителе full-screen-области (например, `app/(tabs)/_layout.tsx`), чтобы перекрыть весь экран и таб-бар.

Управление монтированием: при `open=false` шит остаётся в дереве на время exit-анимации (220ms), затем размонтируется. Поэтому состояние закрытия не теряется до завершения анимации.

`zIndex` (по умолчанию 400) можно повышать для вложенных шитов (например, `CategoryPickerSheet` поверх `AddExpenseSheet` → 500).

**Drag-to-close.** На drag-handle области (полоска сверху + расширенная hit-area 14+12px вокруг) висит `Gesture.Pan()` с `activeOffsetY([10, 99999])` — активируется только при движении вниз. На update — `translateY` шита следует за пальцем, overlay плавно становится прозрачнее (`1 - dy/250`). На end — если `translationY > 120` или `velocityY > 800` → `onClose()`, иначе spring back to 0.

### `LoadingScreen.tsx`
Заглушка-экран загрузки, рендерится в `app/_layout.tsx` пока `fontsLoaded === false` или `dataLoaded === false`. Внутри `PhoneFrame` — выровнен по центру: название "MoneySpender" (Inter Light 28px), приглушённая подсказка ("Подключение к облаку…" по умолчанию), `ActivityIndicator` с цветом accent.

```tsx
<LoadingScreen hint="Загрузка категорий…" />
```

### `BarChart.tsx`
Горизонтальный барчарт. Каждая строка: иконка | (label + amount) / прогресс-бар. Бары анимируются от 0 до целевой ширины с лагом `index * 55ms`, длительностью 650ms, easing `cubic-bezier(0.16, 1, 0.3, 1)`. Заливка — градиент от `color@44%` до `color`.

```tsx
<BarChart
  stats={catStats(filtered)}
  categories={cats}
  maxAmount={topStat.total}
  showPct          // показывать процент рядом с суммой (Аналитика)
  total={total}    // нужно для расчёта процентов
  resetKey={period}  // при смене этого ключа все бары переанимируются с нуля
/>
```

### `DonutChart.tsx`
SVG donut-чарт через `react-native-svg`. Берёт топ-6 слайсов. Внутри — текст "всего" и сумма в формате `Xк`. Справа — легенда с цветным dot, лейблом и процентом.

```tsx
<DonutChart
  stats={catStats(filtered)}
  categories={cats}
  resetKey={period}  // при смене ключа сегменты переанимируются с нуля
/>
```

Размер фиксирован — 128×128px. Толщина обводки 18px. Каждый сектор анимируется через Reanimated `useAnimatedProps`: длина дуги растёт от 0 до целевой со staggered задержкой `index * 55ms`, длительностью 650ms, easing `cubic-bezier(0.16, 1, 0.3, 1)` (идентично BarChart).

### `SwipeableRow.tsx`

Обёртка над любым children, добавляющая swipe-влево с двумя порогами:
- **Частичный** (свайп до ~84px) — фиксируется в открытом виде, видна красная зона с иконкой `trash-2` и подписью "Удалить". Тап на эту зону → удаление.
- **Полный** (>55% ширины строки) — сразу анимация ухода влево + схлопывание высоты строки 200ms, затем `onDelete()`.

```tsx
<SwipeableRow onDelete={() => removeExpense(e.id)}>
  <ExpenseRow expense={e} categories={cats} compact />
</SwipeableRow>
```

Использует `Gesture.Pan()` из react-native-gesture-handler с `activeOffsetX([-12, 12])` и `failOffsetY([-12, 12])` — Pan активируется только при горизонтальном движении, не блокирует вертикальный скролл ScrollView.

При полном свайпе строка плавно схлопывается через `scaleY` + `opacity`, дальше React убирает её из списка.

### `UndoToast.tsx`

Toast "Удалено · Отменить" в нижней части экрана. Подписан на `pendingDelete` в Zustand-сторе. Появляется при ненулевом значении, автоматически скрывается через 3.5 секунды.

При истечении таймера → `commitDelete(id)` (отправляет DELETE в Supabase) + `setPendingDelete(null)`. При тапе "Отменить" → `restoreExpense(e)` + сброс (DELETE НЕ отправляется — deferred-подход).

Размещается в `app/(tabs)/_layout.tsx` как сиблинг `<Tabs>` — viewport общий для всех табов. Под `AddExpenseSheet` (`zIndex 200` против `400`) — открытый шит добавления визуально перекрывает Toast.

### `ErrorToast.tsx`

Toast ошибки синхронизации с Supabase (top-of-screen). Подписан на `syncError` в сторе. Авто-скрытие 4.5 секунды или тап ✕. Появляется при ошибках push'а трат/категорий, когда оптимистическое обновление в локальном сторе уже произошло, но БД не приняла изменение.

### `DrumPicker.tsx`

Барабанный пикер даты и времени — 5 вертикальных колонок (`день / месяц / год | час / мин`). Каждая колонка — `ScrollView` с `snapToInterval = 42px`, видимая область `4 × 42 = 168px`, центральный элемент = выбранный.

```tsx
<DrumPicker value={date} onChange={setDate} />
```

Дополнительно экспортируется `DrumColumn` — отдельная колонка для случаев, где нужен пикер с другим набором значений.

Поверх каждой колонки — синий highlight-bar центральной строки (`accent@12%`, не получает события касания) и два градиентных fade-слоя (сверху и снизу) от цвета фона шита `surfaceHigh` к прозрачному, чтобы крайние элементы плавно растворялись.

При тапе на пункт — программный `scrollTo` с анимацией. При свайпе — `onMomentumScrollEnd` синхронизирует значение с центральной позицией.

Активный пункт: `Inter Medium`, `text`. Остальные: `Inter Light`, `textMuted`.

### `PhoneFrame.tsx`
iPhone-фрейм 390×844 для web. На native — passthrough. Подключается на root-уровне.

## Принципы

- Никакой работы с Zustand. Стор читают вышестоящие компоненты и передают данные пропсами.
- Никаких сетевых запросов и побочных эффектов (кроме анимаций и onLayout).
- Если компонент стал зависеть от стора — переносится в `components/sheets/` или конкретный экран.
