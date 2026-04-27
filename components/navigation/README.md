# components/navigation/

Кастомные навигационные компоненты, привязанные к Expo Router.

## Файлы

### `TabBar.tsx`

Кастомный bottom nav bar. Принимает `BottomTabBarProps` из react-navigation (даются автоматически Expo Router) + дополнительный `onAddPress`.

**Структура:**
```
[Главная]  [История]  [FAB]  [Анализ]  [Профиль]
```

5 слотов по `flex: 1`. FAB — отдельный слот, не таб (не имеет route). Поднят на `translateY: -10` и подсвечен синим glow-shadow.

**Активный таб:** `Colors.accent`, текст `FontFamily.medium`. Неактивные: `Colors.textMuted`, `FontFamily.regular`.

**Иконки:** `@expo/vector-icons` → `Feather` (`home`, `clock`, `bar-chart-2`, `user`, `plus`).

**Поведение FAB:** вызывает `onAddPress` из пропсов. Сейчас — заглушка `Alert.alert`. Будет заменена на открытие `AddExpenseSheet` на шаге шитов.

## Контракт с Expo Router

Подключается в `app/(tabs)/_layout.tsx` через рендер-функцию:

```tsx
<Tabs tabBar={(props) => <TabBar {...props} onAddPress={...} />}>
```

Состояние `showAdd` поднимается на уровень tabs-layout, чтобы при открытии шита он рендерился поверх всех табов.

## Маппинг роутов

```
TAB_ORDER:    index → history → [FAB] → analytics → profile
TAB_META:     icon + label для каждого route name
```

При переименовании роутов в `app/(tabs)/` обновлять `TAB_META` и `TAB_ORDER`.
