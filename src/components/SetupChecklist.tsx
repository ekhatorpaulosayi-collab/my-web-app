import { CheckCircle2, Circle } from 'lucide-react';
import { Button } from './ui/Button';

type Step = { id: string; label: string; done: boolean; action?: string; onClick?: () => void };

export function SetupChecklist({
  profileComplete,
  hasItems,
  hasSales,
  hasPayments,
  onProfile,
  onAddItem,
  onRecordSale,
  onPayments,
  onDismiss,
}: {
  profileComplete: boolean;
  hasItems: boolean;
  hasSales: boolean;
  hasPayments: boolean;
  onProfile: () => void;
  onAddItem: () => void;
  onRecordSale: () => void;
  onPayments: () => void;
  onDismiss: () => void;
}) {
  const steps: Step[] = [
    { id: 'profile', label: 'Add your business name', done: profileComplete, action: 'Set up', onClick: onProfile },
    { id: 'item', label: 'Add your first item', done: hasItems, action: 'Add item', onClick: onAddItem },
    { id: 'sale', label: 'Record a sale', done: hasSales, action: 'Record sale', onClick: onRecordSale },
    { id: 'pay', label: 'Add a way for customers to pay', done: hasPayments, action: 'Payments', onClick: onPayments },
  ];
  if (steps.every((step) => step.done)) return null;

  return (
    <section className="ds-card setup-checklist" aria-label="Setup checklist">
      <div className="ds-card-head">
        <h2>Finish setting up</h2>
        <Button variant="ghost" size="sm" onClick={onDismiss}>Dismiss</Button>
      </div>
      <p style={{ margin: 0, color: '#475569' }}>Four steps. You can sell before all of them are done.</p>
      <ol>
        {steps.map((step) => (
          <li key={step.id}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {step.done ? <CheckCircle2 size={20} color="#15803d" aria-hidden="true" /> : <Circle size={20} color="#475569" aria-hidden="true" />}
              <span style={{ color: step.done ? '#475569' : '#0f172a' }}>{step.label}</span>
            </span>
            {!step.done && step.onClick && (
              <button type="button" className="linkish" onClick={step.onClick}>{step.action}</button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
