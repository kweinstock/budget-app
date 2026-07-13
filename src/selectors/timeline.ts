import type { Loan, IncomeSource, Expense, TaxProfile } from '../types';
import { amortizationSchedule, currentMonthlyObligation, round2 } from '../calc/loanCalc';
import { totalMonthlyRecurringExpenses } from '../calc/expenseCalc';
import { estimateTakeHomePay } from '../calc/taxCalc';
import { currentIncomeAsOf } from '../calc/incomeCalc';

export interface TimelinePoint {
  monthLabel: string; // e.g. '2026-08'
  date: string;
  netIncome: number;
  monthlyPayment: number;
  assets: number;
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Net income for one source on a specific date — same before/after/end-date rule used everywhere else, so this always agrees with the "current" figures shown elsewhere. */
function incomeNetOnDate(income: IncomeSource, date: Date, taxProfile: TaxProfile): number {
  const resolved = currentIncomeAsOf(income, date);
  return estimateTakeHomePay(resolved, taxProfile).netMonthly;
}

export function buildFinancialTimeline(params: {
  loans: Loan[];
  incomes: IncomeSource[];
  expenses: Expense[];
  taxProfile: TaxProfile;
  currentAssets: number;
  assetHistory: { date: string; totalAssets: number }[];
  startDate: Date;
  endDate: Date;
}): TimelinePoint[] {
  const { loans, incomes, expenses, taxProfile, currentAssets, assetHistory, startDate, endDate } = params;
  const today = new Date();
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const schedules = new Map<number, ReturnType<typeof amortizationSchedule>>();
  for (const loan of loans) {
    if (loan.id !== undefined) schedules.set(loan.id, amortizationSchedule(loan));
  }
  const currentTotalObligation = round2(loans.reduce((s, l) => s + currentMonthlyObligation(l), 0));
  const monthlyExpenseTotal = totalMonthlyRecurringExpenses(expenses);
  const sortedHistory = [...assetHistory].sort((a, b) => a.date.localeCompare(b.date));

  const points: TimelinePoint[] = [];
  // Assets-only trajectory: what you actually have on hand, growing (or
  // shrinking) with each month's surplus. Loan balances are deliberately
  // NOT subtracted here — that's net worth, a different question. Loan
  // payments still reduce this line the months they're actually paid.
  let projectedAssets = currentAssets;

  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= end) {
    const monthsFromNow =
      (cursor.getFullYear() - thisMonthStart.getFullYear()) * 12 + (cursor.getMonth() - thisMonthStart.getMonth());

    const netIncome = round2(incomes.reduce((sum, i) => sum + incomeNetOnDate(i, cursor, taxProfile), 0));

    let monthlyPayment: number;
    if (monthsFromNow < 0) {
      monthlyPayment = currentTotalObligation;
    } else {
      let sum = 0;
      for (const loan of loans) {
        if (loan.id === undefined) continue;
        const schedule = schedules.get(loan.id) ?? [];
        if (monthsFromNow < schedule.length) sum += schedule[monthsFromNow].payment;
      }
      monthlyPayment = round2(sum);
    }

    let assetsForPoint: number;
    if (monthsFromNow <= 0) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).toISOString().slice(0, 10);
      const match = [...sortedHistory].reverse().find((s) => s.date <= monthEnd);
      assetsForPoint = match ? match.totalAssets : currentAssets;
      projectedAssets = assetsForPoint;
    } else {
      const cashFlow = round2(netIncome - monthlyExpenseTotal - monthlyPayment);
      projectedAssets = round2(projectedAssets + cashFlow);
      assetsForPoint = projectedAssets;
    }

    points.push({
      monthLabel: monthKey(cursor),
      date: cursor.toISOString().slice(0, 10),
      netIncome,
      monthlyPayment,
      assets: assetsForPoint,
    });

    cursor = addMonths(cursor, 1);
  }

  return points;
}
