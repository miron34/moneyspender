import { create } from 'zustand';
import type { Category, Expense } from '@/types';
import type { ParsedExpense } from '@/types/voice';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import {
  backfillDefaultDescriptions,
  deleteCategoryRemote,
  deleteExpenseRemote,
  fetchAll,
  pushCategory,
  pushExpense,
  seedDatabase,
  updateCategoryRemote,
} from '@/lib/sync';
import { isSupabaseConfigured } from '@/lib/supabase';
import { buildMockExpenses } from './mockData';

export interface NewExpenseInput {
  cat: string;
  name: string;
  amount: number;
  date: Date;
}

export interface CategoryDraft {
  label: string;
  icon: string;
  color: string;
  /** Optional voice-parser hint. Empty string = clear (column → NULL). */
  description?: string;
}

interface StoreState {
  expenses: Expense[];
  categories: Category[];
  userName: string;
  loaded: boolean;
  syncError: string | null;

  /**
   * Last expense removed via swipe — used to show the Undo toast.
   * Cleared on undo (after restoreExpense) or after the toast timer expires.
   */
  pendingDelete: Expense | null;

  /**
   * Voice-recognized values waiting to be applied to AddExpenseSheet.
   *
   * Set by VoiceConfirmSheet when the user taps "Изменить" — the user
   * wants to edit the parsed result manually. Read by AddExpenseSheet on
   * open to prefill its form fields, then cleared. Allows handing off
   * recognized values across two unrelated sheets without prop-drilling
   * through `app/(tabs)/_layout.tsx`.
   */
  voicePending: ParsedExpense | null;
  setVoicePending: (p: ParsedExpense | null) => void;

  loadInitial: () => Promise<void>;

  addExpense: (input: NewExpenseInput) => Expense;
  deleteExpense: (id: number) => Expense | undefined;
  restoreExpense: (e: Expense) => void;
  /** Sends the actual DELETE to Supabase — called by UndoToast when timer expires. */
  commitDelete: (id: number) => void;
  setPendingDelete: (e: Expense | null) => void;

  addCategory: (draft: CategoryDraft) => Category;
  updateCategory: (id: string, draft: CategoryDraft) => void;
  deleteCategory: (id: string) => void;

  setSyncError: (msg: string | null) => void;
}

const nextId = (): number => Date.now() * 1000 + Math.floor(Math.random() * 1000);

export const useStore = create<StoreState>((set, get) => ({
  expenses: [],
  categories: [],
  userName: 'Мирон',
  loaded: false,
  syncError: null,
  pendingDelete: null,
  voicePending: null,

  loadInitial: async () => {
    if (!isSupabaseConfigured) {
      set({
        categories: DEFAULT_CATEGORIES,
        expenses: buildMockExpenses(),
        loaded: true,
        syncError: 'Supabase не настроен — используются локальные данные',
      });
      return;
    }

    try {
      const { categories, expenses } = await fetchAll();
      if (categories.length === 0) {
        const seedCats = DEFAULT_CATEGORIES;
        const seedExpenses = buildMockExpenses();
        await seedDatabase(seedCats, seedExpenses);
        set({
          categories: seedCats,
          expenses: seedExpenses,
          loaded: true,
          syncError: null,
        });
      } else {
        // Existing install — backfill missing descriptions on default
        // categories. Migration `0002_category_description.sql` added a
        // nullable column; old DBs land with description=null on the
        // defaults. We patch them to match DEFAULT_CATEGORIES, leaving
        // user-created categories alone. Best-effort — failure doesn't
        // block load.
        const patched = await backfillDefaultDescriptions(
          categories,
          DEFAULT_CATEGORIES,
        );
        set({ categories: patched, expenses, loaded: true, syncError: null });
      }
    } catch (err) {
      console.warn('[supabase] loadInitial failed, falling back to mock', err);
      set({
        categories: DEFAULT_CATEGORIES,
        expenses: buildMockExpenses(),
        loaded: true,
        syncError: 'Не удалось подключиться к облаку',
      });
    }
  },

  addExpense: (input) => {
    const expense: Expense = { id: nextId(), ...input };
    set((s) => ({ expenses: [expense, ...s.expenses] }));
    if (isSupabaseConfigured) {
      pushExpense(expense).catch((err) => {
        console.warn('[supabase] pushExpense failed', err);
        get().setSyncError('Не удалось сохранить трату');
      });
    }
    return expense;
  },

  deleteExpense: (id) => {
    const target = get().expenses.find((e) => e.id === id);
    if (!target) return undefined;
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
    return target;
  },

  restoreExpense: (e) => {
    set((s) => {
      if (s.expenses.some((x) => x.id === e.id)) return s;
      const next = [...s.expenses, e].sort((a, b) => b.date.getTime() - a.date.getTime());
      return { expenses: next };
    });
  },

  commitDelete: (id) => {
    if (!isSupabaseConfigured) return;
    deleteExpenseRemote(id).catch((err) => {
      console.warn('[supabase] deleteExpenseRemote failed', err);
      get().setSyncError('Не удалось удалить трату из облака');
    });
  },

  setPendingDelete: (e) => set({ pendingDelete: e }),

  setVoicePending: (p) => set({ voicePending: p }),

  addCategory: (draft) => {
    const cat: Category = { id: `cat_${nextId()}`, ...draft };
    set((s) => ({ categories: [...s.categories, cat] }));
    if (isSupabaseConfigured) {
      pushCategory(cat).catch((err) => {
        console.warn('[supabase] pushCategory failed', err);
        get().setSyncError('Не удалось сохранить категорию');
      });
    }
    return cat;
  },

  updateCategory: (id, draft) => {
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...draft } : c)),
    }));
    if (isSupabaseConfigured) {
      updateCategoryRemote(id, {
        label: draft.label,
        icon: draft.icon,
        color: draft.color,
        description: draft.description,
      }).catch((err) => {
        console.warn('[supabase] updateCategoryRemote failed', err);
        get().setSyncError('Не удалось обновить категорию');
      });
    }
  },

  deleteCategory: (id) => {
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
    if (isSupabaseConfigured) {
      deleteCategoryRemote(id).catch((err) => {
        console.warn('[supabase] deleteCategoryRemote failed', err);
        get().setSyncError('Не удалось удалить категорию из облака');
      });
    }
  },

  setSyncError: (msg) => set({ syncError: msg }),
}));

export const findCategory = (categories: Category[], id: string): Category | undefined =>
  categories.find((c) => c.id === id);
