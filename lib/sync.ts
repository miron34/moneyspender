import type { Category, Expense } from '@/types';
import { supabase } from './supabase';

interface DbCategory {
  id: string;
  label: string;
  color: string;
  icon: string;
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
});

const categoryToDb = (cat: Category, sortOrder: number): DbCategory => ({
  id: cat.id,
  label: cat.label,
  color: cat.color,
  icon: cat.icon,
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
  patch: Pick<Category, 'label' | 'icon' | 'color'>,
): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('categories')
    .update({ label: patch.label, icon: patch.icon, color: patch.color })
    .eq('id', id);
  if (error) throw error;
}

/** Delete a category by id. Throws on failure. */
export async function deleteCategoryRemote(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) throw error;
}
