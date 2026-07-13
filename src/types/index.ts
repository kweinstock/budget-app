export type LoanType = 'student' | 'car' | 'other';
export type StudentLoanSubsidy = 'subsidized' | 'unsubsidized' | 'private';

export interface Loan {
  id?: number;
  name: string;
  type: LoanType;
  subsidyType?: StudentLoanSubsidy; // only meaningful when type === 'student'
  currentBalance: number;
  apr: number;
  termMonths: number;
  startDate: string;
  extraPayment?: number;
  // These are independent: unsubsidized federal loans commonly accrue
  // interest during school even though no payment is due, while
  // subsidized loans defer both. A promotional 0%-APR car loan might defer
  // interest without deferring payments. Applies to any loan type.
  interestDeferredUntil?: string;
  paymentsDeferredUntil?: string;
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
  deferred?: boolean;
}

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annual';
export type IncomeType = 'salary' | 'hourly';

export interface IncomeSource {
  id?: number;
  name: string;
  incomeType: IncomeType;
  grossAnnual: number; // for hourly incomes, this is derived: hourlyRate * hoursPerWeek * 52
  hourlyRate?: number;
  hoursPerWeek?: number;
  // Optional future change — e.g. dropping from 40 to 20 hrs/wk when school starts.
  // Nothing needs to be manually toggled: calculations check today's date against
  // scheduledHoursDate and automatically use the right hours.
  scheduledHoursPerWeek?: number;
  scheduledHoursDate?: string;
  payFrequency: PayFrequency;
  preTaxDeductionPercent: number; // 401k, HSA, etc. combined, as % of gross
  startDate: string;
  endDate?: string;
}

export type ExpenseCategory =
  | 'housing'
  | 'food'
  | 'transportation'
  | 'utilities'
  | 'insurance'
  | 'entertainment'
  | 'health'
  | 'debt'
  | 'other';

export interface Expense {
  id?: number;
  label: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  recurring: boolean;
  frequency?: 'weekly' | 'monthly' | 'annual';
}

export interface CreditScoreEntry {
  id?: number;
  date: string;
  score: number;
  bureau: 'Experian' | 'Equifax' | 'TransUnion' | 'Other';
}

export interface TaxProfile {
  id?: number;
  year: number;
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
  state: string;
  standardDeduction: number;
  federalBrackets: { upTo: number; rate: number }[]; // rate as decimal, e.g. 0.12
  ficaRate: number; // combined SS + Medicare, decimal
  stateFlatRate?: number; // simplified: flat estimate for state tax
}

export interface RecurringTemplate {
  id?: number;
  label: string;
  category: ExpenseCategory;
  amount: number;
  type: 'expense' | 'income';
}

export interface ScenarioOverrides {
  extraLoanPaymentTotal?: number; // extra $ split across loans by avalanche order
  incomeChangePercent?: number;
  hoursPerWeekOverride?: number; // applies to hourly incomes, replaces their current hours
  newMonthlyExpense?: number;
}

export interface Scenario {
  id?: number;
  name: string;
  overrides: ScenarioOverrides;
}

export interface Alert {
  id: string;
  type: 'projection' | 'reminder' | 'threshold';
  severity: 'info' | 'warning' | 'danger';
  message: string;
}

export type AssetCategory = 'cash' | 'savings' | 'investment' | 'retirement' | 'property' | 'other';

export interface Asset {
  id?: number;
  name: string;
  category: AssetCategory;
  balance: number;
  lastUpdated: string;
}

export interface NetWorthSnapshot {
  id?: number;
  date: string; // one entry per calendar day, upserted as the day's numbers change
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}
