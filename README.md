# MoneySpender

Личное приложение учёта трат. Тёмная тема, русский интерфейс. Цель MVP — быстрый ввод трат, обзор по категориям, базовая аналитика.

## Стек

- **React Native + Expo SDK 54** — кросс-платформенный фреймворк
- **Expo Router v6** — file-based навигация (web/iOS/Android)
- **TypeScript** — строгая типизация
- **Zustand** — глобальное состояние
- **Supabase** — БД (без auth в MVP)
- **react-native-reanimated v4** — анимации (bottom sheets, прогресс-бары)
- **react-native-gesture-handler** — жесты, swipe-to-delete
- **react-native-svg** — donut chart
- **@expo-google-fonts/inter** — шрифт Inter
- **date-fns** — работа с датами
- **@expo/vector-icons** (Feather) — иконки навигации

## Запуск

```bash
npm install
npm run web      # браузер (iPhone-фрейм 390×844)
npm run ios      # iOS симулятор
npm run android  # Android эмулятор
```

## Структура проекта

```
moneyspender/
├── app/              # Expo Router — экраны и роуты
├── components/       # UI-компоненты, bottom sheets, навигация
├── constants/        # Дизайн-токены, категории по умолчанию
├── store/            # Zustand-стор
├── lib/              # Supabase-клиент и т.п.
├── utils/            # Форматтеры, агрегации, утилиты дат
├── types/            # TypeScript-типы
├── hooks/            # React-хуки
├── assets/           # Шрифты, изображения
├── handoff/          # Дизайн-архив (не трогать)
└── docs/             # Сквозная документация проекта
```

## Документация

- [docs/architecture.md](docs/architecture.md) — архитектура и поток данных
- [docs/design-system.md](docs/design-system.md) — дизайн-токены, типографика
- [docs/data-model.md](docs/data-model.md) — модели данных и схема БД
- [docs/decisions.md](docs/decisions.md) — журнал архитектурных решений

В каждой значимой папке проекта есть свой `README.md` с описанием содержимого.

## Дизайн-источник

`handoff/MoneySpender v4.html` — высокоточный HTML-прототип, основной источник истины по UI.
`handoff/README.md` — спецификация дизайнера: токены, экраны, поведение.
