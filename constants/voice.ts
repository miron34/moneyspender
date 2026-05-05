// Constants for the voice/NLP feature.
//
// Currently a single source of truth for the Edge Function name. The actual
// YandexGPT URL, model name, and API key live on the server side
// (supabase/functions/parse-expense/index.ts) — never on the client, so they
// don't appear here. See docs/decisions.md for the rationale.

export const PARSE_EXPENSE_FN = 'parse-expense';
