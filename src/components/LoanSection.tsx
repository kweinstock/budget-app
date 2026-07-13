import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { Loan, StudentLoanSubsidy } from '../types';
import { amortizationSchedule, totalInterestPaid, payoffMonths, isInterestDeferred, isPaymentDeferred } from '../calc/loanCalc';
import { monthsToDateLabel } from '../calc/projections';

const emptyLoan: Omit<Loan, 'id'> = {
  name: '',
  type: 'student',
  subsidyType: 'unsubsidized',
  currentBalance: 0,
  apr: 0,
  termMonths: 60,
  startDate: new Date().toISOString().slice(0, 10),
  extraPayment: 0,
  interestDeferredUntil: '',
  paymentsDeferredUntil: '',
};

export function LoanForm() {
  const [form, setForm] = useState<Omit<Loan, 'id'>>(emptyLoan);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const toSave: Omit<Loan, 'id'> = { ...form };
    if (!toSave.interestDeferredUntil) delete toSave.interestDeferredUntil;
    if (!toSave.paymentsDeferredUntil) delete toSave.paymentsDeferredUntil;
    if (toSave.type !== 'student') delete toSave.subsidyType;
    await db.loans.add(toSave);
    setForm(emptyLoan);
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <input
        placeholder="Loan name (e.g. Federal student loan)"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Loan['type'] })}>
        <option value="student">Student</option>
        <option value="car">Car</option>
        <option value="other">Other</option>
      </select>
      {form.type === 'student' && (
        <select
          value={form.subsidyType ?? 'unsubsidized'}
          onChange={(e) => setForm({ ...form, subsidyType: e.target.value as StudentLoanSubsidy })}
        >
          <option value="subsidized">Subsidized (federal)</option>
          <option value="unsubsidized">Unsubsidized (federal)</option>
          <option value="private">Private</option>
        </select>
      )}
      <input
        type="number"
        placeholder="Current balance ($)"
        value={form.currentBalance || ''}
        onChange={(e) => setForm({ ...form, currentBalance: Number(e.target.value) })}
        required
      />
      <input
        type="number"
        step="0.01"
        placeholder="APR (%)"
        value={form.apr || ''}
        onChange={(e) => setForm({ ...form, apr: Number(e.target.value) })}
        required
      />
      <input
        type="number"
        placeholder="Term (months)"
        value={form.termMonths || ''}
        onChange={(e) => setForm({ ...form, termMonths: Number(e.target.value) })}
        required
      />
      <input
        type="number"
        placeholder="Extra monthly payment (optional)"
        value={form.extraPayment || ''}
        onChange={(e) => setForm({ ...form, extraPayment: Number(e.target.value) })}
      />
      <label className="field-label">
        Interest deferred until (optional)
        <input
          type="date"
          value={form.interestDeferredUntil ?? ''}
          onChange={(e) => setForm({ ...form, interestDeferredUntil: e.target.value })}
        />
      </label>
      <label className="field-label">
        Payments deferred until (optional)
        <input
          type="date"
          value={form.paymentsDeferredUntil ?? ''}
          onChange={(e) => setForm({ ...form, paymentsDeferredUntil: e.target.value })}
        />
      </label>
      <p className="muted form-hint">
        These are independent: an unsubsidized loan often has interest accruing (leave interest field
        blank) while payments are deferred until you leave school. A subsidized loan typically defers
        both to the same date.
      </p>
      <button type="submit" className="btn-primary">Add Loan</button>
    </form>
  );
}

export function LoanList({ onSelect }: { onSelect: (id: number) => void }) {
  const loans = useLiveQuery(() => db.loans.toArray(), []);

  if (!loans) return <p>Loading…</p>;
  if (loans.length === 0) return <p className="empty-state">No loans yet — add one above.</p>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Balance</th>
          <th>APR</th>
          <th>Status</th>
          <th>Payoff in</th>
          <th>Total interest</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {loans.map((loan) => {
          const schedule = amortizationSchedule(loan);
          const interestDeferred = isInterestDeferred(loan);
          const paymentDeferred = isPaymentDeferred(loan);
          return (
            <tr key={loan.id}>
              <td>{loan.name}</td>
              <td className="cap">{loan.type === 'student' && loan.subsidyType ? loan.subsidyType : loan.type}</td>
              <td className="num">${loan.currentBalance.toLocaleString()}</td>
              <td className="num">{loan.apr}%</td>
              <td>
                <div className="badge-stack">
                  {interestDeferred ? (
                    <span className="badge badge-info">Interest deferred until {loan.interestDeferredUntil}</span>
                  ) : (
                    <span className="badge badge-neutral">Interest accruing</span>
                  )}
                  {paymentDeferred ? (
                    <span className="badge badge-info">Payments deferred until {loan.paymentsDeferredUntil}</span>
                  ) : (
                    <span className="badge badge-neutral">Payment due</span>
                  )}
                </div>
              </td>
              <td className="num">{monthsToDateLabel(payoffMonths(schedule))}</td>
              <td className="num">${totalInterestPaid(schedule).toLocaleString()}</td>
              <td>
                <button className="btn-link view" onClick={() => onSelect(loan.id!)}>View</button>
                <button className="btn-link delete" onClick={() => db.loans.delete(loan.id!)}>Delete</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
