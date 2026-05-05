// Client-side wrapper around the `parse-expense` Edge Function.
//
// The function does the actual YandexGPT call on the server (where the
// billable API key lives). This module's job is just to:
//   1. Validate input client-side (skip the network round-trip on empty text).
//   2. Build the request body — including:
//      - today + timezone so the model can anchor relative dates
//      - the user's categories (id, label, optional description) so the
//        model can return a real id from the user's list
//   3. Invoke the function via the Supabase client.
//   4. Map transport errors to a typed `ParseExpenseError`.
//
// What this module DOES NOT do:
//   - Map slug to a real Category id — the server now returns a real id
//     from the categories we passed in (or null), so no client-side
//     mapping is needed. The caller still uses a fallback for `null`.
//   - Convert `date` string to a JS Date — caller decides rendering.
//   - Retry on failure. Voice is interactive.

import { isSupabaseConfigured, supabase } from './supabase';
import { ParseExpenseError } from './errors';
import { PARSE_EXPENSE_FN } from '@/constants/voice';
import type { Category } from '@/types';
import type { ExpenseCat, ParsedExpense } from '@/types/voice';

const EMPTY_RESULT: ParsedExpense = {
  amount: null,
  name: null,
  cat: null,
  date: null,
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a free-form Russian expense phrase via the parse-expense Edge Function.
 *
 * @param text       Raw user text (e.g. "пятёрочка 800", "вчера такси 350").
 * @param categories User's current category list — sent to the model so
 *                   it can return real ids from this list (or null).
 *                   Empty list throws — model can't classify into nothing.
 * @returns `ParsedExpense`. `cat` is either an id from `categories[]` or null.
 *
 * @throws {ParseExpenseError}
 *   - Supabase not configured
 *   - Empty categories array (caller should ensure ≥1)
 *   - Edge Function transport / structured error
 */
export async function parseExpenseText(
  text: string,
  categories: Category[],
): Promise<ParsedExpense> {
  const trimmed = text.trim();
  if (!trimmed) return EMPTY_RESULT;

  if (!isSupabaseConfigured || !supabase) {
    throw new ParseExpenseError('Supabase is not configured');
  }

  if (categories.length === 0) {
    throw new ParseExpenseError(
      'У вас нет категорий, создайте хотя бы одну',
    );
  }

  // Strip to the wire format — the server only needs id/label/description.
  // Cuts payload size by dropping color/icon, which the model doesn't use.
  const categoriesPayload = categories.map((c) => ({
    id: c.id,
    label: c.label,
    ...(c.description ? { description: c.description } : {}),
  }));

  const allowedIds = new Set(categories.map((c) => c.id));

  const { data, error } = await supabase.functions.invoke<unknown>(
    PARSE_EXPENSE_FN,
    {
      body: {
        text: trimmed,
        today: getTodayLocalIso(),
        tz: getLocalTimezone(),
        categories: categoriesPayload,
      },
    },
  );

  if (error) {
    throw new ParseExpenseError(
      `Edge function transport error: ${error.message ?? 'unknown'}`,
      error,
    );
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const code = (data as { error?: unknown }).error;
    throw new ParseExpenseError(
      `Edge function returned error: ${String(code)}`,
      data,
    );
  }

  return coerceParsed(data, allowedIds);
}

/**
 * Today's date in YYYY-MM-DD using the user's *local* timezone, not UTC.
 * `Date.toISOString()` returns UTC, which can flip a day at the boundary —
 * so we build the string from getFullYear/getMonth/getDate.
 */
function getTodayLocalIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Best-effort IANA timezone name for the device. Falls back to "UTC".
 */
function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Defensive coercion of the Edge Function response. The server already
 * validates, but we re-check on the client so a future server bug or
 * stale deploy can't crash the form. We also re-verify cat is in our
 * `allowedIds` (anti-defence-in-depth — server already does this).
 */
function coerceParsed(
  data: unknown,
  allowedIds: ReadonlySet<string>,
): ParsedExpense {
  if (!data || typeof data !== 'object') return EMPTY_RESULT;
  const o = data as Record<string, unknown>;

  const amount =
    typeof o.amount === 'number' && Number.isFinite(o.amount) && o.amount > 0
      ? o.amount
      : null;

  const name =
    typeof o.name === 'string' && o.name.trim().length > 0
      ? o.name.trim()
      : null;

  const cat: ExpenseCat | null =
    typeof o.cat === 'string' && allowedIds.has(o.cat) ? o.cat : null;

  const date =
    typeof o.date === 'string' && ISO_DATE_RE.test(o.date) ? o.date : null;

  return { amount, name, cat, date };
}
