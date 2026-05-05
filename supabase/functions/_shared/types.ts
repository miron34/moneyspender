// Shared types between Edge Functions.
//
// IMPORTANT: this file is the server-side mirror of `types/voice.ts` on the
// client. The two MUST stay in sync — same shape, same field names. Edge
// Functions run on Deno and cannot import from the app's `types/` folder
// (different tsconfig, different module resolution), so we duplicate the
// declaration here intentionally.

// Free-form string — actual id from the user's category list passed in
// the parse-expense request body. Validated server-side against that list.
export type ExpenseCat = string;

export interface ParsedExpense {
  amount: number | null;
  name: string | null;
  cat: ExpenseCat | null;
  date: string | null;
}

// Wire format for category metadata sent in the parse-expense request.
// We send only what the model needs to choose between categories — id
// (returned back), label (primary signal), and optional description
// (synonyms / examples for better matching).
export interface CategoryHint {
  id: string;
  label: string;
  description?: string;
}
