import type { Loan, IncomeSource, Expense, TaxProfile, ScenarioOverrides, Expense as ExpenseT } from '../types';
import { buildSnapshot, type Snapshot } from '../selectors/selectors';
import { avalancheDistribution } from '../calc/loanCalc';

/**
 * Applies scenario overrides to a *copy* of the real data and runs it
 * through the exact same buildSnapshot() function the real dashboard uses.
 * The real store is never touched.
 */
export function runScenario(
  overrides: ScenarioOverrides,
  loans: Loan[],
  incomes: IncomeSource[],
  expenses: Expense[],
  taxProfile: TaxProfile,
  assets: number = 0
): Snapshot {
  let scenarioLoans = loans;
  if (overrides.extraLoanPaymentTotal && overrides.extraLoanPaymentTotal > 0) {
    const distribution = avalancheDistribution(loans, overrides.extraLoanPaymentTotal);
    scenarioLoans = loans.map((l) => ({
      ...l,
      extraPayment: (l.extraPayment ?? 0) + (l.id !== undefined ? distribution[l.id] ?? 0 : 0),
    }));
  }

  let scenarioIncomes = incomes;
  if (overrides.hoursPerWeekOverride !== undefined) {
    scenarioIncomes = scenarioIncomes.map((i) =>
      i.incomeType === 'hourly' && i.hourlyRate
        ? { ...i, hoursPerWeek: overrides.hoursPerWeekOverride, grossAnnual: i.hourlyRate * overrides.hoursPerWeekOverride! * 52 }
        : i
    );
  }
  if (overrides.incomeChangePercent) {
    const factor = 1 + overrides.incomeChangePercent / 100;
    scenarioIncomes = scenarioIncomes.map((i) => ({ ...i, grossAnnual: i.grossAnnual * factor }));
  }

  let scenarioExpenses = expenses;
  if (overrides.newMonthlyExpense && overrides.newMonthlyExpense > 0) {
    const injected: ExpenseT = {
      label: 'Scenario expense',
      category: 'other',
      amount: overrides.newMonthlyExpense,
      date: new Date().toISOString().slice(0, 10),
      recurring: true,
      frequency: 'monthly',
    };
    scenarioExpenses = [...expenses, injected];
  }

  return buildSnapshot(scenarioLoans, scenarioIncomes, scenarioExpenses, taxProfile, assets);
}

export function compareToBaseline(baseline: Snapshot, scenario: Snapshot) {
  return {
    cashFlowDelta: round2(scenario.monthlyCashFlow - baseline.monthlyCashFlow),
    debtFreeMonthsDelta: baseline.debtFreeMonths - scenario.debtFreeMonths, // positive = sooner
    netWorthDelta: round2(scenario.netWorth - baseline.netWorth),
    dtiDelta: round2(scenario.dti - baseline.dti),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
