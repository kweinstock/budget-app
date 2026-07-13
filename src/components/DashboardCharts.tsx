import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import type { Loan } from '../types';
import { combinedPayoffSeries } from '../selectors/selectors';
import type { Snapshot } from '../selectors/selectors';

const COLORS = ['#0F766E', '#D97706', '#2563EB', '#DC2626', '#7C3AED', '#059669', '#DB2777', '#4B5563', '#EA580C'];

export function DebtPayoffChart({ loans }: { loans: Loan[] }) {
  const series = combinedPayoffSeries(loans);
  if (series.length === 0) return <p className="empty-state">Add a loan to see the payoff timeline.</p>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={series}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="month" label={{ value: 'Month', position: 'insideBottom', offset: -5 }} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
        <Line type="monotone" dataKey="totalBalance" stroke="var(--accent)" strokeWidth={2} dot={false} name="Combined debt balance" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryBreakdownChart({ snapshot }: { snapshot: Snapshot }) {
  const data = Object.entries(snapshot.expensesByCategory)
    .filter(([, v]) => v > 0)
    .map(([category, value]) => ({ name: category, value }));

  if (data.length === 0) return <p className="empty-state">No recurring expenses logged yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CashFlowSummary({ snapshot }: { snapshot: Snapshot }) {
  const rows = [
    { label: 'Net monthly income', value: snapshot.netMonthlyIncome, sign: 1 },
    { label: 'Recurring expenses', value: snapshot.totalMonthlyExpenses, sign: -1 },
    { label: 'Debt payments', value: snapshot.totalMonthlyDebtPayments, sign: -1 },
  ];

  return (
    <div className="cashflow-summary">
      {rows.map((r) => (
        <div key={r.label} className="cashflow-row">
          <span>{r.label}</span>
          <span className="num">{r.sign < 0 ? '-' : ''}${r.value.toLocaleString()}</span>
        </div>
      ))}
      <div className="cashflow-row cashflow-total">
        <span>Monthly cash flow</span>
        <span className={`num ${snapshot.monthlyCashFlow < 0 ? 'negative' : 'positive'}`}>
          ${snapshot.monthlyCashFlow.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export function StatCards({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="stat-cards">
      <div className="stat-card">
        <span className="stat-label">Net worth</span>
        <span className="stat-value">${snapshot.netWorth.toLocaleString()}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Total debt</span>
        <span className="stat-value">${snapshot.totalDebt.toLocaleString()}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Debt-to-income</span>
        <span className="stat-value">{snapshot.dti}%</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Monthly cash flow</span>
        <span className={`stat-value ${snapshot.monthlyCashFlow < 0 ? 'negative' : 'positive'}`}>
          ${snapshot.monthlyCashFlow.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
