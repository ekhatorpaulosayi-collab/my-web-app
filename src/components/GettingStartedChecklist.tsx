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
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

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

  // Auto-collapse after 30 seconds if user doesn't interact
  useEffect(() => {
    if (!dismissed && !hasUserInteracted) {
      const timer = setTimeout(() => {
        setShowDetails(false);
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [dismissed, hasUserInteracted]);

  // Track user interactions
  const handleUserInteraction = () => {
    setHasUserInteracted(true);
  };

  const steps: ChecklistItem[] = [
    {
      id: 'add-items',
      title: 'Add Your Products',
      description: 'Add items to your inventory to start tracking stock levels and prices',
      action: 'Add First Product',
      completed: hasItems
    },
    {
      id: 'record-sale',
      title: 'Record Your First Sale',
      description: 'Click on any product below in your inventory to record a sale and update stock',
      action: 'View Products',
      completed: hasSales
    },
    {
      id: 'setup-store',
      title: 'Create Your Online Store',
      description: 'Get a custom store link where customers can browse and order 24/7',
      action: 'Set Up Store',
      completed: hasStoreUrl
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const allCompleted = completedCount === steps.length;
  const [showCelebration, setShowCelebration] = useState(false);

  // Show celebration when all completed
  useEffect(() => {
    if (allCompleted && !dismissed) {
      setShowCelebration(true);
      const timer = setTimeout(() => {
        handleDismiss(); // Auto-dismiss after celebration
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [allCompleted, dismissed]);

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

  // Show celebration screen
  if (showCelebration) {
    return (
      <div className="getting-started-checklist celebration">
        <div style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
          <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#0c4a6e', margin: '0 0 8px 0' }}>
            You're All Set!
          </h3>
          <p style={{ fontSize: '16px', color: '#0369a1', margin: '0 0 24px 0' }}>
            Your store is ready to grow your business
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '14px', color: '#6b7280' }}>
            <div>✅ Products added</div>
            <div>✅ Sales tracked</div>
            <div>✅ Store live</div>
          </div>
        </div>
      </div>
    );
  }

  if (allCompleted) return null;

  return (
    <div className="getting-started-checklist" onClick={handleUserInteraction}>
      <div className="checklist-header">
        <div
          onClick={() => setShowDetails(!showDetails)}
          style={{ cursor: 'pointer', flex: 1 }}
        >
          <h3>🎉 Welcome to Storehouse!</h3>
          <p style={{ margin: '4px 0 8px 0', fontSize: '13px', color: '#0c4a6e', fontWeight: 400 }}>
            Track inventory, record sales, and sell online in minutes
          </p>
          <p className="checklist-subtitle">
            {completedCount === steps.length ? '✨ All set up!' : `${completedCount}/${steps.length} steps completed • ~${(steps.length - completedCount) * 2} min remaining`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="skip-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(false);
            }}
            title="Minimize for now"
          >
            Skip
          </button>
          <button
            className="close-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            title="Hide permanently"
          >
            <X size={20} />
          </button>
        </div>
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
