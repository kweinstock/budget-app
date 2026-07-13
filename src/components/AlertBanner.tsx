import { useState } from 'react';
import type { Alert } from '../types';

export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = alerts.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="alert-stack">
      {visible.map((alert) => (
        <div key={alert.id} className={`alert alert-${alert.severity}`}>
          <span>{alert.message}</span>
          <button className="alert-dismiss" onClick={() => setDismissed(new Set([...dismissed, alert.id]))}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
