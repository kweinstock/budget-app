import { useState } from 'react';
import { db } from '../data/db';
import type { ExpenseCategory } from '../types';

const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  housing: ['rent', 'mortgage'],
  food: ['grocer', 'food', 'restaurant', 'coffee', 'lunch', 'dinner'],
  transportation: ['gas', 'uber', 'lyft', 'transit', 'parking', 'car'],
  utilities: ['electric', 'water', 'internet', 'phone', 'utility'],
  insurance: ['insurance'],
  entertainment: ['movie', 'game', 'subscription', 'netflix', 'spotify'],
  health: ['doctor', 'pharmacy', 'health', 'gym'],
  debt: ['loan', 'payment', 'credit card'],
  other: [],
};

function guessCategory(text: string): ExpenseCategory {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [ExpenseCategory, string[]][]) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return 'other';
}

/** Parses free text like "$45 groceries" or "45 groceries today" into an amount + label. */
function parseQuickAdd(input: string): { amount: number; label: string } | null {
  const match = input.match(/\$?(\d+(\.\d{1,2})?)/);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  const label = input.replace(match[0], '').trim().replace(/^(for|on)\s+/i, '') || 'Expense';
  return { amount, label };
}

export function QuickAdd() {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseQuickAdd(text);
    if (!parsed) {
      setError('Include a dollar amount, e.g. "$45 groceries"');
      return;
    }
    setError('');
    await db.expenses.add({
      label: parsed.label,
      category: guessCategory(text),
      amount: parsed.amount,
      date: new Date().toISOString().slice(0, 10),
      recurring: false,
    });
    setText('');
  }

  return (
    <form onSubmit={handleSubmit} className="quick-add">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Quick add — e.g. "$45 groceries"'
        className="quick-add-input"
      />
      <button type="submit" className="btn-primary">Add</button>
      {error && <span className="quick-add-error">{error}</span>}
    </form>
  );
}
