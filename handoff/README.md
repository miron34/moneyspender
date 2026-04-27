# Handoff: MoneySpender — Personal Expense Tracker

## Overview
A mobile personal expense tracker app designed to run inside an iPhone frame (390×844px). Users manually log spending, view category breakdowns, and analyze spending patterns over time. The app has 4 main screens: Home, History, Analytics, Profile. Language: **Russian**.

## About the Design Files
The files in this bundle (`MoneySpender v4.html`) are **design references created in HTML/React** — high-fidelity interactive prototypes showing the intended look, feel, and behavior. They are **not production code to copy directly**.

The task is to **recreate these designs in the target codebase** (React Native, Flutter, SwiftUI, etc.) using its established patterns, navigation libraries, and component system. If no target codebase exists yet, React Native with Expo is the recommended starting point for a mobile app of this type.

## Fidelity
**High-fidelity.** These are pixel-precise mockups with final colors, typography, spacing, and interactions. Recreate the UI pixel-accurately using the target platform's tools.

---

## Design Tokens

### Colors
```
Background (deepest):   #07091a
Surface (cards):        #0d1124
Surface high:           #131929
Surface top:            #1a2235
Border subtle:          rgba(255,255,255,0.07)
Border mid:             rgba(255,255,255,0.11)
Accent (blue):          #3b5bdb
Text primary:           #f0f2ff
Text dim:               rgba(240,242,255,0.65)
Text muted:             rgba(240,242,255,0.35)
Negative (expenses):    #ff5757
Positive (savings):     #4caf50
```

### Typography
- **Font family:** Inter (weights: 300, 400, 500, 600, 700)
- **Large numbers:** 40–42px, weight 300, letter-spacing −2px
- **Section titles:** 20px, weight 600, letter-spacing −0.5px
- **Card titles:** 13–15px, weight 600
- **Body / list items:** 13–14px, weight 400–500
- **Labels / captions:** 11–12px, weight 300–400
- **Status bar time:** 15px, weight 600, system font

### Spacing & Radius
```
Screen padding:         18px horizontal
Card border-radius:     16–18px
Pill/tag border-radius: 20px (full)
Small card radius:      14px
Button radius:          12–14px
Gaps between cards:     8–12px
```

### Shadows
- FAB button: `0 6px 24px rgba(59,91,219,0.5)`
- Bottom sheets: `backdropFilter: blur(4px)` on overlay

---

## Screens

---

### Screen 1 — Home (`home`)

**Purpose:** Daily overview — total spend for selected period, category breakdown chart, recent transactions.

#### Layout (flex column, full screen)
```
┌─────────────────────────────────┐
│ Header row                      │  padding: 16px 18px
│   "Добро пожаловать" (caption)  │
│   "Мирон" (h1)      [Day|Wk|Mo] │  period switcher top-right
│                                 │
│ Total spend                     │
│   "Расходы за месяц" (caption)  │
│   "24 875 ₽" (big number)       │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ "По категориям"   [≡] [◎]  │ │  chart card, radius 18
│ │ BarChart or DonutChart      │ │
│ │ [Подробнее →]               │ │  link to Analytics tab
│ └─────────────────────────────┘ │
│                                 │
│ "Последние траты"      [Все →]  │
│ ┌─ ERow ─────────────────────┐ │
│ │ icon | name | date | −amt  │ │  compact row, radius 14
│ └─────────────────────────────┘ │
│ (×4 rows)                       │
└─────────────────────────────────┘
```

#### Period Switcher (top-right)
- 3 pills: `День` / `Неделя` / `Месяц`
- Container: bg `#131929`, border `rgba(255,255,255,0.07)`, radius 10, padding 3px, gap 2px
- Active pill: bg `#3b5bdb`, white text, radius 7
- Inactive: transparent bg, muted text

#### Chart Card
- bg `#0d1124`, border, radius 18, padding 14px 16px
- **Chart toggle** — top-right corner: two icon buttons `≡` (bars) and `◎` (donut)
  - Active: bg `rgba(59,91,219,0.16)`, color `#3b5bdb`, radius 8
  - Inactive: bg `#131929`, muted color
- **Bar mode (default):** For each category — emoji icon (22px), label (12px textDim), right-aligned amount (12px), progress bar (4px height, category color gradient, animated width)
- **Donut mode:** SVG circle chart (R=52, stroke-width=18) + legend (dot + label + %)
- `Подробнее →` text button below chart, color `#3b5bdb`

#### Expense Row (compact)
- bg `#0d1124`, border, radius 14, padding 10px 12px
- Left: category icon in colored circle (34×34, radius 10, `color+'1a'` bg)
- Middle: name (13px 500), date+time below (11px muted)
- Right: `−1 840 ₽` in `#ff5757` (13px 600)

---

### Screen 2 — History (`history`)

**Purpose:** Filterable, sortable full list of all transactions grouped by day.

#### Layout
```
┌──────────────────────────────────┐
│ "История"  (h1)                  │  padding 16px 18px
│ [📁 Категория ▾] [📅 Дата ▾]    │  filter pills row
│                                  │
│ ── Сегодня ──────── −3 326 ₽    │  day header
│  ERow                            │
│  ERow                            │
│ ── Вчера ───────── −1 730 ₽     │
│  ERow                            │
│  ...                             │
└──────────────────────────────────┘
```

#### Filter Pills
- Same pill style as period switcher but standalone
- Active filter: bg `rgba(59,91,219,0.13)`, border `rgba(59,91,219,0.33)`, text `#3b5bdb`
- Inactive: bg `#131929`, border subtle, text dim
- Category filter shows selected category icon + name + `✕` to clear
- Filter count + total shown right-aligned if filters active

#### Filter Bottom Sheets
- **Category picker:** 4-column grid of category buttons (icon + label). Selected = colored bg/border
- **Sort picker:** List of options `По дате` / `По сумме` with checkmark on selected

#### Day Group Header
- Date label (12px muted) on left, sum for that day (12px muted `−X ₽`) on right
- `marginBottom: 8px`

---

### Screen 3 — Analytics (`analytics`)

**Purpose:** Aggregate analysis — period comparison, averages, category breakdown, top transactions.

#### Layout (scrollable)
```
┌──────────────────────────────────┐
│ "Аналитика"    [Нед.|Месяц|Кв.] │
│                                  │
│ ┌── Comparison Card ───────────┐ │
│ │ Текущий: 31 425 ₽            │ │
│ │ Предыдущий: 27 830 ₽         │ │
│ │ Progress bar (red/green)     │ │
│ │ +12% (+3 595 ₽)              │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌── Mini card ──┐┌── Mini card ─┐│
│ │ В среднем     ││ Средняя      ││
│ │ за день       ││ трата        ││
│ │ 1 047 ₽       ││ 1 571 ₽      ││
│ └───────────────┘└──────────────┘│
│                                  │
│ ┌── Category Bars Card ────────┐ │
│ │ Full BarChart w/ % labels    │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌── Top-3 Card ────────────────┐ │
│ │ 1. ✈️ Aviasales  −8 400 ₽   │ │
│ │ 2. 🛍️ DNS       −5 400 ₽   │ │
│ │ 3. 🛒 Wildberries −3 600 ₽  │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

#### Comparison Card
- Both current/previous amounts side by side
- Progress bar: fills proportionally, `#ff5757` if current > previous, `#4caf50` if less
- Delta text: `+12% (+3 595 ₽)` colored accordingly

#### Mini Cards (2-column grid, gap 8px)
- Each: bg surface, radius 16, padding 14px
- Label: 11px muted uppercase
- Value: 20px weight 300

#### Top-3 List
- Numbered badges: 22×22, radius 6, bg `#1a2235`, muted text
- Category emoji + name + date + amount

---

### Screen 4 — Profile (`profile`)

**Purpose:** User info display + category management.

#### Layout
```
┌──────────────────────────────────┐
│ "Профиль"                        │
│ ┌── Avatar Card ───────────────┐ │
│ │ [М] Мирон                    │ │
│ │     31 записей · 47 875 ₽    │ │
│ └──────────────────────────────┘ │
│                                  │
│ "Категории"                      │
│ ┌── Category Row ──────────────┐ │
│ │ icon | Еда        ● ›        │ │  colored dot + chevron
│ └──────────────────────────────┘ │
│ (×N rows)                        │
│ [+ Добавить категорию]           │  dashed border button
│                                  │
│ MoneySpender v4.0                │  centered caption
└──────────────────────────────────┘
```

#### Category Row
- Tappable, opens edit bottom sheet
- 36×36 icon container (category color at 10% opacity, radius 10)
- Name (14px 500)
- Colored dot (8×8, category color) + `›` chevron on right

#### Category Edit Bottom Sheet
Three sections:
1. **Название** — text input, placeholder "Название категории"
2. **Иконка** — flex-wrap grid of emoji buttons (40×40, radius 10). Selected: accent border + tinted bg
3. **Цвет** — flex-wrap grid of 12 circular color swatches (34×34). Selected: white 2px border

Actions:
- `Сохранить` — full width, bg `#3b5bdb`, white text, radius 12
- `Удалить категорию` — full width, bg `rgba(255,87,87,0.1)`, border `rgba(255,87,87,0.3)`, text `#ff5757`

#### Add Category Bottom Sheet
Same editor, no delete button. Submit says `Создать`.

---

## Add Expense Flow (FAB → Bottom Sheet)

**Trigger:** `+` FAB button in center of bottom nav bar (floats 10px above bar).

### Add Sheet Layout (~70% screen height)
```
┌── drag handle ──────────────────┐
│                                 │
│ ┌──────────────────────┐  [🎤] │  amount input + mic icon
│ │  1 840        ₽      │       │
│ └──────────────────────┘       │
│                                 │
│ [☕ Кафе] [📅 25 апр, 14:30]   │  category + date pills
│                                 │
│ Комментарий...                  │  text input
│                                 │
│ ┌─── Добавить ────────────────┐ │
│ └─────────────────────────────┘ │  full-width accent button
└─────────────────────────────────┘
```

**Amount field:**
- `inputMode="decimal"`, auto-focus on sheet open (after 350ms delay for animation)
- Font 32px weight 300, background `#1a2235`, radius 12, padding 12px 14px
- Placeholder "0", suffix "₽" in muted color

**Mic icon** (right of amount): 44×44 circle, opacity 0.35, purely decorative

**Category pill:** category color background at 20% opacity, colored border, shows icon + label

**Date pill:** bg `#1a2235`, subtle border, calendar icon + formatted date string

**Submit button:** disabled-style (`#1a2235`, muted text) until amount > 0; active: `#3b5bdb` bg, white text

### Drum/Wheel Date Picker (nested sheet)
- 5 columns side by side: day | month | year | hour | minute
- Each column: scroll-snap list, item height 42px, visible height 168px (4 items)
- Center item = selected, styled bold + primary text color
- Fade gradient top and bottom using `linear-gradient` overlay
- Blue highlight bar behind center row: `rgba(59,91,219,0.12)`, radius 10

### Category Picker (nested sheet)
- 4-column grid of category cards (icon + name)
- Same style as History filter sheet

---

## Bottom Navigation Bar

5 slots: `Главная` · `История` · `[FAB]` · `Анализ` · `Профиль`

- Bar: bg `#0d1124`, border-top 1px subtle, padding `8px 0 18px`
- Each tab: icon (22×22) + label (10px), flex column centered
- Active: icon + label color `#3b5bdb`
- Inactive: color `rgba(240,242,255,0.35)`
- **FAB (center):** 52×52 circle, gradient `linear-gradient(135deg,#5b78ff,#3b5bdb)`, shadow `0 6px 24px rgba(59,91,219,0.5)`, translated 10px upward

---

## Default Categories

| ID        | Label         | Color     | Icon |
|-----------|---------------|-----------|------|
| food      | Еда           | #ff7043   | 🛒   |
| cafe      | Кафе          | #ffb300   | ☕   |
| trans     | Транспорт     | #29b6f6   | 🚇   |
| shop      | Покупки       | #26c6da   | 🛍️  |
| housing   | ЖКХ           | #ab47bc   | 💡   |
| health    | Здоровье      | #66bb6a   | 💊   |
| sport     | Спорт         | #9ccc65   | 🏋️  |
| entert    | Развлечения   | #ec407a   | 🎮   |
| travel    | Путешествия   | #42a5f5   | ✈️   |
| other     | Другое        | #78909c   | 📌   |

---

## State Management

### Global state (App level)
- `expenses: Expense[]` — array of all expense records
- `categories: Category[]` — user-editable category list (starts from defaults)
- `activeTab: string` — current screen

### Expense object
```ts
interface Expense {
  id: number;
  cat: string;       // category id
  name: string;      // display name / comment
  amount: number;    // in rubles
  date: Date;
}
```

### Category object
```ts
interface Category {
  id: string;
  label: string;
  color: string;     // hex
  icon: string;      // emoji
}
```

### Filtering helpers
```ts
// Filter by period
function byPeriod(expenses, period: 'day'|'week'|'month'|'quarter'): Expense[]

// Aggregate by category
function catStats(expenses): {id: string, total: number}[]

// Group by calendar day for History list
function groupByDay(expenses): {label: string, items: Expense[], total: number}[]
```

---

## Animations & Transitions

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Bottom sheet open | `translateY(40px)→0` + `opacity 0→1` | 320ms | `cubic-bezier(0.16,1,0.3,1)` |
| Sheet overlay | `opacity 0→1` | 200ms | linear |
| Progress bar (chart) | `width 0→X%` | 650ms | `cubic-bezier(0.16,1,0.3,1)` |
| Bar chart rows | Staggered, +55ms per row | — | same |
| Period switcher pill | `background`, `color` | 180ms | ease |

---

## Files in This Package
- `MoneySpender v4.html` — interactive HTML prototype (source of truth for design)
- `README.md` — this file

> **Note:** The HTML prototype uses React via Babel CDN for fast prototyping. Do not ship this directly. Recreate each component in your target environment using this README as the specification.
