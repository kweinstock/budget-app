import Dexie, { type Table } from 'dexie';
import type {
  Loan,
  IncomeSource,
  Expense,
  CreditScoreEntry,
  TaxProfile,
  RecurringTemplate,
  Scenario,
  Asset,
  NetWorthSnapshot,
} from '../types';

export class BudgetDB extends Dexie {
  loans!: Table<Loan, number>;
  incomes!: Table<IncomeSource, number>;
  expenses!: Table<Expense, number>;
  creditScores!: Table<CreditScoreEntry, number>;
  taxProfiles!: Table<TaxProfile, number>;
  templates!: Table<RecurringTemplate, number>;
  scenarios!: Table<Scenario, number>;
  assets!: Table<Asset, number>;
  netWorthSnapshots!: Table<NetWorthSnapshot, number>;

  constructor() {
    super('BudgetDB');
    this.version(1).stores({
      loans: '++id, name, type',
      incomes: '++id, name',
      expenses: '++id, category, date, recurring',
      creditScores: '++id, date, bureau',
      taxProfiles: '++id, year',
      templates: '++id, type',
      scenarios: '++id, name',
    });
    this.version(2).stores({
      assets: '++id, name, category',
      netWorthSnapshots: '++id, &date',
    });
  }
}

export const db = new BudgetDB();

// Seed a sensible default tax profile on first run so calculations work
// out of the box. These are approximate 2025 single-filer federal brackets —
// EDIT THESE in Settings to match your actual filing status and current year.
export async function ensureDefaultTaxProfile() {
  const count = await db.taxProfiles.count();
  if (count === 0) {
    await db.taxProfiles.add({
      year: new Date().getFullYear(),
      filingStatus: 'single',
      state: '',
      standardDeduction: 14600,
      federalBrackets: [
        { upTo: 11600, rate: 0.10 },
        { upTo: 47150, rate: 0.12 },
        { upTo: 100525, rate: 0.22 },
        { upTo: 191950, rate: 0.24 },
        { upTo: 243725, rate: 0.32 },
        { upTo: 609350, rate: 0.35 },
        { upTo: Infinity, rate: 0.37 },
      ],
      ficaRate: 0.0765,
      stateFlatRate: 0,
    });
  }
}
