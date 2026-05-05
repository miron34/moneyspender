// Types for the voice/NLP expense-parsing pipeline.
//
// `ExpenseCat` was a literal union of 10 hardcoded slugs (food/cafe/...).
// It's now a free-form string — the model returns whatever Category.id
// the client passed in the parse-expense request body, or null. The
// server validates that the returned value is one of the ids supplied
// in the request, so the client can trust it without re-checking against
// a static taxonomy.
//
// Why we kept the named alias:
//   - Self-documenting: `cat: ExpenseCat | null` reads better than
//     `cat: string | null` at every call site.
//   - One place to extend if/when we re-add structure (e.g. a
//     `kind = 'user' | 'default'` flag).
//
// IMPORTANT: keep in sync with `supabase/functions/_shared/types.ts`
// (server-side mirror). Edge Functions run on Deno and can't import
// from this folder.

export type ExpenseCat = string;

export interface ParsedExpense {
  amount: number | null;
  name: string | null;
  /**
   * Resolved category id from the user's list, or null if no category
   * matched (e.g. user said "500 рублей" without context, or said
   * "в категорию X" where X doesn't exist and no near match was found).
   */
  cat: ExpenseCat | null;
  /**
   * Recognized date in `YYYY-MM-DD` format (user's local timezone).
   * `null` if not mentioned in the phrase — client substitutes today.
   * Server validates: must be valid YYYY-MM-DD, not in the future, and
   * not older than ~1 year.
   */
  date: string | null;
}
