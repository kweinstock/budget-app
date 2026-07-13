import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { Expense, ExpenseCategory, RecurringTemplate } from '../types';

const CATEGORIES: ExpenseCategory[] = [
  'housing', 'food', 'transportation', 'utilities', 'insurance', 'entertainment', 'health', 'debt', 'other',
];

const emptyExpense: Omit<Expense, 'id'> = {
  label: '',
  category: 'other',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  recurring: false,
};

export function ExpenseForm() {
  const [form, setForm] = useState(emptyExpense);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await db.expenses.add(form);
    if (saveAsTemplate) {
      await db.templates.add({
        label: form.label,
        category: form.category,
        amount: form.amount,
        type: 'expense',
      });
    }
    setForm(emptyExpense);
    setSaveAsTemplate(false);
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <input
        placeholder="Label (e.g. Rent)"
        value={form.label}
        onChange={(e) => setForm({ ...form, label: e.target.value })}
        required
      />
      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="number"
        placeholder="Amount ($)"
        value={form.amount || ''}
        onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
        required
      />
      <input
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
      />
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={form.recurring}
          onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
        />
        Recurring
      </label>
      {form.recurring && (
        <select
          value={form.frequency ?? 'monthly'}
          onChange={(e) => setForm({ ...form, frequency: e.target.value as Expense['frequency'] })}
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="annual">Annual</option>
        </select>
      )}
      <label className="checkbox-label">
        <input type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />
        Save as quick-add template
      </label>
      <button type="submit" className="btn-primary">Add Expense</button>
    </form>
  );
}

export function TemplateBar() {
  const templates = useLiveQuery(() => db.templates.where('type').equals('expense').toArray(), []) ?? [];

  if (templates.length === 0) return null;

  async function logTemplate(t: RecurringTemplate) {
    await db.expenses.add({
      label: t.label,
      category: t.category,
      amount: t.amount,
      date: new Date().toISOString().slice(0, 10),
      recurring: true,
      frequency: 'monthly',
    });
  }

  return (
    <div className="template-bar">
      {templates.map((t) => (
        <button key={t.id} className="template-chip" onClick={() => logTemplate(t)}>
          + {t.label} (${t.amount})
        </button>
      ))}
    </div>
  );
}

export function ExpenseList() {
  const expenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray(), []);

  if (!expenses) return <p>Loading…</p>;
  if (expenses.length === 0) return <p className="empty-state">No expenses logged yet.</p>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Label</th>
          <th>Category</th>
          <th>Amount</th>
          <th>Recurring</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {expenses.slice(0, 25).map((exp) => (
          <tr key={exp.id}>
            <td>{exp.date}</td>
            <td>{exp.label}</td>
            <td className="cap">{exp.category}</td>
            <td className="num">${exp.amount.toLocaleString()}</td>
            <td>{exp.recurring ? exp.frequency ?? 'monthly' : '—'}</td>
            <td>
              <button className="btn-link delete" onClick={() => db.expenses.delete(exp.id!)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Local file read only — no upload, no network call. */
export function CSVImport() {
  const [status, setStatus] = useState('');

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result as string;
      const lines = text.split('\n').filter(Boolean);
      const rows = lines.slice(1); // assume header row: date,label,amount,category
      let imported = 0;
      for (const line of rows) {
        const [date, label, amountStr, category] = line.split(',').map((s) => s.trim());
        const amount = parseFloat(amountStr);
        if (!date || !label || isNaN(amount)) continue;
        await db.expenses.add({
          date,
          label,
          amount,
          category: (CATEGORIES.includes(category as ExpenseCategory) ? category : 'other') as ExpenseCategory,
          recurring: false,
        });
        imported++;
      }
      setStatus(`Imported ${imported} expenses from ${file.name}.`);
    };
    reader.readAsText(file);
  }

  return (
    <div className="csv-import">
      <label className="btn-secondary">
        Import CSV (date,label,amount,category)
        <input type="file" accept=".csv" onChange={handleFile} hidden />
      </label>
      {status && <p className="import-status">{status}</p>}
    </div>
  );
}
