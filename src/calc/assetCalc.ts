import type { Asset } from '../types';
import { round2 } from './loanCalc';

export function totalAssetBalance(assets: Asset[]): number {
  return round2(assets.reduce((sum, a) => sum + a.balance, 0));
}

export function assetsByCategory(assets: Asset[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const a of assets) {
    result[a.category] = round2((result[a.category] ?? 0) + a.balance);
  }
  return result;
}
