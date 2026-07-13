import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { Loan } from '../types';
import { amortizationSchedule } from '../calc/loanCalc';

export function AmortizationDetail({ loan }: { loan: Loan }) {
  const schedule = amortizationSchedule(loan);

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={schedule}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
          <Line type="monotone" dataKey="balance" stroke="var(--accent)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <details>
        <summary>Full month-by-month schedule ({schedule.length} months)</summary>
        <table className="data-table small">
          <thead>
            <tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>
          </thead>
          <tbody>
            {schedule.map((row) => (
              <tr key={row.month} className={row.deferred ? 'deferred-row' : ''}>
                <td>{row.month}</td>
                <td className="num">{row.deferred ? '—' : `$${row.payment.toLocaleString()}`}</td>
                <td className="num">{row.deferred ? '—' : `$${row.principalPaid.toLocaleString()}`}</td>
                <td className="num">{row.deferred ? 'deferred' : `$${row.interestPaid.toLocaleString()}`}</td>
                <td className="num">${row.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
