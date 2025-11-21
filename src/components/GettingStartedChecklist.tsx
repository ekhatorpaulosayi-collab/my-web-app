/**
 * Getting Started Checklist
 * Shows new users how to set up their store
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';
import '../styles/getting-started.css';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  action: string;
  completed: boolean;
}

interface GettingStartedChecklistProps {
  hasItems: boolean;
  hasSales: boolean;
  hasStoreUrl: boolean;
  onAddItem: () => void;
  onRecordSale: () => void;
  onSetupStore: () => void;
}

export function GettingStartedChecklist({
  hasItems,
  hasSales,
  hasStoreUrl,
  onAddItem,
  onRecordSale,
  onSetupStore
}: GettingStartedChecklistProps) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('storehouse-getting-started-dismissed') === 'true';
  });

  const [showDetails, setShowDetails] = useState(true);

  const handleDismiss = () => {
    localStorage.setItem('storehouse-getting-started-dismissed', 'true');
    setDismissed(true);
  };

  const handleReopen = () => {
    localStorage.setItem('storehouse-getting-started-dismissed', 'false');
    setDismissed(false);
  };

  // Listen for re-enable event
  useEffect(() => {
    const handler = () => handleReopen();
    window.addEventListener('show-getting-started', handler);
    return () => window.removeEventListener('show-getting-started', handler);
  }, []);

  const steps: ChecklistItem[] = [
    {
      id: 'add-items',
      title: 'Add Your Products',
      description: 'Add items you sell so you can track inventory and record sales',
      action: 'Add Item',
      completed: hasItems
    },
    {
      id: 'record-sale',
      title: 'Record Your First Sale',
      description: 'Tap any item in Quick Sell to record when you make a sale',
      action: 'Record Sale',
      completed: hasSales
    },
    {
      id: 'setup-store',
      title: 'Set Up Your Online Store',
      description: 'Create a store URL so customers can order online',
      action: 'Setup Store',
      completed: hasStoreUrl
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const allCompleted = completedCount === steps.length;

  // Show permanently dismissed state
  if (dismissed && !allCompleted) {
    return (
      <button
        onClick={handleReopen}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          zIndex: 1000
        }}
        title="Getting Started Guide"
      >
        💡
      </button>
    );
  }

  if (allCompleted) return null;

  return (
    <div className="getting-started-checklist">
      <div className="checklist-header">
        <div>
          <h3>🎉 Welcome to Storehouse!</h3>
          <p className="checklist-subtitle">
            Get started in 3 easy steps ({completedCount}/{steps.length} completed)
          </p>
        </div>
        <button className="close-btn" onClick={handleDismiss} title="Hide this guide">
          <X size={20} />
        </button>
      </div>

      {showDetails && (
        <div className="checklist-steps">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`checklist-step ${step.completed ? 'completed' : ''}`}
            >
              <div className="step-indicator">
                {step.completed ? (
                  <CheckCircle2 size={24} className="step-icon completed" />
                ) : (
                  <div className="step-number">{index + 1}</div>
                )}
              </div>
              <div className="step-content">
                <h4 className="step-title">{step.title}</h4>
                <p className="step-description">{step.description}</p>
                {!step.completed && (
                  <button
                    className="step-action-btn"
                    onClick={() => {
                      if (step.id === 'add-items') onAddItem();
                      else if (step.id === 'record-sale') onRecordSale();
                      else if (step.id === 'setup-store') onSetupStore();
                    }}
                  >
                    {step.action} →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="checklist-footer">
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
          💡 You can reopen this guide anytime from the More menu
        </p>
      </div>
    </div>
  );
}
