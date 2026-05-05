# components/navigation/

Кастомные навигационные компоненты, привязанные к Expo Router.

## Файлы

### `TabBar.tsx`

Кастомный bottom nav bar — **pill-shaped floating island** с frosted-glass фоном через `expo-blur`. Принимает `BottomTabBarProps` из react-navigation + `onAddPress` для центрального «+» FAB.

**Структура:**
```
[ home  clock   ➕   bar-chart  user ]    ← floating pill, 16px от краёв,
                                            12px + safeArea от низа экрана
```

4 иконки + центральный FAB-плюс. **Без лейблов** — современный iOS-паттерн (Instagram/Threads). Активный таб подсвечивается accent-цветом + pill-фон `accent @ 14%` под иконкой (Apple Music style).

**Иконки:** 24px (было 22), `Feather` (`home`, `clock`, `bar-chart-2`, `user`, `plus`).

**Background:** `BlurView` (intensity 60, tint dark) + `Colors.surface @ 40%` тинт сверху для контраста (на web — heavier 70% потому что backdrop-filter выходит прозрачнее). Обводка `#ffffff @ 8%`, тень `0 12px 28px rgba(0,0,0,0.55)` — эффект floating-острова.

**Геометрия:**
- `position: absolute`, screen-content скроллится под баром (никакого bottom padding не нужно у экранов).
- `marginHorizontal: 16`, `marginBottom: safeAreaBottom + 12`.
- `borderRadius: 36` — pill-форма.

### `VoiceFab.tsx`

Самостоятельный hero-FAB для голосового ввода трат. Живёт отдельно от TabBar, в bottom-right thumb zone.

```tsx
<VoiceFab
  onPressIn={() => ...}
  onPressOut={() => ...}
  recording={voiceState === 'recording'}
  processing={voiceState === 'processing'}
  visible={!sheetsOpen}             // скрыть когда открыты AddExpense/VoiceConfirm
/>
```

**Размер:** 44×44 — меньше plus-FAB (52) чтобы читалось как secondary hero, но достаточно крупный для удобного попадания пальцем. Только ~12px нижнего края наезжает на TabBar — FAB «перчится» на правом углу бара, не накрывая иконку профиля под ним.

**Состояния:**

| State | Внешний вид |
|---|---|
| idle | Градиентная кнопка (accent → accentLight) с иконкой `mic` |
| recording | Сплошной accent + два **concentric ripples** расходятся наружу (border 2px, scale 1→2x, opacity 0.6→0, второй staggered на 750ms) |
| processing | Сплошной accent + иконка `loader` вращается 360° линейно (1.1s) + сам FAB мягко пульсирует scale 1↔1.06 (800ms) |

Push-to-talk через `onPressIn` / `onPressOut`. Race-fix (быстрый тап → cancel) живёт **на стороне родителя** в `_layout.tsx`, не здесь — VoiceFab чисто отображает state, не управляет им.

## Контракт пропсов TabBar

```tsx
<TabBar
  {...routerProps}
  onAddPress={() => setAddOpen(true)}   // тап на "+" — открыть AddExpenseSheet
/>
```

TabBar НЕ знает про голос. Это сознательно — голосовая state-машина живёт в `app/(tabs)/_layout.tsx`, mic — отдельный компонент `VoiceFab`, TabBar занимается только навигацией.

## Маппинг роутов

```
TAB_ORDER:    index → history → [FAB plus] → analytics → profile
TAB_META:     icon для каждого route name (без label — лейблы убраны)
```

При переименовании роутов в `app/(tabs)/` обновлять `TAB_META` и `TAB_ORDER`.

## Подключение

```tsx
// app/(tabs)/_layout.tsx
<Tabs tabBar={(props) => <TabBar {...props} onAddPress={() => setAddOpen(true)} />}>
  <Tabs.Screen name="index" />
  ...
</Tabs>

{/* VoiceFab подключается отдельно, не как часть Tabs */}
<View style={{ position: 'absolute', bottom: ..., right: ... }}>
  <VoiceFab onPressIn={...} onPressOut={...} recording={...} processing={...} visible={...} />
</View>
```

См. `docs/voice-input.md` для всей sequence-диаграммы голоса.

## Зависимости

- `expo-blur ~15.0.8` — frosted-glass фон у TabBar. Config-plugin не требуется (нативный модуль ставится автоматически через `npx expo install`).
- `react-native-reanimated v4` — анимации в VoiceFab (ripples, processing rotation/pulse).
- `expo-linear-gradient` — градиентная заливка FAB-кнопок.
