import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { IncomeSource, PayFrequency, IncomeType } from '../types';
import { estimateTakeHomePay } from '../calc/taxCalc';
import { round2 } from '../calc/loanCalc';
import { withHoursPerWeek, currentIncomeAsOf } from '../calc/incomeCalc';

const emptyIncome: Omit<IncomeSource, 'id'> = {
  name: '',
  incomeType: 'salary',
  grossAnnual: 0,
  hourlyRate: 0,
  hoursPerWeek: 40,
  payFrequency: 'biweekly',
  preTaxDeductionPercent: 0,
  startDate: new Date().toISOString().slice(0, 10),
};

export function IncomeForm() {
  const [form, setForm] = useState(emptyIncome);
  const [scheduleChange, setScheduleChange] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);

  const computedAnnual = form.incomeType === 'hourly'
    ? round2((form.hourlyRate ?? 0) * (form.hoursPerWeek ?? 0) * 52)
    : form.grossAnnual;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const toSave: Omit<IncomeSource, 'id'> = { ...form, grossAnnual: computedAnnual };
    if (!scheduleChange) {
      delete toSave.scheduledHoursPerWeek;
      delete toSave.scheduledHoursDate;
    }
    if (!hasEndDate) delete toSave.endDate;
    await db.incomes.add(toSave);
    setForm(emptyIncome);
    setScheduleChange(false);
    setHasEndDate(false);
  }

  return (
    <form onSubmit={handleSubmit} className="income-form">
      <div className="form-grid">
        <label className="field-label">
          Source name
          <input
            placeholder="e.g. Primary job"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>

        <label className="field-label">
          Type
          <select
            value={form.incomeType}
            onChange={(e) => setForm({ ...form, incomeType: e.target.value as IncomeType })}
          >
            <option value="salary">Salary</option>
            <option value="hourly">Hourly</option>
          </select>
        </label>

        {form.incomeType === 'salary' ? (
          <label className="field-label">
            Gross annual salary ($)
            <input
              type="number"
              value={form.grossAnnual || ''}
              onChange={(e) => setForm({ ...form, grossAnnual: Number(e.target.value) })}
              required
            />
          </label>
        ) : (
          <>
            <label className="field-label">
              Hourly rate ($)
              <input
                type="number"
                step="0.01"
                value={form.hourlyRate || ''}
                onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })}
                required
              />
            </label>
            <label className="field-label">
              Current hours per week
              <input
                type="number"
                value={form.hoursPerWeek || ''}
                onChange={(e) => setForm({ ...form, hoursPerWeek: Number(e.target.value) })}
                required
              />
            </label>
            <div className="computed-hint-block">
              <span className="stat-label">Computed annual</span>
              <span className="computed-hint">${computedAnnual.toLocaleString()}/yr</span>
            </div>
          </>
        )}

        <label className="field-label">
          Pay frequency
          <select
            value={form.payFrequency}
            onChange={(e) => setForm({ ...form, payFrequency: e.target.value as PayFrequency })}
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="semimonthly">Semimonthly</option>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </label>

        <label className="field-label">
          Pre-tax deductions (% of gross)
          <input
            type="number"
            placeholder="e.g. 401k contribution %"
            value={form.preTaxDeductionPercent || ''}
            onChange={(e) => setForm({ ...form, preTaxDeductionPercent: Number(e.target.value) })}
          />
        </label>

        <label className="field-label">
          Start date
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            required
          />
        </label>
      </div>

      {form.incomeType === 'hourly' && (
        <div className="form-section">
          <label className="checkbox-label">
            <input type="checkbox" checked={scheduleChange} onChange={(e) => setScheduleChange(e.target.checked)} />
            Hours will change on a known future date
          </label>
          {scheduleChange && (
            <div className="form-grid">
              <label className="field-label">
                New hours start on
                <input
                  type="date"
                  value={form.scheduledHoursDate ?? ''}
                  onChange={(e) => setForm({ ...form, scheduledHoursDate: e.target.value })}
                />
              </label>
              <label className="field-label">
                New hours per week
                <input
                  type="number"
                  placeholder="e.g. 20"
                  value={form.scheduledHoursPerWeek ?? ''}
                  onChange={(e) => setForm({ ...form, scheduledHoursPerWeek: Number(e.target.value) })}
                />
              </label>
            </div>
          )}
        </div>
      )}

      <div className="form-section">
        <label className="checkbox-label">
          <input type="checkbox" checked={hasEndDate} onChange={(e) => setHasEndDate(e.target.checked)} />
          This income has a known end date
        </label>
        {hasEndDate && (
          <div className="form-grid">
            <label className="field-label">
              Ends on
              <input
                type="date"
                value={form.endDate ?? ''}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </label>
          </div>
        )}
      </div>

      <button type="submit" className="btn-primary">Add Income</button>
    </form>
  );
}

export function IncomeList() {
  const incomes = useLiveQuery(() => db.incomes.toArray(), []);
  const taxProfile = useLiveQuery(() => db.taxProfiles.toCollection().last(), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editHours, setEditHours] = useState('');
  const [editScheduledHours, setEditScheduledHours] = useState('');
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  if (!incomes || !taxProfile) return <p>Loading…</p>;
  if (incomes.length === 0) return <p className="empty-state">No income sources yet — add one above.</p>;

  function startEdit(income: IncomeSource) {
    setEditingId(income.id!);
    setEditHours(String(income.hoursPerWeek ?? ''));
    setEditScheduledHours(income.scheduledHoursPerWeek !== undefined ? String(income.scheduledHoursPerWeek) : '');
    setEditScheduledDate(income.scheduledHoursDate ?? '');
    setEditStartDate(income.startDate ?? '');
    setEditEndDate(income.endDate ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditHours('');
    setEditScheduledHours('');
    setEditScheduledDate('');
    setEditStartDate('');
    setEditEndDate('');
  }

  async function saveEdit(income: IncomeSource) {
    if (!income.id) return;
    const updates: Partial<IncomeSource> = {
      scheduledHoursPerWeek: editScheduledHours ? Number(editScheduledHours) : undefined,
      scheduledHoursDate: editScheduledDate || undefined,
      startDate: editStartDate || income.startDate,
      endDate: editEndDate || undefined,
    };
    if (income.incomeType === 'hourly' && income.hourlyRate) {
      const hours = Number(editHours);
      if (hours) {
        const updated = withHoursPerWeek(income, hours);
        updates.hoursPerWeek = updated.hoursPerWeek;
        updates.grossAnnual = updated.grossAnnual;
      }
    }
    await db.incomes.update(income.id, updates);
    cancelEdit();
  }

  const today = new Date();

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Source</th>
          <th>Type</th>
          <th>Gross annual</th>
          <th>Est. net monthly</th>
          <th>Effective tax rate</th>
          <th>Timeline</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {incomes.map((income) => {
          const display = currentIncomeAsOf(income);
          const result = estimateTakeHomePay(display, taxProfile);
          const isEditing = editingId === income.id;
          const notStartedYet = new Date(income.startDate) > today;
          const ended = income.endDate && new Date(income.endDate) < today;
          const timelineNotes: string[] = [];
          if (notStartedYet) timelineNotes.push(`Starts ${income.startDate}`);
          if (income.incomeType === 'hourly' && income.scheduledHoursDate && income.scheduledHoursPerWeek !== undefined) {
            timelineNotes.push(`${income.hoursPerWeek} → ${income.scheduledHoursPerWeek} hrs from ${income.scheduledHoursDate}`);
          }
          if (income.endDate) timelineNotes.push(`Ends ${income.endDate}`);

          return (
            <tr key={income.id} className={ended || notStartedYet ? 'deferred-row' : ''}>
              <td>{income.name}</td>
              <td className="cap">
                {income.incomeType === 'hourly' ? `Hourly — $${income.hourlyRate}/hr` : 'Salary'}
              </td>
              <td className="num">${display.grossAnnual.toLocaleString()}</td>
              <td className="num">${result.netMonthly.toLocaleString()}</td>
              <td className="num">{result.effectiveTaxRate}%</td>
              <td>
                {timelineNotes.length > 0
                  ? timelineNotes.map((note, i) => <div key={i}>{note}</div>)
                  : '—'}
              </td>
              <td>
                {isEditing ? (
                  <div className="inline-edit-block">
                    <label className="field-label">
                      Start date
                      <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                    </label>
                    {income.incomeType === 'hourly' && (
                      <label className="field-label">
                        Current hours/wk
                        <input type="number" value={editHours} onChange={(e) => setEditHours(e.target.value)} className="inline-add-input" />
                      </label>
                    )}
                    {income.incomeType === 'hourly' && (
                      <>
                        <label className="field-label">
                          Change to hours/wk (optional)
                          <input type="number" value={editScheduledHours} onChange={(e) => setEditScheduledHours(e.target.value)} className="inline-add-input" />
                        </label>
                        <label className="field-label">
                          Starting on
                          <input type="date" value={editScheduledDate} onChange={(e) => setEditScheduledDate(e.target.value)} />
                        </label>
                      </>
                    )}
                    <label className="field-label">
                      Ends on (optional)
                      <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
                    </label>
                    <span>
                      <button className="btn-link view" onClick={() => saveEdit(income)}>Save</button>
                      <button className="btn-link delete" onClick={cancelEdit}>Cancel</button>
                    </span>
                  </div>
                ) : (
                  <button className="btn-link view" onClick={() => startEdit(income)}>Edit</button>
                )}
                <button className="btn-link delete" onClick={() => db.incomes.delete(income.id!)}>Delete</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}