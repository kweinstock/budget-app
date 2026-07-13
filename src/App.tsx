import { useState } from 'react';
import './App.css';
import { Dashboard } from './pages/Dashboard';
import { LoansPage, IncomePage, ExpensesPage, CreditPage, ScenariosPage, SettingsPage, AssetsPage } from './pages/OtherPages';

type Tab = 'dashboard' | 'assets' | 'loans' | 'income' | 'expenses' | 'credit' | 'scenarios' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'assets', label: 'Assets' },
  { id: 'loans', label: 'Loans' },
  { id: 'income', label: 'Income' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'credit', label: 'Credit Score' },
  { id: 'scenarios', label: 'What-If' },
  { id: 'settings', label: 'Settings' },
];

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">Ledger</h1>
        <p className="app-subtitle">Local-only budget & debt tracker</p>
      </header>

      <nav className="tab-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'assets' && <AssetsPage />}
        {tab === 'loans' && <LoansPage />}
        {tab === 'income' && <IncomePage />}
        {tab === 'expenses' && <ExpensesPage />}
        {tab === 'credit' && <CreditPage />}
        {tab === 'scenarios' && <ScenariosPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
