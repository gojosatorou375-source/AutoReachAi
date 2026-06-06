import React from 'react';
import { PlusIcon } from './Icons';

export default function Overview({ threads, drafts, onAddThreadTrigger, onInspectThread, onInspectDraft, relativeTime, staleAfterDays, onStaleDaysChange, onRunScan, isScanning }) {
  // Compute Metrics
  const activeThreadsCount = threads.filter((t) => t.status === 'tracking').length;
  const pendingDrafts = drafts.filter((d) => d.status === 'pending');
  const pendingDraftsCount = pendingDrafts.length;
  
  // Stale Threads (tracking and older than threshold)
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - staleAfterDays);
  
  const staleThreads = threads
    .filter((t) => {
      if (t.status !== 'tracking') return false;
      return new Date(t.sent_at) < thresholdDate;
    })
    .sort((a, b) => b.urgency_score - a.urgency_score);

  const totalTokens = drafts.reduce((sum, d) => sum + (d.tokens_used || 0), 0);

  // Recent Drafts (top 4 pending)
  const recentDrafts = [...pendingDrafts]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4);

  return (
    <section id="panel-overview" className="tab-panel active">
      <header className="panel-header">
        <div>
          <h2 className="section-title">Workspace Overview</h2>
          <p className="section-subtitle">Summary of current outbound conversations and pending drafts.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Threshold Selector Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Stale after:</span>
            <select 
              value={staleAfterDays} 
              onChange={(e) => onStaleDaysChange(Number(e.target.value))}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value={0}>0 Days (All Threads)</option>
              <option value={1}>1 Day</option>
              <option value={2}>2 Days</option>
              <option value={3}>3 Days</option>
              <option value={5}>5 Days</option>
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </div>

          <button 
            className={`btn btn-secondary ${isScanning ? 'btn-loading' : ''}`} 
            onClick={onRunScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <span className="btn-spinner"></span>
                Generating...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="14" height="14" style={{ marginRight: '6px' }}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                Run AI Scan
              </>
            )}
          </button>
          <button className="btn btn-primary" onClick={onAddThreadTrigger}>
            <PlusIcon />
            Register Outbound Thread
          </button>
        </div>
      </header>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Tracked Threads</span>
          <div className="metric-value-container">
            <span className="metric-value">{activeThreadsCount}</span>
            <span className="metric-accent-line"></span>
          </div>
          <p className="metric-description">Active email conversations in monitoring</p>
        </div>
        <div className="metric-card">
          <span className="metric-label">Pending Follow-ups</span>
          <div className="metric-value-container">
            <span className="metric-value">{pendingDraftsCount}</span>
            <span className="metric-accent-line"></span>
          </div>
          <p className="metric-description">AI generated drafts awaiting operator review</p>
        </div>
        <div className="metric-card">
          <span className="metric-label">Stale Conversations</span>
          <div className="metric-value-container">
            <span className={`metric-value ${staleThreads.length > 0 ? 'text-danger' : ''}`}>
              {staleThreads.length}
            </span>
            <span className="metric-accent-line"></span>
          </div>
          <p className="metric-description">Threads past threshold without reply</p>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total AI Tokens</span>
          <div className="metric-value-container">
            <span className="metric-value">{totalTokens.toLocaleString()}</span>
            <span className="metric-accent-line"></span>
          </div>
          <p className="metric-description">Accumulated OpenAI completion usage</p>
        </div>
      </div>

      {/* Dashboard Split Layout */}
      <div className="dashboard-split">
        {/* Left Column: Urgent Stale Threads */}
        <div className="dashboard-card card-large">
          <div className="card-header">
            <h3 className="card-title">Stale Threads Awaiting Response</h3>
            <span className={`badge ${staleThreads.length > 0 ? 'badge-danger' : 'badge-dismissed'}`}>
              {staleThreads.length} Stale
            </span>
          </div>
          <div className="card-body">
            <div className="table-container list-view">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Sent</th>
                    <th>Urgency</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staleThreads.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="table-empty">
                        No stale conversations detected. Keep up the good work!
                      </td>
                    </tr>
                  ) : (
                    staleThreads.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div className="table-row-recipient">
                            <span className="recipient-name">{t.recipient_name}</span>
                            <span className="recipient-email">{t.recipient_email}</span>
                            {t.intent_tag !== 'other' && (
                              <span className="badge badge-warning" style={{ fontSize: '10px', marginTop: '4px', alignSelf: 'flex-start' }}>
                                {t.intent_tag.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{t.subject}</span>
                        </td>
                        <td>
                          <span className="text-secondary">{relativeTime(t.sent_at)}</span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 600,
                              
                              color: t.urgency_score > 60 ? 'var(--status-stale-text)' : 'var(--text-secondary)',
                            }}
                          >
                            {t.urgency_score}%
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => onInspectThread(t.id)}>
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Pending Drafts */}
        <div className="dashboard-card card-small">
          <div className="card-header">
            <h3 className="card-title">Recent Drafts</h3>
            <button className="text-link-btn" onClick={() => onInspectDraft(null)}>
              View Inbox
            </button>
          </div>
          <div className="card-body">
            <div className="draft-small-list">
              {recentDrafts.length === 0 ? (
                <p className="loading-text">No pending drafts to review.</p>
              ) : (
                recentDrafts.map((d) => {
                  const thread = threads.find((t) => t.id === d.thread_id);
                  const recipient = thread ? thread.recipient_name : 'Unknown';
                  return (
                    <div key={d.id} className="draft-small-item" onClick={() => onInspectDraft(d.id)}>
                      <div className="draft-small-header">
                        <span className="draft-small-name">{recipient}</span>
                        <span className="draft-small-date">{relativeTime(d.created_at)}</span>
                      </div>
                      <div className="draft-small-subject">{d.draft_subject}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
