import { useState } from 'react';
import type { IncomeSource, TaxProfile } from '../types';
import { combinedTaxBreakdown, federalTaxOnAdditionalIncome } from '../calc/taxCalc';

export function TaxBreakdown({ incomes, taxProfile }: { incomes: IncomeSource[]; taxProfile: TaxProfile }) {
  const [additional, setAdditional] = useState(0);
  const result = combinedTaxBreakdown(incomes, taxProfile);
  const additionalTax = federalTaxOnAdditionalIncome(result.totalTaxableIncome, additional, taxProfile.federalBrackets);

  if (incomes.length === 0) {
    return <p className="empty-state">Add an income source to see your tax breakdown.</p>;
  }

  return (
    <div>
      <p className="muted">
        This combines all your income sources into one taxable total and runs it through the actual
        federal bracket table together — so adding a second income source correctly shows it pushing
        you into higher brackets, rather than taxing each source as if it existed alone.
      </p>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-label">Total taxable income</span>
          <span className="stat-value">${result.totalTaxableIncome.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Marginal rate (next $)</span>
          <span className="stat-value">{result.marginalRatePercent}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Effective rate</span>
          <span className="stat-value">{result.effectiveRatePercent}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Net monthly (all sources)</span>
          <span className="stat-value">${result.netMonthly.toLocaleString()}</span>
        </div>
      </div>

      <h4 className="section-heading">Bracket-by-bracket breakdown</h4>
      <table className="data-table">
        <thead>
          <tr>
            <th>Rate</th>
            <th>Income range</th>
            <th>Amount taxed at this rate</th>
            <th>Tax owed</th>
          </tr>
        </thead>
        <tbody>
          {result.brackets.map((b, i) => (
            <tr key={i}>
              <td className="num">{(b.rate * 100).toFixed(0)}%</td>
              <td className="num">${b.from.toLocaleString()} – ${b.to.toLocaleString()}</td>
              <td className="num">${b.amountTaxed.toLocaleString()}</td>
              <td className="num">${b.taxOwed.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="section-heading">Tax breakdown summary</h4>
      <div className="cashflow-summary">
        <div className="cashflow-row"><span>Total gross income</span><span className="num">${result.totalGrossAnnual.toLocaleString()}</span></div>
        <div className="cashflow-row"><span>Pre-tax deductions</span><span className="num">-${result.totalPreTaxDeductions.toLocaleString()}</span></div>
        <div className="cashflow-row"><span>Federal income tax</span><span className="num">-${result.federalTaxTotal.toLocaleString()}</span></div>
        <div className="cashflow-row"><span>FICA (Social Security + Medicare)</span><span className="num">-${result.ficaTotal.toLocaleString()}</span></div>
        <div className="cashflow-row"><span>State tax (flat estimate)</span><span className="num">-${result.stateTaxTotal.toLocaleString()}</span></div>
        <div className="cashflow-row cashflow-total"><span>Net annual take-home</span><span className="num positive">${result.netAnnual.toLocaleString()}</span></div>
      </div>

      <h4 className="section-heading">What if you earn more?</h4>
      <p className="muted">
        See how much of an additional raise, bonus, or side income actually gets taxed at your marginal
        rate — and whether it's enough to push you into the next bracket.
      </p>
      <label className="field-label">
        Additional annual income: <strong>${additional.toLocaleString()}</strong>
        <input
          type="range"
          min={0}
          max={50000}
          step={500}
          value={additional}
          onChange={(e) => setAdditional(Number(e.target.value))}
        />
      </label>
      {additional > 0 && (
        <p className="muted">
          An extra ${additional.toLocaleString()}/yr would cost about <strong>${additionalTax.toLocaleString()}</strong> in
          federal tax ({round1((additionalTax / additional) * 100)}% of that additional income), leaving roughly{' '}
          <strong>${(additional - additionalTax).toLocaleString()}</strong> more take-home per year.
        </p>
      )}

      <p className="muted">
        These numbers are estimates only — federal brackets, the standard deduction, and FICA rates change
        yearly and are editable in Settings. This model doesn't account for tax credits, itemized
        deductions, or state bracket structures (state tax here is a flat-rate estimate).
      </p>
    </div>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
