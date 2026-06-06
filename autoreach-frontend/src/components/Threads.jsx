import React, { useState } from 'react';
import { PlusIcon, EyeIcon, TrashIcon } from './Icons';

export default function Threads({ threads, onAddThreadTrigger, onInspectThread, onDismissThread, formatDate }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchVal, setSearchVal] = useState('');

  // Apply filters
  let filtered = [...threads];
  if (activeFilter !== 'all') {
    filtered = filtered.filter((t) => t.status === activeFilter);
  }
  if (searchVal.trim()) {
    const q = searchVal.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.recipient_name.toLowerCase().includes(q) ||
        t.recipient_email.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'tracking':
        return <span className="badge badge-tracking">Tracking</span>;
      case 'draft_ready':
        return <span className="badge badge-ready">Draft Ready</span>;
      case 'replied':
        return <span className="badge badge-replied">Replied</span>;
      case 'dismissed':
        return <span className="badge badge-dismissed">Dismissed</span>;
      default:
        return <span className="badge badge-dismissed">{status}</span>;
    }
  };

  const getIntentBadge = (intent) => {
    switch (intent) {
      case 'job_application':
        return <span className="badge badge-tracking" style={{ fontSize: '10px' }}>Job App</span>;
      case 'sales':
        return <span className="badge badge-warning" style={{ fontSize: '10px' }}>Sales</span>;
      case 'networking':
        return <span className="badge badge-ready" style={{ fontSize: '10px' }}>Network</span>;
      case 'internship':
        return (
          <span className="badge badge-ready" style={{ fontSize: '10px', backgroundColor: '#E8F0FE', color: '#1C3AA9' }}>
            Intern
          </span>
        );
      default:
        return <span className="badge badge-dismissed" style={{ fontSize: '10px' }}>{intent.replace('_', ' ')}</span>;
    }
  };

  return (
    <section id="panel-threads" className="tab-panel active">
      <header className="panel-header">
        <div>
          <h2 className="section-title">Tracked Conversations</h2>
          <p className="section-subtitle">Outbound email threads monitored for recipient response.</p>
        </div>
        <button className="btn btn-primary" onClick={onAddThreadTrigger}>
          <PlusIcon />
          Register Outbound Thread
        </button>
      </header>

      {/* Toolbar filters and search */}
      <div className="toolbar">
        <div className="filter-group">
          {['all', 'tracking', 'draft_ready', 'replied', 'dismissed'].map((status) => (
            <button
              key={status}
              className={`filter-chip ${activeFilter === status ? 'active' : ''}`}
              onClick={() => setActiveFilter(status)}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>
        <div className="toolbar-search">
          <input
            type="text"
            placeholder="Search by recipient or subject..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
          />
        </div>
      </div>

      {/* Main Threads Table Card */}
      <div className="dashboard-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Sent Date</th>
                <th>Intent Tag</th>
                <th>Urgency</th>
                <th>Status</th>
                <th className="table-actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    No tracked conversations found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="table-row-recipient">
                        <span className="recipient-name">{t.recipient_name}</span>
                        <span className="recipient-email">{t.recipient_email}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{t.subject}</span>
                    </td>
                    <td>
                      <span className="text-secondary">{formatDate(t.sent_at)}</span>
                    </td>
                    <td>{getIntentBadge(t.intent_tag)}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 500,
                          
                          color: t.urgency_score > 60 ? 'var(--status-stale-text)' : 'inherit',
                        }}
                      >
                        {t.urgency_score}%
                      </span>
                    </td>
                    <td>{getStatusBadge(t.status)}</td>
                    <td className="table-row-actions">
                      <button
                        className="table-icon-btn"
                        onClick={() => onInspectThread(t.id)}
                        title="View email content"
                      >
                        <EyeIcon />
                      </button>
                      {t.status === 'tracking' && (
                        <button
                          className="table-icon-btn text-danger"
                          onClick={() => onDismissThread(t.id)}
                          title="Dismiss thread monitoring"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
