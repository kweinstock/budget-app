import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { db } from '../data/db';
import type { CreditScoreEntry } from '../types';

const emptyEntry: Omit<CreditScoreEntry, 'id'> = {
  date: new Date().toISOString().slice(0, 10),
  score: 700,
  bureau: 'Experian',
};

export function CreditScoreForm() {
  const [form, setForm] = useState(emptyEntry);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await db.creditScores.add(form);
    setForm({ ...emptyEntry, date: new Date().toISOString().slice(0, 10) });
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <input
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
      />
      <input
        type="number"
        placeholder="Score"
        value={form.score || ''}
        onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
        min={300}
        max={850}
        required
      />
      <select value={form.bureau} onChange={(e) => setForm({ ...form, bureau: e.target.value as CreditScoreEntry['bureau'] })}>
        <option value="Experian">Experian</option>
        <option value="Equifax">Equifax</option>
        <option value="TransUnion">TransUnion</option>
        <option value="Other">Other</option>
      </select>
      <button type="submit" className="btn-primary">Log Score</button>
    </form>
  );
}

export function CreditScoreChart() {
  const entries = useLiveQuery(() => db.creditScores.orderBy('date').toArray(), []) ?? [];

  if (entries.length === 0) return <p className="empty-state">No credit score history yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={entries}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis domain={[300, 850]} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
