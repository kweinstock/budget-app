import { db } from './db';

export async function recordNetWorthSnapshot(totalAssets: number, totalDebt: number) {
  const today = new Date().toISOString().slice(0, 10);
  const netWorth = Math.round((totalAssets - totalDebt) * 100) / 100;
  const existing = await db.netWorthSnapshots.where('date').equals(today).first();
  if (existing) {
    await db.netWorthSnapshots.update(existing.id!, { totalAssets, totalLiabilities: totalDebt, netWorth });
  } else {
    await db.netWorthSnapshots.add({ date: today, totalAssets, totalLiabilities: totalDebt, netWorth });
  }
}
