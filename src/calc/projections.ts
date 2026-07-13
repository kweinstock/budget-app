import type { Loan, Alert } from '../types';
import { amortizationSchedule, payoffMonths } from './loanCalc';

/** Combined debt-free date across every loan, using each loan's own payment plan. */
export function combinedDebtFreeMonths(loans: Loan[]): number {
  if (loans.length === 0) return 0;
  return Math.max(...loans.map((loan) => payoffMonths(amortizationSchedule(loan))));
}

export function monthsToDateLabel(months: number): string {
  if (months <= 0) return 'now';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (rem > 0) parts.push(`${rem} mo${rem > 1 ? 's' : ''}`);
  return parts.join(' ');
}

/**
 * Generates alerts purely from current data — nothing here is manually
 * authored or stored as a fact, so it can never go stale.
 */
export function generateAlerts(params: {
  loans: Loan[];
  netMonthlyIncome: number;
  totalMonthlyExpenses: number;
  totalMonthlyDebtPayments: number;
  dti: number;
}): Alert[] {
  const { loans, netMonthlyIncome, totalMonthlyExpenses, totalMonthlyDebtPayments, dti } = params;
  const alerts: Alert[] = [];

  const cashFlow = netMonthlyIncome - totalMonthlyExpenses - totalMonthlyDebtPayments;
  if (cashFlow < 0) {
    alerts.push({
      id: 'negative-cashflow',
      type: 'threshold',
      severity: 'danger',
      message: `You're projected to spend $${Math.abs(round(cashFlow))} more than you earn this month.`,
    });
  } else if (cashFlow < netMonthlyIncome * 0.05 && netMonthlyIncome > 0) {
    alerts.push({
      id: 'thin-margin',
      type: 'threshold',
      severity: 'warning',
      message: `Your monthly margin is thin — only $${round(cashFlow)} left after expenses and debt payments.`,
    });
  }

  if (dti > 43) {
    alerts.push({
      id: 'high-dti',
      type: 'threshold',
      severity: 'danger',
      message: `Debt-to-income ratio is ${dti}%, above the 43% threshold most lenders treat as high risk.`,
    });
  } else if (dti > 36) {
    alerts.push({
      id: 'elevated-dti',
      type: 'threshold',
      severity: 'warning',
      message: `Debt-to-income ratio is ${dti}%, getting into the range that can limit loan approval.`,
    });
  }

  for (const loan of loans) {
    const months = payoffMonths(amortizationSchedule(loan));
    if (months > 0) {
      alerts.push({
        id: `payoff-${loan.id}`,
        type: 'projection',
        severity: 'info',
        message: `${loan.name} is on track to be paid off in ${monthsToDateLabel(months)}.`,
      });
    }
  }

  return alerts;
}

function round(n: number): number {
  return Math.round(n);
}
