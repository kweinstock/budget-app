import type { IncomeSource, TaxProfile } from '../types';
import { round2 } from './loanCalc';

/** Progressive bracket tax calculation on taxable income. */
export function federalTax(taxableIncome: number, brackets: { upTo: number; rate: number }[]): number {
  let tax = 0;
  let lower = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= lower) break;
    const upper = Math.min(taxableIncome, bracket.upTo);
    tax += (upper - lower) * bracket.rate;
    lower = upper;
    if (taxableIncome <= bracket.upTo) break;
  }
  return round2(tax);
}

export interface TakeHomeResult {
  grossAnnual: number;
  preTaxDeductions: number;
  taxableIncome: number;
  federalTaxAmount: number;
  ficaAmount: number;
  stateTaxAmount: number;
  netAnnual: number;
  netMonthly: number;
  effectiveTaxRate: number;
}

export function estimateTakeHomePay(income: IncomeSource, profile: TaxProfile): TakeHomeResult {
  const preTaxDeductions = round2(income.grossAnnual * (income.preTaxDeductionPercent / 100));
  const afterPreTax = income.grossAnnual - preTaxDeductions;
  const taxableIncome = Math.max(0, afterPreTax - profile.standardDeduction);

  const federalTaxAmount = federalTax(taxableIncome, profile.federalBrackets);
  const ficaAmount = round2(income.grossAnnual * profile.ficaRate);
  const stateTaxAmount = round2(afterPreTax * (profile.stateFlatRate ?? 0));

  const netAnnual = round2(afterPreTax - federalTaxAmount - ficaAmount - stateTaxAmount);
  const netMonthly = round2(netAnnual / 12);
  const effectiveTaxRate = income.grossAnnual > 0
    ? round2(((federalTaxAmount + ficaAmount + stateTaxAmount) / income.grossAnnual) * 100)
    : 0;

  return {
    grossAnnual: income.grossAnnual,
    preTaxDeductions,
    taxableIncome,
    federalTaxAmount,
    ficaAmount,
    stateTaxAmount,
    netAnnual,
    netMonthly,
    effectiveTaxRate,
  };
}

export function totalMonthlyNetIncome(incomes: IncomeSource[], profile: TaxProfile): number {
  return round2(incomes.reduce((sum, inc) => sum + estimateTakeHomePay(inc, profile).netMonthly, 0));
}

export function totalMonthlyGrossIncome(incomes: IncomeSource[]): number {
  return round2(incomes.reduce((sum, inc) => sum + inc.grossAnnual / 12, 0));
}

export function calculateDTI(monthlyDebtPayments: number, monthlyGrossIncome: number): number {
  if (monthlyGrossIncome <= 0) return 0;
  return round2((monthlyDebtPayments / monthlyGrossIncome) * 100);
}

export interface BracketRow {
  rate: number; // decimal, e.g. 0.12
  from: number;
  to: number;
  amountTaxed: number;
  taxOwed: number;
}

export interface CombinedTaxResult {
  totalGrossAnnual: number;
  totalPreTaxDeductions: number;
  totalTaxableIncome: number;
  brackets: BracketRow[];
  marginalRatePercent: number; // rate applied to your next dollar earned
  federalTaxTotal: number;
  ficaTotal: number;
  stateTaxTotal: number;
  totalTax: number;
  netAnnual: number;
  netMonthly: number;
  effectiveRatePercent: number;
}

/**
 * The tax-accurate view: combines every income source into one taxable
 * income and runs it through the bracket table together, so adding a
 * second income source correctly pushes you into higher brackets instead
 * of taxing each source in isolation the way estimateTakeHomePay() does
 * per-source for quick per-row display.
 */
export function combinedTaxBreakdown(incomes: IncomeSource[], profile: TaxProfile): CombinedTaxResult {
  const totalGrossAnnual = round2(incomes.reduce((s, i) => s + i.grossAnnual, 0));
  const totalPreTaxDeductions = round2(
    incomes.reduce((s, i) => s + i.grossAnnual * (i.preTaxDeductionPercent / 100), 0)
  );
  const afterPreTax = round2(totalGrossAnnual - totalPreTaxDeductions);
  const totalTaxableIncome = Math.max(0, round2(afterPreTax - profile.standardDeduction));

  const brackets: BracketRow[] = [];
  let lower = 0;
  let marginalRate = 0;
  for (const b of profile.federalBrackets) {
    if (totalTaxableIncome <= lower) break;
    const upper = Math.min(totalTaxableIncome, b.upTo);
    const amountTaxed = round2(upper - lower);
    if (amountTaxed > 0) {
      brackets.push({ rate: b.rate, from: lower, to: upper, amountTaxed, taxOwed: round2(amountTaxed * b.rate) });
      marginalRate = b.rate;
    }
    lower = upper;
    if (totalTaxableIncome <= b.upTo) break;
  }

  const federalTaxTotal = round2(brackets.reduce((s, r) => s + r.taxOwed, 0));
  const ficaTotal = round2(totalGrossAnnual * profile.ficaRate);
  const stateTaxTotal = round2(afterPreTax * (profile.stateFlatRate ?? 0));
  const totalTax = round2(federalTaxTotal + ficaTotal + stateTaxTotal);
  const netAnnual = round2(afterPreTax - totalTax);
  const netMonthly = round2(netAnnual / 12);
  const effectiveRatePercent = totalGrossAnnual > 0 ? round2((totalTax / totalGrossAnnual) * 100) : 0;

  return {
    totalGrossAnnual,
    totalPreTaxDeductions,
    totalTaxableIncome,
    brackets,
    marginalRatePercent: round2(marginalRate * 100),
    federalTaxTotal,
    ficaTotal,
    stateTaxTotal,
    totalTax,
    netAnnual,
    netMonthly,
    effectiveRatePercent,
  };
}

/** Federal tax cost of an additional amount of income on top of what's already taxable — shows bracket creep. */
export function federalTaxOnAdditionalIncome(
  currentTaxableIncome: number,
  additionalAmount: number,
  brackets: { upTo: number; rate: number }[]
): number {
  if (additionalAmount <= 0) return 0;
  return round2(
    federalTax(currentTaxableIncome + additionalAmount, brackets) - federalTax(currentTaxableIncome, brackets)
  );
}
