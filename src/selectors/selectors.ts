import type { Loan, IncomeSource, Expense, TaxProfile } from '../types';
import { amortizationSchedule, currentMonthlyObligation, isInterestDeferred, round2 } from '../calc/loanCalc';
import { totalMonthlyNetIncome, totalMonthlyGrossIncome, calculateDTI } from '../calc/taxCalc';
import { totalMonthlyRecurringExpenses, expensesByCategory } from '../calc/expenseCalc';
import { combinedDebtFreeMonths, generateAlerts } from '../calc/projections';

/**
 * Everything in this file is a pure function of the raw data passed in.
 * Nothing here is cached or stored — call it again after any change and
 * you always get the current truth. This is what makes cross-linked
 * updates automatic: every screen calls these same functions instead of
 * maintaining its own copy of a total.
 */

export function totalDebtBalance(loans: Loan[]): number {
  return round2(loans.reduce((sum, l) => sum + l.currentBalance, 0));
}

/** Sum of what's actually due this month — $0 for any loan still in deferment. */
export function totalMonthlyDebtPayments(loans: Loan[]): number {
  return round2(loans.reduce((sum, l) => sum + currentMonthlyObligation(l), 0));
}

/** Interest accruing right now — $0 for deferred loans, since none is accruing yet. */
export function totalMonthlyInterestAccruing(loans: Loan[]): number {
  return round2(
    loans.reduce((sum, l) => sum + (isInterestDeferred(l) ? 0 : l.currentBalance * (l.apr / 100 / 12)), 0)
  );
}

export interface Snapshot {
  netMonthlyIncome: number;
  grossMonthlyIncome: number;
  totalMonthlyExpenses: number;
  totalMonthlyDebtPayments: number;
  monthlyCashFlow: number;
  totalDebt: number;
  totalAssets: number;
  dti: number;
  netWorth: number;
  debtFreeMonths: number;
  expensesByCategory: ReturnType<typeof expensesByCategory>;
  alerts: ReturnType<typeof generateAlerts>;
}

/** The one function every dashboard screen calls. */
export function buildSnapshot(
  loans: Loan[],
  incomes: IncomeSource[],
  expenses: Expense[],
  taxProfile: TaxProfile,
  assets: number = 0
): Snapshot {
  const netMonthlyIncome = totalMonthlyNetIncome(incomes, taxProfile);
  const grossMonthlyIncome = totalMonthlyGrossIncome(incomes);
  const totalMonthlyExpenses = totalMonthlyRecurringExpenses(expenses);
  const debtPayments = totalMonthlyDebtPayments(loans);
  const monthlyCashFlow = round2(netMonthlyIncome - totalMonthlyExpenses - debtPayments);
  const totalDebt = totalDebtBalance(loans);
  const dti = calculateDTI(debtPayments, grossMonthlyIncome);
  const netWorth = round2(assets - totalDebt);
  const debtFreeMonths = combinedDebtFreeMonths(loans);

  const alerts = generateAlerts({
    loans,
    netMonthlyIncome,
    totalMonthlyExpenses,
    totalMonthlyDebtPayments: debtPayments,
    dti,
  });

  return {
    netMonthlyIncome,
    grossMonthlyIncome,
    totalMonthlyExpenses,
    totalMonthlyDebtPayments: debtPayments,
    monthlyCashFlow,
    totalDebt,
    totalAssets: assets,
    dti,
    netWorth,
    debtFreeMonths,
    expensesByCategory: expensesByCategory(expenses),
    alerts,
  };
}

/** Payoff chart series for every loan, combined balance over time. */
export function combinedPayoffSeries(loans: Loan[]): { month: number; totalBalance: number }[] {
  const schedules = loans.map((l) => amortizationSchedule(l));
  const maxLen = Math.max(0, ...schedules.map((s) => s.length));
  const series: { month: number; totalBalance: number }[] = [];
  for (let m = 0; m < maxLen; m++) {
    const totalBalance = round2(
      schedules.reduce((sum, sched) => sum + (sched[m] ? sched[m].balance : 0), 0)
    );
    series.push({ month: m + 1, totalBalance });
  }
  return series;
}
