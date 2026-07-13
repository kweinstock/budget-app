import { useState } from 'react';
import type { Loan, IncomeSource, Expense, TaxProfile } from '../types';
import { buildSnapshot } from '../selectors/selectors';
import { runScenario, compareToBaseline } from '../scenarios/scenario';
import { monthsToDateLabel } from '../calc/projections';

interface Props {
  loans: Loan[];
  incomes: IncomeSource[];
  expenses: Expense[];
  taxProfile: TaxProfile;
  assets?: number;
}

export function ScenarioPanel({ loans, incomes, expenses, taxProfile, assets = 0 }: Props) {
  const hourlyIncome = incomes.find((i) => i.incomeType === 'hourly');
  const [extraPayment, setExtraPayment] = useState(0);
  const [incomeChange, setIncomeChange] = useState(0);
  const [newExpense, setNewExpense] = useState(0);
  const [hoursPerWeek, setHoursPerWeek] = useState(hourlyIncome?.hoursPerWeek ?? 40);

  const baseline = buildSnapshot(loans, incomes, expenses, taxProfile, assets);
  const scenario = runScenario(
    {
      extraLoanPaymentTotal: extraPayment,
      incomeChangePercent: incomeChange,
      newMonthlyExpense: newExpense,
      ...(hourlyIncome ? { hoursPerWeekOverride: hoursPerWeek } : {}),
    },
    loans, incomes, expenses, taxProfile, assets
  );
  const diff = compareToBaseline(baseline, scenario);

  return (
    <div className="scenario-panel">
      <div className="scenario-controls">
        {hourlyIncome && (
          <label>
            Hours per week ({hourlyIncome.name}): <strong>{hoursPerWeek} hrs — ${((hourlyIncome.hourlyRate ?? 0) * hoursPerWeek * 52).toLocaleString()}/yr</strong>
            <input type="range" min={0} max={60} step={1} value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))} />
          </label>
        )}
        <label>
          Extra monthly loan payment: <strong>${extraPayment}</strong>
          <input type="range" min={0} max={1000} step={25} value={extraPayment}
            onChange={(e) => setExtraPayment(Number(e.target.value))} />
        </label>
        <label>
          Income change (additional %, on top of hours): <strong>{incomeChange > 0 ? '+' : ''}{incomeChange}%</strong>
          <input type="range" min={-30} max={30} step={1} value={incomeChange}
            onChange={(e) => setIncomeChange(Number(e.target.value))} />
        </label>
        <label>
          New monthly expense: <strong>${newExpense}</strong>
          <input type="range" min={0} max={1000} step={25} value={newExpense}
            onChange={(e) => setNewExpense(Number(e.target.value))} />
        </label>
      </div>

      <div className="scenario-compare">
        <div className="scenario-column">
          <h4>Baseline</h4>
          <p>Cash flow: ${baseline.monthlyCashFlow.toLocaleString()}/mo</p>
          <p>Debt-free in: {monthsToDateLabel(baseline.debtFreeMonths)}</p>
          <p>Net worth: ${baseline.netWorth.toLocaleString()}</p>
          <p>DTI: {baseline.dti}%</p>
        </div>
        <div className="scenario-column scenario-highlight">
          <h4>Scenario</h4>
          <p>Cash flow: ${scenario.monthlyCashFlow.toLocaleString()}/mo
            <span className={diff.cashFlowDelta >= 0 ? 'positive' : 'negative'}>
              {' '}({diff.cashFlowDelta >= 0 ? '+' : ''}{diff.cashFlowDelta})
            </span>
          </p>
          <p>Debt-free in: {monthsToDateLabel(scenario.debtFreeMonths)}
            {diff.debtFreeMonthsDelta > 0 && <span className="positive"> ({diff.debtFreeMonthsDelta} mo sooner)</span>}
          </p>
          <p>Net worth: ${scenario.netWorth.toLocaleString()}</p>
          <p>DTI: {scenario.dti}%
            <span className={diff.dtiDelta <= 0 ? 'positive' : 'negative'}>
              {' '}({diff.dtiDelta >= 0 ? '+' : ''}{diff.dtiDelta})
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
