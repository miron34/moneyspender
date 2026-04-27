# Архитектура

## Общий поток данных

```
┌─────────────────────────────────────────────────────────┐
│                    Expo Router (app/)                   │
│              file-based screens & layouts               │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Zustand store (store/)                 │
│        expenses[], categories[], UI state               │
│  ┌─────────────────────────┐                            │
│  │ optimistic update       │                            │
│  └─────────────┬───────────┘                            │
└────────────────┼────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase (lib/supabase)               │
│       fetch on app start, sync on mutations             │
└─────────────────────────────────────────────────────────┘
```

Стейт живёт в Zustand. Все экраны читают данные оттуда. При мутациях стор обновляется немедленно (optimistic), затем sync-ится с Supabase в фоне. Если sync падает — откат локального изменения и показ ошибки.

В MVP данные на старте — моковые (см. `store/mockData.ts`), Supabase подключается на финальном этапе.

## Навигация

Expo Router v6, file-based. Все основные экраны — таб-бар:

```
app/
├── _layout.tsx              # Root layout (fonts, providers, gesture handler)
├── (tabs)/
│   ├── _layout.tsx          # Tabs layout — кастомный TabBar с FAB
│   ├── index.tsx            # Главная
│   ├── history.tsx          # История
│   ├── analytics.tsx        # Аналитика
│   └── profile.tsx          # Профиль
└── +not-found.tsx
```

FAB — не таб (не имеет своего экрана). Он встроен в кастомный TabBar и открывает bottom sheet добавления траты, который рендерится поверх текущего экрана.

## Bottom sheets

Базовый компонент — `components/ui/BottomSheet.tsx`. Все шиты строятся поверх него.

**Иерархия шитов:**

- `AddExpenseSheet` (открывается из FAB)
  - `CategoryPickerSheet` (вложенный, выбор категории)
  - `DatePickerSheet` (вложенный, drum-пикер)
- `CategoryFilterSheet` (на History)
- `SortFilterSheet` (на History)
- `CategoryEditSheet` (на Profile)
- `CategoryAddSheet` (на Profile)

Все шиты — controlled-компоненты: получают `open` и `onClose`. Состояние открытия — в родительском компоненте, не в сторе.

## iPhone-фрейм для веба

Wrapper `components/ui/PhoneFrame.tsx` рендерит iPhone-корпус 390×844 только в `Platform.OS === 'web'`. На native пропускает children без обёртки. Подключается на root-уровне в `app/_layout.tsx`.

## Анимации

Все анимации — на Reanimated v4 (worklets). Ключевые:

- **Bottom sheet open/close** — `useSharedValue` для translateY и opacity, springAnimation
- **Bar chart bars** — width растёт от 0 до X% с задержкой `i * 55ms`
- **Swipe-to-delete** — `Gesture.Pan()` + `useAnimatedStyle`, схлопывание высоты на удалении
- **Period switcher pill** — фон/цвет через `withTiming` 180ms

## Storage

Используется Supabase без auth — anon-ключ с публичным доступом, RLS отключён (см. `supabase/migrations/0001_init.sql`). Конфигурируется через `.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Если переменные пустые / `isSupabaseConfigured === false` — приложение работает на in-memory моках (`buildMockExpenses` + `DEFAULT_CATEGORIES`). Это упрощает разработку без сети.

### Инициализация

При старте `RootLayout` вызывает `useStore.loadInitial()`:

1. Если Supabase не настроен → положить mock в стор, `loaded = true`
2. Иначе — `fetchAll()` из БД
3. Если в БД 0 категорий → `seedDatabase(DEFAULT_CATEGORIES, buildMockExpenses())` → положить эти же данные в стор
4. Иначе — положить полученные данные в стор
5. На любой ошибке — fallback на моки + `syncError = "Не удалось подключиться к облаку"`

UI не рендерится до `loaded === true` — splash-экран Expo остаётся видимым.

### Sync-стратегия

**Optimistic-first:** все мутации стора применяются мгновенно, push в Supabase идёт в фоне. На ошибке — пишем в `syncError`, показывается `ErrorToast`. Без rollback (см. `docs/decisions.md`).

**Eager** для всех мутаций кроме swipe-delete:
- `addExpense` → INSERT
- `addCategory` / `updateCategory` / `deleteCategory` → INSERT/UPDATE/DELETE

**Deferred** для swipe-delete:
- `deleteExpense(id)` — только локально, возвращает удалённый объект
- Стор устанавливает `pendingDelete` → `UndoToast` показывается с таймером 3.5с
- Если истёк → `commitDelete(id)` → DELETE в БД
- Если undo → `restoreExpense(e)` → DELETE НЕ отправляется

В post-MVP: auth + RLS, offline-кэш через AsyncStorage, retry-очередь для упавших запросов.

## Платформенные особенности

- **iPhone-фрейм** — только web
- **Haptics** — `expo-haptics` на native при тапах FAB и долгих жестах; на web — no-op
- **Шрифты** — `@expo-google-fonts/inter` загружается через `expo-font` в root layout до рендера
- **Safe area** — `react-native-safe-area-context` обёртка на root, отключена внутри iPhone-фрейма (там свой статус-бар)
