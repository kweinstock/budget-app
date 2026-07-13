import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { db } from '../data/db';
import type { Loan, IncomeSource, Expense, TaxProfile } from '../types';
import { buildFinancialTimeline } from '../selectors/timeline';

interface Props {
  loans: Loan[];
  incomes: IncomeSource[];
  expenses: Expense[];
  taxProfile: TaxProfile;
  currentAssets: number;
}

function monthsFromToday(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

export function FinancialTimelineChart({ loans, incomes, expenses, taxProfile, currentAssets }: Props) {
  const [startDate, setStartDate] = useState(monthsFromToday(-6));
  const [endDate, setEndDate] = useState(monthsFromToday(12));
  const netWorthHistory = useLiveQuery(() => db.netWorthSnapshots.toArray(), []) ?? [];

  const points = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
    return buildFinancialTimeline({
      loans,
      incomes,
      expenses,
      taxProfile,
      currentAssets,
      assetHistory: netWorthHistory.map((s) => ({ date: s.date, totalAssets: s.totalAssets })),
      startDate: start,
      endDate: end,
    });
  }, [loans, incomes, expenses, taxProfile, currentAssets, netWorthHistory, startDate, endDate]);

  return (
    <div>
      <div className="date-range-controls">
        <label className="field-label">
          From
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="field-label">
          To
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>

      {points.length === 0 ? (
        <p className="empty-state">Pick a valid date range (from before to) to see the timeline.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value, name) => [`$${Number(value ?? 0).toLocaleString()}`, String(name)]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="netIncome" name="Net income" stroke="#0F6E5C" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="left" type="monotone" dataKey="monthlyPayment" name="Debt payment" stroke="#A6341C" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="assets" name="What you have (assets)" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      <p className="muted">
        Hover any point to see that month's net income, debt payment, and assets together. "Assets" is
        what you actually have on hand — it does not subtract what you still owe on loans, only what you
        actually pay each month. Past and current months use today's income and payment figures as a flat
        estimate; future months follow each loan's real payoff/deferment schedule and any scheduled income
        change, and assume positive monthly cash flow gets saved.
      </p>
    </div>
  );
}
