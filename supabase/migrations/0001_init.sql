-- MoneySpender — initial schema
-- Idempotent: safe to run multiple times.

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id          TEXT PRIMARY KEY,
  label       TEXT        NOT NULL,
  color       TEXT        NOT NULL,
  icon        TEXT        NOT NULL,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expenses table.
-- id is a BIGINT generated on the client (Date.now() * 1000 + random),
-- not BIGSERIAL — to keep optimistic updates simple.
CREATE TABLE IF NOT EXISTS public.expenses (
  id          BIGINT PRIMARY KEY,
  cat         TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  amount      NUMERIC     NOT NULL CHECK (amount > 0),
  date        TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expenses_date_idx ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS expenses_cat_idx  ON public.expenses(cat);

-- MVP: single user, no auth. Disable RLS so the anon key has full access.
-- Re-enable + add policies when auth is introduced post-MVP.
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses   DISABLE ROW LEVEL SECURITY;
