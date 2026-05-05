-- 0002_category_description.sql
-- Adds optional `description` field to categories — a free-form hint that
-- the voice/NLP parser sees alongside the category label so users can
-- teach the model their custom categories (e.g. "учебники, курсы" for
-- a custom "Образование" category).
--
-- Idempotent: safe to re-run.

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Optional sanity comment for whoever browses the schema in pgAdmin
COMMENT ON COLUMN categories.description IS
  'Optional free-form hint for the voice parser. Max 200 chars on app side. Surfaced to YandexGPT in the parse-expense Edge Function.';
