import type { IncomeSource } from '../types';
import { round2 } from './loanCalc';

export function withHoursPerWeek(income: IncomeSource, hours: number): IncomeSource {
  return { ...income, hoursPerWeek: hours, grossAnnual: round2((income.hourlyRate ?? 0) * hours * 52) };
}

/** False before an income's start date or after its end date. */
export function isIncomeActive(income: IncomeSource, asOf: Date = new Date()): boolean {
  if (income.startDate && new Date(income.startDate) > asOf) return false;
  if (income.endDate && new Date(income.endDate) < asOf) return false;
  return true;
}

/**
 * Resolves an income to its actual rate right now — a plain before/after
 * switch on the scheduled-hours date, not blended. This is what "current"
 * numbers (this month's cash flow, current DTI) should use: your cash
 * flow this month is based on your current hours, not diluted by a rate
 * change that hasn't happened yet.
 */
export function currentIncomeAsOf(income: IncomeSource, asOf: Date = new Date()): IncomeSource {
  if (!isIncomeActive(income, asOf)) {
    return { ...income, grossAnnual: 0, hoursPerWeek: 0 };
  }
  if (income.incomeType !== 'hourly' || !income.scheduledHoursDate || income.scheduledHoursPerWeek === undefined) {
    return income;
  }
  const switchDate = new Date(income.scheduledHoursDate);
  return asOf >= switchDate ? withHoursPerWeek(income, income.scheduledHoursPerWeek) : income;
}

export function currentIncomes(incomes: IncomeSource[], asOf: Date = new Date()): IncomeSource[] {
  return incomes.map((i) => currentIncomeAsOf(i, asOf));
}

/**
 * Annual income blended across a scheduled hours change — used
 * specifically for the tax breakdown, where the relevant figure really is
 * "how much will I earn this whole year," a genuine mix of both rates.
 * Not used for "current" snapshots (see currentIncomeAsOf above).
 */
export function blendedAnnualIncome(income: IncomeSource, asOf: Date = new Date()): number {
  if (!isIncomeActive(income, asOf)) return 0;
  if (income.incomeType !== 'hourly') return income.grossAnnual;
  const rate = income.hourlyRate ?? 0;
  const currentHours = income.hoursPerWeek ?? 0;
  if (!income.scheduledHoursDate || income.scheduledHoursPerWeek === undefined) {
    return round2(rate * currentHours * 52);
  }
  const switchDate = new Date(income.scheduledHoursDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysInYear = 365;
  let daysBefore = Math.round((switchDate.getTime() - asOf.getTime()) / msPerDay);
  daysBefore = Math.max(0, Math.min(daysInYear, daysBefore));
  const daysAfter = daysInYear - daysBefore;
  const weeklyBefore = rate * currentHours;
  const weeklyAfter = rate * income.scheduledHoursPerWeek;
  return round2(weeklyBefore * (daysBefore / 7) + weeklyAfter * (daysAfter / 7));
}

export function blendedIncomes(incomes: IncomeSource[], asOf: Date = new Date()): IncomeSource[] {
  return incomes.map((i) => ({ ...i, grossAnnual: blendedAnnualIncome(i, asOf) }));
}