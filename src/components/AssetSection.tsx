import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { db } from '../data/db';
import type { Asset, AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['cash', 'savings', 'investment', 'retirement', 'property', 'other'];

const emptyAsset: Omit<Asset, 'id'> = {
  name: '',
  category: 'savings',
  balance: 0,
  lastUpdated: new Date().toISOString().slice(0, 10),
};

export function AssetForm() {
  const [form, setForm] = useState(emptyAsset);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await db.assets.add(form);
    setForm(emptyAsset);
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <input
        placeholder="Account name (e.g. Ally Savings)"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as AssetCategory })}>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="number"
        placeholder="Current balance ($)"
        value={form.balance || ''}
        onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
        required
      />
      <button type="submit" className="btn-primary">Add Account</button>
    </form>
  );
}

export function AssetList() {
  const assets = useLiveQuery(() => db.assets.toArray(), []);
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [amount, setAmount] = useState('');

  if (!assets) return <p>Loading…</p>;
  if (assets.length === 0) return <p className="empty-state">No accounts yet — add one above.</p>;

  async function addMoney(asset: Asset) {
    const delta = Number(amount);
    if (!delta || !asset.id) return;
    await db.assets.update(asset.id, {
      balance: round2(asset.balance + delta),
      lastUpdated: new Date().toISOString().slice(0, 10),
    });
    setAddingTo(null);
    setAmount('');
  }

  function round2(n: number) {
    return Math.round(n * 100) / 100;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Account</th>
          <th>Category</th>
          <th>Balance</th>
          <th>Updated</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.id}>
            <td>{asset.name}</td>
            <td className="cap">{asset.category}</td>
            <td className="num">${asset.balance.toLocaleString()}</td>
            <td>{asset.lastUpdated}</td>
            <td>
              {addingTo === asset.id ? (
                <span className="inline-add">
                  <input
                    type="number"
                    autoFocus
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addMoney(asset)}
                    className="inline-add-input"
                  />
                  <button className="btn-link view" onClick={() => addMoney(asset)}>Save</button>
                  <button className="btn-link delete" onClick={() => { setAddingTo(null); setAmount(''); }}>Cancel</button>
                </span>
              ) : (
                <>
                  <button className="btn-link view" onClick={() => setAddingTo(asset.id!)}>+ Add money</button>
                  <button className="btn-link delete" onClick={() => db.assets.delete(asset.id!)}>Delete</button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function NetWorthChart() {
  const snapshots = useLiveQuery(() => db.netWorthSnapshots.orderBy('date').toArray(), []) ?? [];

  if (snapshots.length < 2) {
    return (
      <p className="empty-state">
        Net worth history builds automatically as you use the app — check back after a couple of visits on
        different days to see a trend line.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={snapshots}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
        <Line type="monotone" dataKey="netWorth" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
