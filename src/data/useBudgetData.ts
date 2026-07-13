import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureDefaultTaxProfile } from './db';
import { useEffect } from 'react';

export function useBudgetData() {
  useEffect(() => {
    ensureDefaultTaxProfile();
  }, []);

  const loans = useLiveQuery(() => db.loans.toArray(), []) ?? [];
  const incomes = useLiveQuery(() => db.incomes.toArray(), []) ?? [];
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) ?? [];
  const creditScores = useLiveQuery(() => db.creditScores.orderBy('date').toArray(), []) ?? [];
  const templates = useLiveQuery(() => db.templates.toArray(), []) ?? [];
  const assets = useLiveQuery(() => db.assets.toArray(), []) ?? [];
  const taxProfile = useLiveQuery(() => db.taxProfiles.toCollection().last(), []);

  const loading = taxProfile === undefined;

  return { loans, incomes, expenses, creditScores, templates, assets, taxProfile, loading };
}
