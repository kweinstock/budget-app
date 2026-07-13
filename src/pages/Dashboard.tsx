import { useEffect } from 'react';
import { useBudgetData } from '../data/useBudgetData';
import { buildSnapshot } from '../selectors/selectors';
import { totalAssetBalance } from '../calc/assetCalc';
import { currentIncomes } from '../calc/incomeCalc';
import { recordNetWorthSnapshot } from '../data/netWorthHistory';
import { StatCards, DebtPayoffChart, CategoryBreakdownChart, CashFlowSummary } from '../components/DashboardCharts';
import { NetWorthChart } from '../components/AssetSection';
import { FinancialTimelineChart } from '../components/FinancialTimelineChart';
import { AlertBanner } from '../components/AlertBanner';
import { QuickAdd } from '../components/QuickAdd';
import { TemplateBar } from '../components/ExpenseSection';

export function Dashboard() {
  const { loans, incomes, expenses, assets, taxProfile, loading } = useBudgetData();
  const totalAssets = totalAssetBalance(assets);
  // "Right now" numbers use current hours as they stand today — a future
  // scheduled change doesn't dilute this month's actual cash flow.
  const todaysIncomes = currentIncomes(incomes);
  const snapshot = taxProfile ? buildSnapshot(loans, todaysIncomes, expenses, taxProfile, totalAssets) : null;

  // Automatically records today's net worth (and assets) so history builds
  // itself — nothing to manually log beyond keeping account balances current.
  useEffect(() => {
    if (snapshot) {
      recordNetWorthSnapshot(snapshot.totalAssets, snapshot.totalDebt);
    }
  }, [snapshot?.totalAssets, snapshot?.totalDebt]);

  if (loading || !taxProfile || !snapshot) return <p>Loading…</p>;

  return (
    <div className="page">
      <AlertBanner alerts={snapshot.alerts.filter((a) => a.severity !== 'info')} />

      <div className="card">
        <QuickAdd />
        <TemplateBar />
      </div>

      <StatCards snapshot={snapshot} />

      <div className="card">
        <h3>Income, debt payments & what you have over time</h3>
        <FinancialTimelineChart
          loans={loans}
          incomes={incomes}
          expenses={expenses}
          taxProfile={taxProfile}
          currentAssets={totalAssets}
        />
      </div>

      <div className="card">
        <h3>Net worth over time</h3>
        <NetWorthChart />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Debt payoff timeline</h3>
          <DebtPayoffChart loans={loans} />
        </div>
        <div className="card">
          <h3>Spending by category</h3>
          <CategoryBreakdownChart snapshot={snapshot} />
        </div>
      </div>

      <div className="card">
        <h3>Monthly cash flow</h3>
        <CashFlowSummary snapshot={snapshot} />
      </div>
    </div>
  );
}
