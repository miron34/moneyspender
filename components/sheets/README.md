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
- **Иконка микрофона (push-to-talk)** — зажал → пишем, отпустил → STT + NLP → confirm-карточка. Подробности — `docs/voice-input.md` и `lib/voice/README.md`. State-машина внутри компонента: `voiceState: 'idle' | 'recording' | 'processing' | 'confirm'`.
- Пилюля категории (фон `category.color@13%`, обводка `@27%`) → открывает `CategoryPickerSheet`
- Пилюля даты/времени (нейтральный `surfaceTop`) → открывает `DatePickerSheet`
- Поле комментария
- Кнопка "Добавить" — disabled (`surfaceTop`/`textMuted`) при сумме ≤ 0, иначе синяя

При сохранении: если комментарий пустой — `name` подставляется = `category.label`. Сама запись пишется в стор через `addExpense`.

**Голос вынесен из AddExpenseSheet** в TabBar (отдельный mic-FAB рядом с «+») и собственный `VoiceConfirmSheet`. AddExpenseSheet — обычная форма без голосовой логики, но при открытии читает `voicePending` из Zustand-стора и предзаполняет поля, если оно установлено (это происходит когда пользователь нажал «Изменить» в `VoiceConfirmSheet`).

**Portal target шитов внутри PhoneFrame.** Все шиты на web портятся через `createPortal` в специальный target внутри `PhoneFrame` (через `usePhoneFramePortal()` из `components/ui/PhoneFramePortal.tsx`). Это решает две задачи одновременно: пробивает stacking context (чтобы шит был выше TabBar) и оставляет шит внутри iPhone-фрейма (а не на весь монитор). На native — без изменений, in-tree рендер. Если PhoneFrame не активен (узкий web/мобильный браузер) — fallback на `document.body`.

### `VoiceConfirmSheet.tsx`

Шит подтверждения после успешного голосового распознавания. Открывается из `app/(tabs)/_layout.tsx` когда `VoiceCaptureSession.finish()` вернул непустой `ParsedExpense`.

```tsx
<VoiceConfirmSheet
  open={confirmOpen}
  onClose={handleConfirmClose}
  pending={pending}            // ParsedExpense | null
  categories={categories}
  onSave={handleConfirmSave}   // addExpense + close
  onEdit={handleConfirmEdit}   // setVoicePending(pending) + open AddExpenseSheet
/>
```

Внутри: заголовок «Добавить трату?», крупная сумма, chip категории + name, дата строкой («Вчера», «5 апреля» — только если ≠ today), две кнопки «Изменить» / «Сохранить».

- **«Сохранить»** — сразу вызывает `addExpense` со значениями из `pending` (с маппингом slug → catId с fallback на первую категорию + дата = `today`, если `pending.date` null), закрывает шит.
- **«Изменить»** — кладёт `pending` в `useStore.voicePending`, закрывает confirm, открывает `AddExpenseSheet` через 60ms (чтобы анимации не дёргались). AddExpenseSheet при открытии читает `voicePending` и предзаполняет форму, после чего сбрасывает поле в сторе.

Сам шит ничего не знает про state-машину голоса — он только рендерит карточку и зовёт колбэки. Вся state-машина (idle/recording/processing) живёт в `_layout.tsx`.

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

### `DateRangeSheet.tsx`

Выбор диапазона дат (от / до) для фильтрации Истории. Два compact drum-пикера (день/месяц/год) друг под другом плюс кнопки «Сбросить» / «Готово».

```tsx
<DateRangeSheet
  open={rangeOpen}
  onClose={() => setRangeOpen(false)}
  from={dateFrom}              // Date | null
  to={dateTo}                  // Date | null
  onChange={(f, t) => { setFrom(f); setTo(t); }}
/>
```

`onChange` вызывается на каждое изменение любой колонки — родитель держит обе границы. При выборе времени:
- Граница "от" нормализуется к началу дня (`00:00:00.000`)
- Граница "до" нормализуется к концу дня (`23:59:59.999`)

Это даёт пользователю понятный UX: выбрал «1 апр – 28 апр» — попадают все траты за эти дни включительно.

Кнопка «Сбросить» очищает обе границы (`onChange(null, null)`) и закрывает шит.

Использует `DrumColumn` (нижний уровень) из `components/ui/DrumPicker.tsx` — переиспользует тот же визуал, но без колонок часов/минут.

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
