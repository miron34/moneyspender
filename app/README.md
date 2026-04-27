# app/

File-based routes Expo Router v6.

## Структура

```
app/
├── _layout.tsx              # Root layout: шрифт Inter, GestureHandler, SafeArea, PhoneFrame
└── (tabs)/
    ├── _layout.tsx          # Tabs layout (нативный таб-бар скрыт; рендерим свой через components/navigation/TabBar.tsx)
    ├── index.tsx            # Главная
    ├── history.tsx          # История
    ├── analytics.tsx        # Аналитика
    └── profile.tsx          # Профиль
```

## Контракты

- `app/_layout.tsx` ждёт загрузки шрифтов через `useFonts` из `@expo-google-fonts/inter` перед первым рендером. До этого — splash. Шрифты, доступные после загрузки, см. `constants/typography.ts → FontFamily`.
- На web в `_layout.tsx` подключён `<PhoneFrame>` — оборачивает приложение в декоративный iPhone-корпус 390×844. На native он passthrough.
- В `(tabs)/_layout.tsx` нативный таб-бар скрыт (`tabBarStyle: { display: 'none' }`). Кастомный таб-бар с FAB рендерится отдельно поверх содержимого экранов (см. `components/navigation/TabBar.tsx`, будет добавлен на следующих шагах).

## Где править

- Добавить новый экран — новый файл в `(tabs)/<name>.tsx` + регистрация в `(tabs)/_layout.tsx`.
- Изменить навигационное поведение (модалки, deep-links) — в root `_layout.tsx`.
- Поменять загрузку шрифтов — в root `_layout.tsx`.

## Текущее состояние (шаг 2)

Все 4 экрана — заглушки. Главная читает данные из стора, чтобы убедиться в работе цепочки `mock → store → screen`. Остальные показывают только заголовок.
