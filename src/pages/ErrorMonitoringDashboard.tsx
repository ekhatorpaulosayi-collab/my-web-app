/**
 * Error Monitoring Dashboard
 * View error logs and login attempts for debugging and security monitoring
 */

import { useState, useEffect } from 'react';
import { getErrorStats, getLoginStats, type ErrorLog, type LoginAttempt } from '../utils/errorMonitoring';
import '../styles/ErrorMonitoring.css';

export default function ErrorMonitoringDashboard() {
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week'>('day');
  const [errorStats, setErrorStats] = useState<any>(null);
  const [loginStats, setLoginStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'errors' | 'logins'>('errors');

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [errors, logins] = await Promise.all([
        getErrorStats(timeRange),
        getLoginStats(timeRange),
      ]);
      setErrorStats(errors);
      setLoginStats(logins);
    } catch (err) {
      console.error('[ErrorDashboard] Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626',
    };
    return colors[severity as keyof typeof colors] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="monitoring-container">
        <div className="monitoring-loading">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="monitoring-container">
      <div className="monitoring-header">
        <h1>Error Monitoring & Login Tracking</h1>
        <p>Monitor login issues and track application errors</p>
      </div>

      {/* Time Range Selector */}
      <div className="time-range-selector">
        <button
          className={timeRange === 'hour' ? 'active' : ''}
          onClick={() => setTimeRange('hour')}
        >
          Last Hour
        </button>
        <button
          className={timeRange === 'day' ? 'active' : ''}
          onClick={() => setTimeRange('day')}
        >
          Last 24 Hours
        </button>
        <button
          className={timeRange === 'week' ? 'active' : ''}
          onClick={() => setTimeRange('week')}
        >
          Last Week
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon" style={{ background: '#ef4444' }}>⚠️</div>
          <div className="card-content">
            <div className="card-value">{errorStats.total}</div>
            <div className="card-label">Total Errors</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon" style={{ background: '#10b981' }}>✓</div>
          <div className="card-content">
            <div className="card-value">{loginStats.successful}</div>
            <div className="card-label">Successful Logins</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon" style={{ background: '#ef4444' }}>✗</div>
          <div className="card-content">
            <div className="card-value">{loginStats.failed}</div>
            <div className="card-label">Failed Logins</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon" style={{ background: '#f59e0b' }}>%</div>
          <div className="card-content">
            <div className="card-value">{loginStats.failureRate.toFixed(1)}%</div>
            <div className="card-label">Failure Rate</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={activeTab === 'errors' ? 'active' : ''}
          onClick={() => setActiveTab('errors')}
        >
          Error Logs ({errorStats.total})
        </button>
        <button
          className={activeTab === 'logins' ? 'active' : ''}
          onClick={() => setActiveTab('logins')}
        >
          Login Attempts ({loginStats.total})
        </button>
      </div>

      {/* Errors Tab */}
      {activeTab === 'errors' && (
        <div className="content-section">
          <div className="section-header">
            <h2>Recent Errors</h2>
            <button onClick={loadStats} className="refresh-button">
              🔄 Refresh
            </button>
          </div>

          {/* Error Type Breakdown */}
          <div className="breakdown-section">
            <h3>Errors by Type</h3>
            <div className="breakdown-grid">
              {Object.entries(errorStats.byType).map(([type, count]) => (
                <div key={type} className="breakdown-item">
                  <span className="breakdown-label">{type}</span>
                  <span className="breakdown-count">{count as number}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Severity Breakdown */}
          <div className="breakdown-section">
            <h3>Errors by Severity</h3>
            <div className="breakdown-grid">
              {Object.entries(errorStats.bySeverity).map(([severity, count]) => (
                <div key={severity} className="breakdown-item">
                  <span
                    className="breakdown-label"
                    style={{ color: getSeverityColor(severity) }}
                  >
                    {severity}
                  </span>
                  <span className="breakdown-count">{count as number}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Errors List */}
          <div className="data-table-section">
            <h3>Recent Errors</h3>
            {errorStats.recentErrors.length === 0 ? (
              <div className="empty-state">No errors found ✨</div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Message</th>
                      <th>User</th>
                      <th>Page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorStats.recentErrors.map((error: ErrorLog) => (
                      <tr key={error.id}>
                        <td>{formatTimestamp(error.timestamp)}</td>
                        <td>
                          <span className="badge badge-type">{error.error_type}</span>
                        </td>
                        <td>
                          <span
                            className="badge badge-severity"
                            style={{ background: getSeverityColor(error.severity) }}
                          >
                            {error.severity}
                          </span>
                        </td>
                        <td className="message-cell">{error.error_message}</td>
                        <td className="user-cell">{error.user_email || 'Anonymous'}</td>
                        <td className="page-cell">{new URL(error.page_url).pathname}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logins Tab */}
      {activeTab === 'logins' && (
        <div className="content-section">
          <div className="section-header">
            <h2>Recent Login Attempts</h2>
            <button onClick={loadStats} className="refresh-button">
              🔄 Refresh
            </button>
          </div>

          {/* Recent Failed Logins */}
          <div className="data-table-section">
            <h3>Recent Failed Login Attempts</h3>
            {loginStats.recentFailures.length === 0 ? (
              <div className="empty-state">No failed login attempts ✨</div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Email</th>
                      <th>Attempt #</th>
                      <th>Error</th>
                      <th>User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginStats.recentFailures.map((attempt: LoginAttempt) => (
                      <tr key={attempt.id} className={attempt.attempt_number && attempt.attempt_number >= 5 ? 'warning-row' : ''}>
                        <td>{formatTimestamp(attempt.timestamp)}</td>
                        <td className="email-cell">{attempt.email}</td>
                        <td>
                          <span className={`badge ${attempt.attempt_number && attempt.attempt_number >= 5 ? 'badge-danger' : ''}`}>
                            {attempt.attempt_number || 1}
                          </span>
                        </td>
                        <td className="message-cell">{attempt.error_message || 'Unknown'}</td>
                        <td className="user-agent-cell">{attempt.user_agent.substring(0, 50)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
