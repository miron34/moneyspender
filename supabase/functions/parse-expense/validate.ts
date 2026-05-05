import type { ExpenseCat, ParsedExpense } from '../_shared/types.ts';

// Hard cap on `name` length to protect against a runaway model that decides
// to return a paragraph instead of a 1-3 word label.
const MAX_NAME_LEN = 60;

// Date sanity windows: a voice-entered expense should be from today or the
// recent past. We allow up to 1 day in the future to absorb time-zone slop
// (user in UTC+12 entering at midnight, server interprets as next day) and
// 365 days in the past — older than a year is almost certainly a model
// hallucination, not a real recall.
const DATE_FUTURE_TOLERANCE_DAYS = 1;
const DATE_MAX_PAST_DAYS = 365;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const EMPTY: ParsedExpense = {
  amount: null,
  name: null,
  cat: null,
  date: null,
};

/**
 * Defensive validator for the JSON the model returns.
 *
 * The model has been instructed to return `{amount, name, cat, date}` with
 * strict types, but we never trust the model — every field is checked and
 * coerced to `null` if it doesn't match the expected shape. The function
 * ALWAYS returns a valid ParsedExpense, never throws.
 *
 * @param obj            Parsed JSON from model output
 * @param today          Today in YYYY-MM-DD (user's local TZ) — used for date window
 * @param allowedCatIds  Set of category ids the request supplied. Anything
 *                       outside this set is coerced to null. Empty set
 *                       means "no categories sent" — cat is always null.
 */
export function validateParsed(
  obj: unknown,
  today?: string,
  allowedCatIds?: ReadonlySet<string>,
): ParsedExpense {
  if (!obj || typeof obj !== 'object') return EMPTY;
  const o = obj as Record<string, unknown>;

  const amount =
    typeof o.amount === 'number' && Number.isFinite(o.amount) && o.amount > 0
      ? o.amount
      : null;

  const rawName = typeof o.name === 'string' ? o.name.trim() : '';
  const name = rawName ? rawName.slice(0, MAX_NAME_LEN) : null;

  const cat = validateCat(o.cat, allowedCatIds);

  const date = validateDate(o.date, today);

  return { amount, name, cat, date };
}

/**
 * Validate the `cat` field returned by the model.
 *
 * The model is instructed to only return ids from the request's category
 * list. We re-check here in case the model improvises — anything outside
 * `allowedCatIds` collapses to null.
 */
function validateCat(
  raw: unknown,
  allowedCatIds: ReadonlySet<string> | undefined,
): ExpenseCat | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  if (!allowedCatIds || allowedCatIds.size === 0) return null;
  return allowedCatIds.has(raw) ? raw : null;
}

/**
 * Validate a date returned by the model.
 *
 * Accepts:
 *   - Strict YYYY-MM-DD format
 *   - Within [today - 365 days, today + 1 day] window
 *   - Actually parses as a real calendar date
 *
 * Returns null on any violation.
 */
function validateDate(raw: unknown, today?: string): string | null {
  if (typeof raw !== 'string' || !ISO_DATE_RE.test(raw)) return null;

  // Parse and round-trip to verify the date is real (e.g. reject 2026-02-30)
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Compare round-trip; catches things like "2026-02-30" → JS would silently
  // shift to March, so the round-trip won't match the input.
  const roundTrip = parsed.toISOString().slice(0, 10);
  if (roundTrip !== raw) return null;

  // Sanity window: not too far in future, not too far in past.
  const reference = today && ISO_DATE_RE.test(today)
    ? new Date(`${today}T00:00:00Z`)
    : new Date(); // fallback to server clock

  const diffDays = Math.round(
    (parsed.getTime() - reference.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays > DATE_FUTURE_TOLERANCE_DAYS) return null;
  if (diffDays < -DATE_MAX_PAST_DAYS) return null;

  return raw;
}

/**
 * Strip optional ```json fences the model might wrap output in despite our
 * "no markdown" instruction. Then JSON.parse and run through validateParsed.
 * Any failure (non-JSON, missing fields) collapses to EMPTY.
 */
export function extractAndValidate(
  raw: string,
  today: string | undefined,
  allowedCatIds: ReadonlySet<string>,
): ParsedExpense {
  const cleaned = raw
    .replace(/^\s*```json\s*/i, '')
    .replace(/^\s*```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  if (!cleaned) return EMPTY;

  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    return EMPTY;
  }

  return validateParsed(obj, today, allowedCatIds);
}
