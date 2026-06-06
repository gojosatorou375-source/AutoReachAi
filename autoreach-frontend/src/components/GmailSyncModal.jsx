import React, { useState } from 'react';

function GmailSyncModal({ isOpen, onClose, userId, API_BASE, showToast, refreshData }) {
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const password = appPassword.trim();
    if (!password) {
      setSyncError('Please enter your 16-character Google App Password.');
      return;
    }

    setIsSyncing(true);
    setSyncError('');

    try {
      const response = await fetch(`${API_BASE}/threads/sync-gmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          gmail_password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to sync emails from Gmail.');
      }

      showToast(`Successfully synced ${data.synced_count} outbound email thread(s) from Gmail!`, 'success');
      refreshData();
      onClose();
    } catch (err) {
      console.error(err);
      setSyncError(err.message);
      showToast(err.message, 'danger');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="oauth-overlay" onClick={onClose}>
      <div className="oauth-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="oauth-header" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
          <h2 className="oauth-title" style={{ fontSize: '22px', fontWeight: 600 }}>
            Sync Outbound Emails
          </h2>
          <p className="oauth-subtitle">
            Ingest recently sent emails from your Gmail account into your tracking dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <span className="field-label">Gmail Account</span>
            <input 
              type="text" 
              className="input-field" 
              value={userId} 
              disabled 
              style={{ backgroundColor: '#F4EFEA', cursor: 'not-allowed', color: '#5C5852', fontWeight: 600 }}
            />
          </div>

          <div className="form-group">
            <span className="field-label">Google App Password</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                className="input-field" 
                placeholder="xxxx xxxx xxxx xxxx"
                value={appPassword}
                onChange={(e) => {
                  setAppPassword(e.target.value);
                  if (syncError) setSyncError('');
                }}
                disabled={isSyncing}
                style={{ paddingRight: '45px', letterSpacing: showPassword ? 'normal' : '0.2em' }}
              />
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#8C7853',
                }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {syncError && <div className="login-error" style={{ marginTop: '6px' }}>{syncError}</div>}
          </div>

          {/* Secure Warning Alert Panel */}
          <div style={{
            backgroundColor: '#FDF2F0',
            borderLeft: '3px solid #A83A2E',
            padding: '12px 16px',
            borderRadius: '4px',
            fontSize: '12px',
            lineHeight: '1.5',
            color: '#A83A2E'
          }}>
            <strong>Important Security Note:</strong> Do not enter your regular Gmail login password. You must generate a secure 16-character <strong>App Password</strong> from your Google Account settings:
            <ol style={{ margin: '8px 0 0 16px', padding: 0 }}>
              <li>Enable <strong>2-Step Verification</strong> on your account.</li>
              <li>Go to <strong>Security</strong> &rarr; <strong>App passwords</strong>.</li>
              <li>Generate a password for "Mail" and paste it above.</li>
            </ol>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isSyncing}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={`btn btn-primary ${isSyncing ? 'btn-loading' : ''}`}
              disabled={isSyncing}
              style={{ backgroundColor: '#0071e3', borderColor: '#0071e3' }}
            >
              {isSyncing ? (
                <>
                  <span className="btn-spinner"></span>
                  Connecting IMAP...
                </>
              ) : "Sync Sent Mail"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GmailSyncModal;
