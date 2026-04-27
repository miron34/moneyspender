# MoneySpender

Личное приложение учёта трат. Тёмная тема, русский интерфейс. Один пользователь ("Мирон") без auth в MVP.

## Где запущено

| Окружение | URL / Где |
|---|---|
| Production (web) | https://moneyspender.vercel.app |
| Source repo | https://github.com/miron34/moneyspender |
| Supabase project | `xxqmdykznupmslwspjqd` (Frankfurt, FREE / NANO) |
| Expo Go (iPhone) | dev-сервер `npx expo start --lan` (когда нужен) |

## Стек

- **React Native + Expo SDK 54** — кросс-платформенный фреймворк
- **Expo Router v6** — file-based навигация
- **TypeScript** strict
- **Zustand** — глобальное состояние
- **Supabase** — Postgres БД (без auth в MVP, RLS отключён)
- **react-native-reanimated v4** — анимации (bottom sheets, прогресс-бары, gestures)
- **react-native-gesture-handler** — жесты (swipe-to-delete, drag-to-close шита)
- **react-native-svg** — donut chart
- **expo-haptics** — вибро-фидбек на native
- **@expo-google-fonts/inter** — шрифт Inter
- **date-fns** — даты
- **@expo/vector-icons** (Feather) — иконки

## Запуск локально

```bash
npm install
npm run web      # http://localhost:8081, iPhone-фрейм 390×844
npx expo start   # с QR для Expo Go на iPhone (LAN)
```

Перед первым запуском — создать `.env` (см. `.env.example`) и заполнить:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Без `.env` приложение работает на mock-данных (in-memory).

## Структура

```
moneyspender/
├── app/              # Expo Router — 4 экрана (Главная, История, Аналитика, Профиль)
├── components/       # UI-компоненты, bottom sheets, навигация
│   ├── ui/           # Низкоуровневые примитивы (без бизнес-логики)
│   ├── sheets/       # Готовые bottom sheets с бизнес-логикой
│   └── navigation/   # Кастомный TabBar с FAB
├── constants/        # Дизайн-токены, дефолтные категории
├── store/            # Zustand-стор + mock-фикстура
├── lib/              # Supabase client, sync layer, haptics
├── supabase/         # SQL-миграции
├── utils/            # Форматтеры, агрегации, утилиты дат
├── types/            # TypeScript-типы домена
├── hooks/            # Кастомные React-хуки (пусто пока)
├── assets/           # Шрифты, иконки приложения
├── handoff/          # Дизайн-архив от дизайнера (не трогать)
└── docs/             # Сквозная документация проекта
```

## Документация

**Точка входа для новой сессии Claude / нового разработчика:**
- [CONTEXT.md](CONTEXT.md) — оглавление: что прочитать в каком порядке

**Сквозные документы:**
- [docs/architecture.md](docs/architecture.md) — архитектура и поток данных
- [docs/design-system.md](docs/design-system.md) — дизайн-токены, типографика, паттерны
- [docs/data-model.md](docs/data-model.md) — модели данных, схема БД, маппинг типов
- [docs/decisions.md](docs/decisions.md) — журнал архитектурных решений с обоснованиями
- [docs/deployment.md](docs/deployment.md) — Vercel, Supabase, env vars, как обновлять
- [docs/roadmap.md](docs/roadmap.md) — что сделано / что в планах

В каждой значимой папке проекта есть свой `README.md`.

## Дизайн-источник

`handoff/MoneySpender v4.html` — высокоточный HTML-прототип. Это **источник истины по UI** — пиксельные размеры, цвета, анимации. Не редактировать.

`handoff/README.md` — спецификация дизайнера.
