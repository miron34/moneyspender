# supabase/functions/parse-expense/

Edge Function-прокси к YandexGPT. Принимает короткую русскую фразу о трате
(«в пятёрочке на 800»), возвращает структурированный JSON:
`{ amount, name, cat }`.

## Зачем функция, а не прямой вызов из клиента

YandexGPT API-key — биллинговый секрет. Если положить его в клиентский бандл,
любой посетитель https://moneyspender.vercel.app сможет открыть devtools и
выкачать ключ → начать тратить твою квоту в Yandex Cloud. Поэтому ключ
живёт только в Supabase secrets, а клиент ходит через эту функцию.
См. `docs/decisions.md` — запись «NLP-парсинг через Edge Function-прокси».

## Файлы

| Файл | Назначение |
|---|---|
| `index.ts` | Deno-handler. Чтение body, вызов YandexGPT, форматирование ответа |
| `prompt.ts` | `PARSE_SYSTEM_PROMPT` — системный промпт + 14 few-shot примеров |
| `validate.ts` | Защитная валидация JSON, который возвращает модель |
| `../_shared/cors.ts` | Хелперы для CORS-заголовков и JSON-ответов (общие для всех функций) |
| `../_shared/types.ts` | Общие типы `ExpenseCat` и `ParsedExpense` |

## Контракт

**Запрос:**
```
POST /functions/v1/parse-expense
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY>   ← Supabase подставляет автоматом

{
  "text": "вчера такси 350",
  "today": "2026-05-04",                  ← опционально, YYYY-MM-DD в TZ юзера
  "tz": "Europe/Moscow",                  ← опционально, IANA timezone name
  "categories": [                         ← обязательно, 1..30 элементов
    {
      "id": "food",
      "label": "Еда",
      "description": "продукты, Пятёрочка, Магнит, ..."   ← опционально, ≤200 chars
    },
    { "id": "cat_172939", "label": "Инструменты", "description": "дрель, фрезер" }
  ]
}
```

- `today` / `tz` — без них модель не понимает «вчера», «3 дня назад» и возвращает `date=null` для них
- `categories` — список категорий пользователя; модель возвращает любой id из этого списка или null. Сервер строит из них блок «Категории:» в user-message
- Лимит на сервере: 30 категорий и label ≤ 60 chars / description ≤ 200 chars

**Ответ 200:**
```json
{ "amount": 350, "name": "Такси", "cat": "trans", "date": "2026-05-03" }
```

`cat` — реальный id из переданного `categories[]` или null (если фраза без контекста или директива указала несуществующую категорию и ближайшая не нашлась).

`date` — `YYYY-MM-DD` или null (не упомянуто / будущее / старше 365 дней — сервер режет).

**Ответ 4xx/5xx:** `{ "error": "<code>", ... }`

| HTTP | error code | Когда |
|---|---|---|
| 400 | `text_required` | Пустой text или не строка |
| 400 | `invalid_json` | Не распарсился JSON в body |
| 400 | `categories_required` | Поле categories отсутствует или не массив |
| 400 | `no_categories` | categories пустой или все элементы невалидны (id+label обязательны) |
| 400 | `too_many_categories` | > 30 элементов |
| 405 | `method_not_allowed` | Не POST/OPTIONS |
| 500 | `yandex_not_configured` | Не заданы `YANDEX_API_KEY` / `YANDEX_FOLDER_ID` |
| 502 | `upstream_unreachable` | Сеть до YandexGPT упала |
| 502 | `upstream_status` | YandexGPT вернул не-2xx |
| 502 | `upstream_invalid_json` | YandexGPT вернул не-JSON |

Ответ 200 с **всеми null** (`{amount:null, name:null, cat:null}`) — это
не ошибка. Это значит «модель не смогла распарсить фразу». Клиент в этом
случае просто не заполняет форму.

## Категории (slug'и)

10 фиксированных значений: `food`, `cafe`, `trans`, `shop`, `housing`,
`health`, `sport`, `entert`, `travel`, `other`.

**Важно:** этот список — таксономия модели, а не категории пользователя.
Они численно совпадают с `id` дефолтных категорий из `constants/categories.ts`,
но это совпадение, не зависимость. Подробности — в комментарии в `prompt.ts`
и в `docs/decisions.md`.

## Локальное тестирование

1. **Положить секреты в `.env.local`** (рядом с `supabase/`):
   ```
   YANDEX_API_KEY=AQVNxxx...
   YANDEX_FOLDER_ID=b1gxxx...
   ```
   Этот файл должен быть в `.gitignore` (мы добавили).

2. **Запустить функцию локально:**
   ```bash
   supabase functions serve parse-expense --env-file .env.local --no-verify-jwt
   ```
   `--no-verify-jwt` — для локала, чтобы не требовать anon-key в каждом
   curl-запросе. На проде проверка JWT включена автоматически.

3. **Дёрнуть функцию:**
   ```bash
   curl -X POST http://localhost:54321/functions/v1/parse-expense \
     -H "Content-Type: application/json" \
     -d '{"text":"пятёрочка 800"}'
   ```

## Деплой на прод

```bash
# 1. Привязать локальную папку к проекту (одноразово)
supabase login                                       # открывает браузер
supabase link --project-ref xxqmdykznupmslwspjqd

# 2. Положить секреты на сервер (одноразово)
supabase secrets set YANDEX_API_KEY=AQVNxxx... YANDEX_FOLDER_ID=b1gxxx...

# 3. Задеплоить функцию (повторять при изменениях)
supabase functions deploy parse-expense
```

После деплоя функция доступна по адресу:
`https://xxqmdykznupmslwspjqd.supabase.co/functions/v1/parse-expense`

## Где взять YandexGPT-ключи

1. Зайти в [Yandex Cloud Console](https://console.cloud.yandex.ru/).
2. Создать каталог (folder) или использовать дефолтный — его ID видно в
   URL консоли (`b1g...`). Это `YANDEX_FOLDER_ID`.
3. Создать сервисный аккаунт с ролью `ai.languageModels.user`.
4. Создать API-ключ для этого аккаунта (Меню → Сервисные аккаунты → Создать
   API-ключ). Это `YANDEX_API_KEY`.
5. Активировать `Yandex Foundation Models` в каталоге (Каталог → Yandex
   Foundation Models → Подключить).

## Цена

YandexGPT-lite (на момент 2026-05): синхронный режим — порядка 0.20 ₽ за
1000 промпт-токенов и 0.40 ₽ за 1000 ответ-токенов. Наш промпт ~1500
токенов + 30 токенов ответа на один запрос ≈ 0.30 ₽ за вызов. На 100
вызовов в день — 30 ₽/мес. Свериться с актуальным прайсом:
https://yandex.cloud/ru/docs/foundation-models/pricing.
