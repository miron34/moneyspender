// Supabase Edge Function: parse-expense
// ----------------------------------------------------------------------------
// Accepts a free-form Russian phrase about a single expense plus the user's
// current category list, calls YandexGPT with a fixed system prompt + few-shot,
// and returns a structured `{ amount, name, cat, date }` object.
//
// Why categories come from the request body (not hardcoded in the prompt):
//   Users can rename, delete, and add custom categories. A fixed slug
//   taxonomy in the prompt fails on custom categories (the model returns
//   the nearest hardcoded slug instead of the custom id) and breaks on
//   renames (the user's "Еда" becomes "Продукты" but the model still
//   returns "food" — semantic mismatch). With dynamic categories the
//   request envelope tells the model what's available, and the user can
//   evolve their categorisation freely. See docs/decisions.md 2026-05-04.
//
// Contract:
//   Request:  POST {
//     "text": "вчера обед 500 в категорию ужины",
//     "today": "2026-05-04",                          // optional, YYYY-MM-DD
//     "tz": "Europe/Moscow",                          // optional, IANA tz
//     "categories": [                                 // required, 1..30 items
//       { "id": "food", "label": "Еда", "description": "продукты, …" },
//       { "id": "cat_99", "label": "Ужины" }
//     ]
//   }
//   Response: 200 {
//     "amount": 500, "name": "Обед", "cat": "cat_99", "date": "2026-05-03"
//   }

import {
  corsHeaders,
  handleCorsPreflight,
  jsonResponse,
} from '../_shared/cors.ts';
import type { CategoryHint } from '../_shared/types.ts';
import { PARSE_SYSTEM_PROMPT } from './prompt.ts';
import { extractAndValidate } from './validate.ts';

const YANDEX_GPT_URL =
  'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
const YANDEX_GPT_MODEL = 'yandexgpt-lite';

// Hard cap on phrase length — protects against prompt-injection via huge
// payloads and keeps YandexGPT bills predictable.
const MAX_INPUT_LEN = 500;

// Server-side bounds on the categories array. UI enforces 20; we accept
// up to 30 to give room for migrations / experiments without hard breaks.
const MAX_CATEGORIES_SERVER = 30;
const MAX_LABEL_LEN = 60;
const MAX_DESCRIPTION_LEN = 200;

// Strict YYYY-MM-DD pattern; anything else → ignored, fall back to no
// today context.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Lax IANA-tz pattern: letters / underscore / slash / digits / + / -.
// Doesn't validate against the IANA database — just rejects garbage.
const TZ_RE = /^[A-Za-z_/+\-0-9]+$/;

interface YandexCompletionResponse {
  result?: {
    alternatives?: Array<{
      message?: {
        text?: string;
      };
    }>;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleCorsPreflight();
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  if (!body || typeof body !== 'object') {
    return jsonResponse({ error: 'text_required' }, 400);
  }

  const {
    text: rawText,
    today: rawToday,
    tz: rawTz,
    categories: rawCategories,
  } = body as {
    text?: unknown;
    today?: unknown;
    tz?: unknown;
    categories?: unknown;
  };

  if (typeof rawText !== 'string') {
    return jsonResponse({ error: 'text_required' }, 400);
  }

  const text = rawText.trim().slice(0, MAX_INPUT_LEN);
  if (!text) {
    return jsonResponse({ error: 'text_required' }, 400);
  }

  // Validate & sanitize categories.
  const categoriesResult = parseCategories(rawCategories);
  if ('error' in categoriesResult) {
    return jsonResponse({ error: categoriesResult.error }, 400);
  }
  const categories = categoriesResult.value;

  // Optional date context. Both fields silently degrade to undefined on
  // bad input — better to parse without context than reject the request.
  const today =
    typeof rawToday === 'string' && ISO_DATE_RE.test(rawToday)
      ? rawToday
      : undefined;
  const tz =
    typeof rawTz === 'string' && rawTz.length <= 50 && TZ_RE.test(rawTz)
      ? rawTz
      : undefined;

  // Read secrets.
  const apiKey = Deno.env.get('YANDEX_API_KEY');
  const folderId = Deno.env.get('YANDEX_FOLDER_ID');
  if (!apiKey || !folderId) {
    return jsonResponse({ error: 'yandex_not_configured' }, 500);
  }

  const userMessageText = buildUserMessage(text, today, tz, categories);

  let upstream: Response;
  try {
    upstream = await fetch(YANDEX_GPT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'x-folder-id': folderId,
      },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/${YANDEX_GPT_MODEL}`,
        completionOptions: {
          stream: false,
          temperature: 0,
          // 150 tokens fits {amount, name, cat, date} comfortably even
          // when the model echoes a long custom category id.
          maxTokens: '150',
        },
        messages: [
          { role: 'system', text: PARSE_SYSTEM_PROMPT },
          { role: 'user', text: userMessageText },
        ],
      }),
    });
  } catch (e) {
    return jsonResponse(
      { error: 'upstream_unreachable', detail: String(e) },
      502,
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return jsonResponse(
      { error: 'upstream_status', status: upstream.status, detail },
      502,
    );
  }

  let upstreamJson: YandexCompletionResponse;
  try {
    upstreamJson = (await upstream.json()) as YandexCompletionResponse;
  } catch {
    return jsonResponse({ error: 'upstream_invalid_json' }, 502);
  }

  const modelText =
    upstreamJson?.result?.alternatives?.[0]?.message?.text ?? '';

  const allowedCatIds = new Set(categories.map((c) => c.id));
  const parsed = extractAndValidate(modelText, today, allowedCatIds);

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

// =============================================================================
// Helpers
// =============================================================================

interface ParsedCategoriesOk {
  value: CategoryHint[];
}
interface ParsedCategoriesErr {
  error: string;
}
type ParseResult = ParsedCategoriesOk | ParsedCategoriesErr;

/**
 * Validate and sanitize the `categories` field. Returns either a clean
 * array of CategoryHint or an error code.
 *
 * Failure modes:
 *   - missing / not array      → "categories_required"
 *   - empty array              → "no_categories"
 *   - too many                 → "too_many_categories"
 *   - any element malformed    → silently dropped (we trust the client
 *     less than we trust the supabase auth gate, but we're not strict
 *     enough to reject the whole batch for one bad row)
 */
function parseCategories(raw: unknown): ParseResult {
  if (!Array.isArray(raw)) {
    return { error: 'categories_required' };
  }
  if (raw.length === 0) {
    return { error: 'no_categories' };
  }
  if (raw.length > MAX_CATEGORIES_SERVER) {
    return { error: 'too_many_categories' };
  }

  const out: CategoryHint[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === 'string' ? e.id : '';
    const label = typeof e.label === 'string' ? e.label.trim() : '';
    const description =
      typeof e.description === 'string' ? e.description.trim() : '';
    if (!id || !label) continue;
    if (id.length > 80) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    const hint: CategoryHint = {
      id,
      label: label.slice(0, MAX_LABEL_LEN),
    };
    if (description) {
      hint.description = description.slice(0, MAX_DESCRIPTION_LEN);
    }
    out.push(hint);
  }

  if (out.length === 0) {
    return { error: 'no_categories' };
  }
  return { value: out };
}

/**
 * Build the user message for YandexGPT — sandwiching the phrase between
 * date context (line 1) and category list (mid block). The system prompt
 * teaches the model to read this envelope.
 */
function buildUserMessage(
  text: string,
  today: string | undefined,
  tz: string | undefined,
  categories: CategoryHint[],
): string {
  const todayStr = today ?? 'unknown';
  const tzStr = tz ?? 'unknown';
  const lines: string[] = [];
  lines.push(`[today: ${todayStr}, tz: ${tzStr}]`);
  lines.push('');
  lines.push('Категории:');
  for (const c of categories) {
    if (c.description) {
      lines.push(`- ${c.id}: ${c.label} (${c.description})`);
    } else {
      lines.push(`- ${c.id}: ${c.label}`);
    }
  }
  lines.push('');
  lines.push(`Текст: ${text}`);
  return lines.join('\n');
}
