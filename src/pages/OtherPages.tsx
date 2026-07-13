import { useState } from 'react';
import { useBudgetData } from '../data/useBudgetData';
import { db, ensureDefaultTaxProfile } from '../data/db';
import { LoanForm, LoanList } from '../components/LoanSection';
import { AmortizationDetail } from '../components/AmortizationDetail';
import { IncomeForm, IncomeList } from '../components/IncomeSection';
import { TaxBreakdown } from '../components/TaxBreakdown';
import { ExpenseForm, ExpenseList, CSVImport } from '../components/ExpenseSection';
import { CreditScoreForm, CreditScoreChart } from '../components/CreditScoreSection';
import { ScenarioPanel } from '../components/ScenarioPanel';
import { AssetForm, AssetList, NetWorthChart } from '../components/AssetSection';
import { totalAssetBalance } from '../calc/assetCalc';
import { currentIncomes, blendedIncomes, withHoursPerWeek } from '../calc/incomeCalc';
import { buildSnapshot } from '../selectors/selectors';
import type { TaxProfile, IncomeSource, Loan, Expense, CreditScoreEntry, RecurringTemplate, Asset, NetWorthSnapshot } from '../types';

export function LoansPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const { loans } = useBudgetData();
  const selectedLoan = loans.find((l) => l.id === selected);

  return (
    <div className="page">
      <div className="card"><h3>Add a loan</h3><LoanForm /></div>
      <div className="card"><h3>Your loans</h3><LoanList onSelect={setSelected} /></div>
      {selectedLoan && (
        <div className="card"><h3>{selectedLoan.name} — amortization</h3><AmortizationDetail loan={selectedLoan} /></div>
      )}
    </div>
  );
}

export function IncomePage() {
  const { loans, incomes, expenses, assets, taxProfile, loading } = useBudgetData();
  if (loading || !taxProfile) {
    return (
      <div className="page">
        <div className="card"><h3>Add income source</h3><IncomeForm /></div>
        <div className="card"><h3>Your income</h3><p>Loading…</p></div>
      </div>
    );
  }

  const totalAssets = totalAssetBalance(assets);
  const todaysIncomes = currentIncomes(incomes);
  const annualIncomesForTax = blendedIncomes(incomes);
  const scheduled = incomes.filter(
    (i): i is IncomeSource & { scheduledHoursDate: string; scheduledHoursPerWeek: number } =>
      i.incomeType === 'hourly' && !!i.scheduledHoursDate && i.scheduledHoursPerWeek !== undefined
  );

  return (
    <div className="page">
      <div className="card"><h3>Add income source</h3><IncomeForm /></div>
      <div className="card"><h3>Your income</h3><IncomeList /></div>

      {scheduled.length > 0 && (
        <div className="card">
          <h3>Upcoming change</h3>
          {scheduled.map((income) => {
            const hasArrived = new Date(income.scheduledHoursDate) <= new Date();
            const beforeIncomes = todaysIncomes.map((i) => (i.id === income.id ? income : i));
            const afterIncomes = todaysIncomes.map((i) =>
              i.id === income.id ? withHoursPerWeek(income, income.scheduledHoursPerWeek) : i
            );
            const before = buildSnapshot(loans, beforeIncomes, expenses, taxProfile, totalAssets);
            const after = buildSnapshot(loans, afterIncomes, expenses, taxProfile, totalAssets);
            return (
              <div key={income.id} className="scenario-compare">
                <div className="scenario-column">
                  <h4>{income.hoursPerWeek} hrs/wk (now)</h4>
                  <p>Net monthly income: ${before.netMonthlyIncome.toLocaleString()}</p>
                  <p>Cash flow: ${before.monthlyCashFlow.toLocaleString()}/mo</p>
                  <p>DTI: {before.dti}%</p>
                </div>
                <div className="scenario-column scenario-highlight">
                  <h4>{income.scheduledHoursPerWeek} hrs/wk (from {income.scheduledHoursDate})</h4>
                  <p>Net monthly income: ${after.netMonthlyIncome.toLocaleString()}</p>
                  <p>Cash flow: ${after.monthlyCashFlow.toLocaleString()}
                    <span className={after.monthlyCashFlow >= before.monthlyCashFlow ? 'positive' : 'negative'}>
                      {' '}({after.monthlyCashFlow >= before.monthlyCashFlow ? '+' : ''}
                      {(after.monthlyCashFlow - before.monthlyCashFlow).toLocaleString()})
                    </span>
                  </p>
                  <p>DTI: {after.dti}%</p>
                </div>
                {hasArrived && <p className="muted">This date has passed — the dashboard is already using these hours.</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <h3>Tax breakdown</h3>
        <p className="muted">
          This uses your blended annual income — if your hours are scheduled to change partway through
          the year, this combines both rates into one real annual total for tax purposes, unlike the
          "right now" cash flow numbers elsewhere which use your current rate.
        </p>
        <TaxBreakdown incomes={annualIncomesForTax} taxProfile={taxProfile} />
      </div>
    </div>
  );
}

export function ExpensesPage() {
  return (
    <div className="page">
      <div className="card"><h3>Log an expense</h3><ExpenseForm /></div>
      <div className="card"><h3>Import from CSV</h3><CSVImport /></div>
      <div className="card"><h3>Recent expenses</h3><ExpenseList /></div>
    </div>
  );
}

export function CreditPage() {
  return (
    <div className="page">
      <div className="card"><h3>Log a credit score</h3><CreditScoreForm /></div>
      <div className="card"><h3>Trend</h3><CreditScoreChart /></div>
    </div>
  );
}

export function AssetsPage() {
  return (
    <div className="page">
      <div className="card"><h3>Add an account</h3><AssetForm /></div>
      <div className="card"><h3>Your accounts</h3><AssetList /></div>
      <div className="card"><h3>Net worth trend</h3><NetWorthChart /></div>
    </div>
  );
}

export function ScenariosPage() {
  const { loans, incomes, expenses, assets, taxProfile, loading } = useBudgetData();
  if (loading || !taxProfile) return <p>Loading…</p>;
  const totalAssets = totalAssetBalance(assets);
  const todaysIncomes = currentIncomes(incomes);

  return (
    <div className="page">
      <div className="card">
        <h3>What-if scenarios</h3>
        <p className="muted">
          Adjust the sliders to see the effect on your finances. Nothing here changes your real data.
        </p>
        <ScenarioPanel loans={loans} incomes={todaysIncomes} expenses={expenses} taxProfile={taxProfile} assets={totalAssets} />
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { taxProfile, loading } = useBudgetData();
  const [form, setForm] = useState<TaxProfile | null>(null);
  const [importStatus, setImportStatus] = useState('');
  const profile = form ?? taxProfile;

  if (loading || !profile) return <p>Loading…</p>;

  async function save() {
    if (!profile?.id) return;
    await db.taxProfiles.put(profile);
    setForm(null);
  }

  async function exportData() {
    const data = {
      loans: await db.loans.toArray(),
      incomes: await db.incomes.toArray(),
      expenses: await db.expenses.toArray(),
      creditScores: await db.creditScores.toArray(),
      taxProfiles: await db.taxProfiles.toArray(),
      templates: await db.templates.toArray(),
      assets: await db.assets.toArray(),
      netWorthSnapshots: await db.netWorthSnapshots.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function stripIds<T extends { id?: number }>(arr: T[] | undefined): Omit<T, 'id'>[] {
    if (!arr) return [];
    return arr.map(({ id, ...rest }) => rest);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();

    interface BackupShape {
      loans?: Loan[];
      incomes?: IncomeSource[];
      expenses?: Expense[];
      creditScores?: CreditScoreEntry[];
      taxProfiles?: TaxProfile[];
      templates?: RecurringTemplate[];
      assets?: Asset[];
      netWorthSnapshots?: NetWorthSnapshot[];
    }

    let data: BackupShape;
    try {
      data = JSON.parse(text) as BackupShape;
    } catch {
      setImportStatus('That file isn\'t valid JSON — import cancelled.');
      e.target.value = '';
      return;
    }
    const confirmed = window.confirm(
      'This replaces all current data in this browser with the contents of the backup file. This cannot be undone. Continue?'
    );
    if (!confirmed) {
      e.target.value = '';
      return;
    }

    await db.transaction(
      'rw',
      [db.loans, db.incomes, db.expenses, db.creditScores, db.taxProfiles, db.templates, db.assets, db.netWorthSnapshots],
      async () => {
        await Promise.all([
          db.loans.clear(),
          db.incomes.clear(),
          db.expenses.clear(),
          db.creditScores.clear(),
          db.taxProfiles.clear(),
          db.templates.clear(),
          db.assets.clear(),
          db.netWorthSnapshots.clear(),
        ]);
        if (data.loans) await db.loans.bulkAdd(stripIds(data.loans));
        if (data.incomes) await db.incomes.bulkAdd(stripIds(data.incomes));
        if (data.expenses) await db.expenses.bulkAdd(stripIds(data.expenses));
        if (data.creditScores) await db.creditScores.bulkAdd(stripIds(data.creditScores));
        if (data.taxProfiles) await db.taxProfiles.bulkAdd(stripIds(data.taxProfiles));
        if (data.templates) await db.templates.bulkAdd(stripIds(data.templates));
        if (data.assets) await db.assets.bulkAdd(stripIds(data.assets));
        if (data.netWorthSnapshots) await db.netWorthSnapshots.bulkAdd(stripIds(data.netWorthSnapshots));
        await ensureDefaultTaxProfile();
      }
    );
    setImportStatus(`Restored backup from ${file.name}. Reload the page if anything looks stale.`);
    e.target.value = '';
  }

  return (
    <div className="page">
      <div className="card">
        <h3>Tax profile</h3>
        <p className="muted">
          Federal brackets, standard deduction, and FICA rate change yearly — update these to match the
          current tax year rather than relying on the defaults.
        </p>
        <div className="form-grid">
          <label>
            Filing status
            <select
              value={profile.filingStatus}
              onChange={(e) => setForm({ ...profile, filingStatus: e.target.value as TaxProfile['filingStatus'] })}
            >
              <option value="single">Single</option>
              <option value="married_joint">Married filing jointly</option>
              <option value="married_separate">Married filing separately</option>
              <option value="head_of_household">Head of household</option>
            </select>
          </label>
          <label>
            Standard deduction ($)
            <input
              type="number"
              value={profile.standardDeduction}
              onChange={(e) => setForm({ ...profile, standardDeduction: Number(e.target.value) })}
            />
          </label>
          <label>
            FICA rate (decimal, e.g. 0.0765)
            <input
              type="number"
              step="0.0001"
              value={profile.ficaRate}
              onChange={(e) => setForm({ ...profile, ficaRate: Number(e.target.value) })}
            />
          </label>
          <label>
            State flat tax rate estimate (decimal, e.g. 0.05, or 0 for no state tax)
            <input
              type="number"
              step="0.001"
              value={profile.stateFlatRate ?? 0}
              onChange={(e) => setForm({ ...profile, stateFlatRate: Number(e.target.value) })}
            />
          </label>
        </div>
        <button className="btn-primary" onClick={save}>Save tax profile</button>
      </div>

      <div className="card">
        <h3>Backup</h3>
        <p className="muted">Everything is stored locally in this browser only. Export a backup regularly.</p>
        <button className="btn-secondary" onClick={exportData}>Export JSON backup</button>
        <div className="import-block">
          <label className="btn-secondary">
            Import JSON backup
            <input type="file" accept=".json,application/json" onChange={handleImportFile} hidden />
          </label>
          <p className="muted">Importing replaces everything currently stored in this browser.</p>
          {importStatus && <p className="import-status">{importStatus}</p>}
        </div>
      </div>
    </div>
  );
}
