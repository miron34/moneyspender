import type { Category, Expense } from '@/types';
import { supabase } from './supabase';

interface DbCategory {
  id: string;
  label: string;
  color: string;
  icon: string;
  description?: string | null;
  sort_order?: number;
  created_at?: string;
}

interface DbExpense {
  id: number;
  cat: string | null;
  name: string;
  amount: number;
  date: string;
  created_at?: string;
}

const categoryFromDb = (row: DbCategory): Category => ({
  id: row.id,
  label: row.label,
  color: row.color,
  icon: row.icon,
  // Surface description only when present — Category.description is
  // optional, undefined reads cleaner than empty string in TS.
  description: row.description ?? undefined,
});

const categoryToDb = (cat: Category, sortOrder: number): DbCategory => ({
  id: cat.id,
  label: cat.label,
  color: cat.color,
  icon: cat.icon,
  description: cat.description ?? null,
  sort_order: sortOrder,
});

const expenseFromDb = (row: DbExpense): Expense => ({
  id: Number(row.id),
  cat: row.cat ?? '',
  name: row.name,
  amount: Number(row.amount),
  date: new Date(row.date),
});

const expenseToDb = (e: Expense): DbExpense => ({
  id: e.id,
  cat: e.cat,
  name: e.name,
  amount: e.amount,
  date: e.date.toISOString(),
});

const requireClient = () => {
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }
  return supabase;
};

export interface SyncFetchResult {
  categories: Category[];
  expenses: Expense[];
}

/** Fetch categories and expenses from Supabase. */
export async function fetchAll(): Promise<SyncFetchResult> {
  const client = requireClient();

  const [catsRes, expRes] = await Promise.all([
    client.from('categories').select('*').order('sort_order', { ascending: true }),
    client.from('expenses').select('*').order('date', { ascending: false }),
  ]);

  if (catsRes.error) throw catsRes.error;
  if (expRes.error) throw expRes.error;

  return {
    categories: (catsRes.data as DbCategory[]).map(categoryFromDb),
    expenses: (expRes.data as DbExpense[]).map(expenseFromDb),
  };
}

/** One-time seed: insert default categories + sample expenses into an empty DB. */
export async function seedDatabase(
  categories: Category[],
  expenses: Expense[],
): Promise<void> {
  const client = requireClient();

  const catRows = categories.map((c, i) => categoryToDb(c, i));
  const catRes = await client.from('categories').insert(catRows);
  if (catRes.error) throw catRes.error;

  if (expenses.length > 0) {
    const expRows = expenses.map(expenseToDb);
    const expRes = await client.from('expenses').insert(expRows);
    if (expRes.error) throw expRes.error;
  }
}

/** Insert a single expense. Throws on failure. */
export async function pushExpense(e: Expense): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('expenses').insert(expenseToDb(e));
  if (error) throw error;
}

/** Delete an expense by id. Throws on failure. */
export async function deleteExpenseRemote(id: number): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

/** Insert a single category. Throws on failure. */
export async function pushCategory(cat: Category): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('categories').insert(categoryToDb(cat, 999));
  if (error) throw error;
}

/** Update a category by id. Throws on failure. */
export async function updateCategoryRemote(
  id: string,
  patch: Pick<Category, 'label' | 'icon' | 'color' | 'description'>,
): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('categories')
    .update({
      label: patch.label,
      icon: patch.icon,
      color: patch.color,
      description: patch.description ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

/** Delete a category by id. Throws on failure. */
export async function deleteCategoryRemote(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Backfill missing descriptions on default categories — one-shot per
 * device. The migration that added the `description` column is nullable,
 * so existing installs end up with a database where defaults have
 * `description = null`. We seed them from the in-app DEFAULT_CATEGORIES
 * the first time we notice this on load. Custom user categories are
 * never touched.
 *
 * Returns the patched list (so the store can hold it in memory).
 * Network writes are best-effort: if Supabase is unreachable we still
 * return the locally-patched list, and the next loadInitial will retry.
 */
export async function backfillDefaultDescriptions(
  loaded: Category[],
  defaults: Category[],
): Promise<Category[]> {
  // Build a quick lookup of default ids → desired description.
  const wantedById = new Map<string, string>();
  for (const d of defaults) {
    if (d.description) wantedById.set(d.id, d.description);
  }

  const toPatch: Category[] = [];
  const next: Category[] = loaded.map((c) => {
    const wanted = wantedById.get(c.id);
    // Only touch defaults (id matches one of our seeded ids) AND only when
    // the description is missing locally. If the user cleared it on
    // purpose we leave it alone (empty string vs undefined; we set
    // the column to NULL on clear, so undefined is the trigger).
    if (wanted && (c.description == null || c.description === '')) {
      const patched = { ...c, description: wanted };
      toPatch.push(patched);
      return patched;
    }
    return c;
  });

  if (toPatch.length === 0) return next;

  // Best-effort write; ignore errors so a network blip doesn't block load.
  try {
    const client = requireClient();
    await Promise.all(
      toPatch.map((c) =>
        client
          .from('categories')
          .update({ description: c.description })
          .eq('id', c.id),
      ),
    );
  } catch (err) {
    console.warn('[supabase] backfillDefaultDescriptions failed', err);
  }

  return next;
}
