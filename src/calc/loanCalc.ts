import type { Loan, AmortizationRow } from '../types';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function monthlyPayment(principal: number, aprPercent: number, termMonths: number): number {
  const r = aprPercent / 100 / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

/** Whole calendar months between two dates, rounded up so a partial month still counts. */
export function monthsUntil(dateStr: string, from: Date = new Date()): number {
  const target = new Date(dateStr);
  const months = (target.getFullYear() - from.getFullYear()) * 12 + (target.getMonth() - from.getMonth());
  return Math.max(0, target.getDate() >= from.getDate() ? months : months - 1) + 1;
}

export function isInterestDeferred(loan: Loan, from: Date = new Date()): boolean {
  if (!loan.interestDeferredUntil) return false;
  return new Date(loan.interestDeferredUntil) > from;
}

export function isPaymentDeferred(loan: Loan, from: Date = new Date()): boolean {
  if (!loan.paymentsDeferredUntil) return false;
  return new Date(loan.paymentsDeferredUntil) > from;
}

/**
 * Current required monthly payment. During payment deferment the
 * *required* amount is $0, but any voluntary extraPayment you've set
 * still counts — paying extra during deferment is exactly how you'd stop
 * unsubsidized interest from capitalizing.
 */
export function currentMonthlyObligation(loan: Loan): number {
  const extra = loan.extraPayment ?? 0;
  if (isPaymentDeferred(loan)) return round2(extra);
  return round2(monthlyPayment(loan.currentBalance, loan.apr, loan.termMonths) + extra);
}

/**
 * Builds a full month-by-month payoff schedule, handling interest
 * deferment and payment deferment independently:
 *  - Interest deferred + payment deferred (subsidized-style): balance
 *    holds flat, nothing accrues, nothing is due.
 *  - Interest accruing + payment deferred (unsubsidized-style): no
 *    required payment, but interest capitalizes onto the balance each
 *    month unless a voluntary extra payment is set — in which case that
 *    extra is applied for real: it pays down accruing interest first
 *    (preventing capitalization), then any remainder reduces principal.
 *  - Interest deferred + payment due: any payment made goes entirely to
 *    principal since no interest is accruing yet.
 * extraOverride lets scenario logic inject a different extra payment
 * without mutating the stored loan.
 */
export function amortizationSchedule(loan: Loan, extraOverride?: number): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  const r = loan.apr / 100 / 12;
  const extra = extraOverride ?? loan.extraPayment ?? 0;

  const interestDeferMonths = loan.interestDeferredUntil ? monthsUntil(loan.interestDeferredUntil) - 1 : 0;
  const paymentDeferMonths = loan.paymentsDeferredUntil ? monthsUntil(loan.paymentsDeferredUntil) - 1 : 0;

  let balance = loan.currentBalance;
  let month = 0;
  let paymentAmount: number | null = null;
  const safetyCap = Math.max(loan.termMonths * 3, 600);

  while (balance > 0.01 && month < safetyCap) {
    month++;
    const interestAccruing = month > interestDeferMonths;
    const paymentDue = month > paymentDeferMonths;
    const interestThisMonth = interestAccruing ? round2(balance * r) : 0;

    if (!paymentDue) {
      if (extra > 0) {
        // Voluntary payment during deferment: pays down accruing interest
        // first (preventing capitalization), remainder reduces principal.
        const interestCovered = Math.min(extra, interestThisMonth);
        const uncoveredInterest = round2(interestThisMonth - interestCovered);
        const principalReduction = Math.min(round2(extra - interestCovered), balance);
        balance = round2(balance + uncoveredInterest - principalReduction);
        rows.push({
          month,
          payment: round2(interestCovered + principalReduction),
          principalPaid: round2(principalReduction),
          interestPaid: interestThisMonth,
          balance,
          deferred: true,
        });
      } else {
        // No payment at all — accruing interest (if any) capitalizes onto the balance.
        balance = round2(balance + interestThisMonth);
        rows.push({
          month,
          payment: 0,
          principalPaid: 0,
          interestPaid: interestThisMonth,
          balance,
          deferred: true,
        });
      }
      continue;
    }

    if (paymentAmount === null) {
      // Lock in the payment amount the first month it's actually due,
      // based on the balance at that point (which may have grown from
      // capitalized interest during a payment-deferment window).
      const remainingTermMonths = Math.max(1, loan.termMonths - (month - paymentDeferMonths - 1));
      paymentAmount = monthlyPayment(balance, loan.apr, remainingTermMonths) + extra;
    }

    let principalPaid = paymentAmount - interestThisMonth;
    if (principalPaid <= 0) break; // payment doesn't cover interest — infinite loop guard
    if (principalPaid > balance) principalPaid = balance;
    balance = round2(balance - principalPaid);

    rows.push({
      month,
      payment: round2(principalPaid + interestThisMonth),
      principalPaid: round2(principalPaid),
      interestPaid: interestThisMonth,
      balance,
    });
  }
  return rows;
}

export function totalInterestPaid(schedule: AmortizationRow[]): number {
  return round2(schedule.reduce((sum, row) => sum + row.interestPaid, 0));
}

export function payoffMonths(schedule: AmortizationRow[]): number {
  return schedule.length;
}

export function payoffDate(loan: Loan, extraOverride?: number): Date | null {
  const schedule = amortizationSchedule(loan, extraOverride);
  if (schedule.length === 0) return null;
  const start = new Date();
  return new Date(start.getFullYear(), start.getMonth() + schedule.length, start.getDate());
}

/**
 * Distributes a lump extra-payment budget across loans using the
 * avalanche method (highest APR first). Deferred loans are NOT excluded —
 * a voluntary extra payment during deferment is a real and often smart
 * move (it stops unsubsidized interest from capitalizing), so the slider
 * needs to actually reach those loans too.
 */
export function avalancheDistribution(loans: Loan[], extraBudget: number): Record<number, number> {
  const sorted = [...loans].sort((a, b) => b.apr - a.apr);
  const result: Record<number, number> = {};
  for (const loan of loans) {
    if (loan.id !== undefined) result[loan.id] = 0;
  }
  let remaining = extraBudget;
  for (const loan of sorted) {
    if (loan.id === undefined) continue;
    if (remaining <= 0) break;
    result[loan.id] = remaining;
    remaining = 0;
  }
  return result;
}
