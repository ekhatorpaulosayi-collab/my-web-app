import React, { Suspense, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import BusinessSettings from '../components/BusinessSettings';

const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#6b7280'
  }}>
    Loading Settings...
  </div>
);

export default function Settings() {
  const [showEODModal, setShowEODModal] = useState(false);

  const handleSendEOD = () => {
    console.log('[Settings] EOD Report triggered');
    setShowEODModal(true);
  };

  const handleExportCSV = () => {
    console.log('[Settings] Export CSV triggered');
    alert('Export CSV functionality - integrate with your export logic');
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <BusinessSettings
          isOpen={true}
          onClose={() => window.history.back()}
          onSendEOD={handleSendEOD}
          onExportCSV={handleExportCSV}
          onToast={(message) => console.log('[Settings Toast]', message)}
        />

        {/* EOD Modal Placeholder - You'll need to add the actual EOD modal here */}
        {showEODModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '500px'
            }}>
              <h2>EOD Report</h2>
              <p>This would show your EOD report modal</p>
              <button onClick={() => setShowEODModal(false)}>Close</button>
            </div>
          </div>
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
