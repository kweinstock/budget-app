import type { Expense, ExpenseCategory } from '../types';
import { round2 } from './loanCalc';

/** Normalizes any expense to a monthly-equivalent amount. */
export function monthlyEquivalent(expense: Expense): number {
  if (!expense.recurring) return 0; // one-off expenses aren't part of the recurring monthly base
  switch (expense.frequency) {
    case 'weekly':
      return expense.amount * 4.33;
    case 'annual':
      return expense.amount / 12;
    case 'monthly':
    default:
      return expense.amount;
  }
}

export function totalMonthlyRecurringExpenses(expenses: Expense[]): number {
  return round2(expenses.reduce((sum, e) => sum + monthlyEquivalent(e), 0));
}

/** One-off expenses within the current calendar month, for cash-flow purposes. */
export function oneOffExpensesThisMonth(expenses: Expense[]): number {
  const now = new Date();
  const total = expenses
    .filter((e) => !e.recurring)
    .filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, e) => sum + e.amount, 0);
  return round2(total);
}

export function expensesByCategory(expenses: Expense[]): Record<ExpenseCategory, number> {
  const result = {} as Record<ExpenseCategory, number>;
  for (const e of expenses) {
    const monthly = e.recurring ? monthlyEquivalent(e) : e.amount;
    result[e.category] = round2((result[e.category] ?? 0) + monthly);
  }
  return result;
}
