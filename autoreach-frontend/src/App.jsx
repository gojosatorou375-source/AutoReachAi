import React, { useState, useEffect } from 'react';
import LogoImage from './assets/logo.jpg';

import Overview from './components/Overview';
import Threads from './components/Threads';
import Drafts from './components/Drafts';
import PdfAnalyzer from './components/PdfAnalyzer';
import AddThreadDrawer from './components/AddThreadDrawer';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import { OverviewIcon, ThreadsIcon, DraftsIcon, OperatorIcon, SuccessIcon, AlertIcon } from './components/Icons';

const API_BASE = 'http://127.0.0.1:8000/api';

function App() {
  const [userId, setUserId] = useState(localStorage.getItem('autoreach_user_id') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('autoreach_user_id'));
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isGmailSyncOpen, setIsGmailSyncOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [threads, setThreads] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [staleAfterDays, setStaleAfterDays] = useState(7);
  
  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Toast trigger helper
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Fetch all threads and drafts for the active operator
  const refreshData = async () => {
    if (!userId) return;
    try {
      const [threadsRes, draftsRes] = await Promise.all([
        fetch(`${API_BASE}/threads/?user_id=${encodeURIComponent(userId)}&limit=200`),
        fetch(`${API_BASE}/drafts/?user_id=${encodeURIComponent(userId)}&limit=200`),
      ]);

      if (!threadsRes.ok || !draftsRes.ok) {
        throw new Error('Failed to query backend API endpoints.');
      }

      const threadsData = await threadsRes.json();
      const draftsData = await draftsRes.json();

      setThreads(threadsData.threads || []);
      setDrafts(draftsData.drafts || []);
    } catch (err) {
      console.error(err);
      showToast('Could not synchronize workspace with the server.', 'danger');
    }
  };

  // Run AI follow-up scan for tracked threads
  const handleRunScan = async () => {
    setIsScanning(true);
    showToast(`AI scan started... analyzing threads older than ${staleAfterDays} days.`, 'success');
    try {
      const response = await fetch(`${API_BASE}/threads/scan-and-generate?stale_days=${staleAfterDays}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to trigger AI scan.');
      }
      
      showToast(`Scan complete! Generated ${data.created_count} AI follow-up drafts.`, 'success');
      await refreshData();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'danger');
    } finally {
      setIsScanning(false);
    }
  };

  // Sync data when user logs in or page loads
  useEffect(() => {
    if (isAuthenticated && userId) {
      refreshData();
    }
  }, [userId, isAuthenticated]);

  // Handle Login event
  const handleLogin = (email) => {
    setUserId(email);
    setIsAuthenticated(true);
    localStorage.setItem('autoreach_user_id', email);
    showToast(`Signed in successfully as ${email}`, 'success');
  };

  // Handle Sign Out event
  const handleSignOut = () => {
    setUserId('');
    setIsAuthenticated(false);
    localStorage.removeItem('autoreach_user_id');
    showToast('Signed out successfully.', 'success');
  };

  // Relative time helper
  const relativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHrs === 0) return 'Just now';
      return `${diffHrs}h ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Date formatting helper
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Dismiss a thread monitoring from list
  const handleDismissThread = async (threadId) => {
    if (!confirm('Are you sure you want to stop monitoring this email thread?')) return;
    try {
      const response = await fetch(`${API_BASE}/threads/${threadId}/dismiss`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Could not dismiss thread.');

      showToast('Conversation dismissed and untracked.', 'success');
      refreshData();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'danger');
    }
  };

  // Inspect Stale thread details shortcut
  const handleInspectStaleThread = (threadId) => {
    // Navigate to threads tab and search for this thread
    setActiveTab('threads');
    // Pre-populate search is handled by letting the user see it in the threads tab list
  };

  // Inspect draft shortcut from overview
  const handleInspectDraft = (draftId) => {
    setActiveTab('drafts');
    if (draftId) {
      setSelectedDraftId(draftId);
    }
  };

  // Count pending drafts for badge indicator
  const pendingDraftsCount = drafts.filter((d) => d.status === 'pending').length;

  if (!isAuthenticated) {
    return (
      <>
        <LandingPage onGetStarted={() => setShowLoginModal(true)} />
        {showLoginModal && (
          <div className="oauth-overlay" onClick={() => setShowLoginModal(false)}>
            <div onClick={(e) => e.stopPropagation()}>
              <Login 
                onLogin={(email) => {
                  setShowLoginModal(false);
                  handleLogin(email);
                }} 
                API_BASE={API_BASE}
                showToast={showToast}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        <div className="sidebar-brand" style={{ borderLeft: 'none', paddingLeft: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={LogoImage} alt="AutoReach AI Logo" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
          <div>
            <h1 className="brand-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>AutoReach AI</h1>
            <p className="brand-subtitle" style={{ fontSize: '11px', margin: 0, fontStyle: 'italic' }}>Editorial Workspace</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <OverviewIcon />
            Overview
          </button>
          <button
            className={`nav-item ${activeTab === 'threads' ? 'active' : ''}`}
            onClick={() => setActiveTab('threads')}
          >
            <ThreadsIcon />
            Tracked Threads
          </button>
          <button
            className={`nav-item ${activeTab === 'drafts' ? 'active' : ''}`}
            onClick={() => setActiveTab('drafts')}
          >
            <DraftsIcon />
            Follow-up Drafts
            {pendingDraftsCount > 0 && (
              <span className="badge badge-warning sidebar-badge">{pendingDraftsCount}</span>
            )}
          </button>
          <button
            className={`nav-item ${activeTab === 'analyzer' ? 'active' : ''}`}
            onClick={() => setActiveTab('analyzer')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16" style={{ marginRight: '10px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            PDF Analyzer
          </button>
        </nav>

        {/* Sidebar Footer User Profile Card */}
        <div className="sidebar-footer" style={{ paddingBottom: '0px' }}>
          <div className="sidebar-profile">
            <div className="profile-avatar">
              {userId.charAt(0)}
            </div>
            <div className="profile-info">
              <span className="profile-name" title={userId}>
                {userId.split('@')[0]}
              </span>
              <span className="profile-email" title={userId}>
                {userId}
              </span>
            </div>
            <button 
              type="button" 
              className="profile-logout-btn" 
              onClick={handleSignOut}
              title="Sign Out"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Panels */}
      <main className="app-main">
        {activeTab === 'overview' && (
          <Overview
            threads={threads}
            drafts={drafts}
            onAddThreadTrigger={() => setIsAddDrawerOpen(true)}
            onInspectThread={handleInspectStaleThread}
            onInspectDraft={handleInspectDraft}
            relativeTime={relativeTime}
            staleAfterDays={staleAfterDays}
            onStaleDaysChange={setStaleAfterDays}
            onRunScan={handleRunScan}
            isScanning={isScanning}
          />
        )}

        {activeTab === 'threads' && (
          <Threads
            threads={threads}
            onAddThreadTrigger={() => setIsAddDrawerOpen(true)}
            onInspectThread={(threadId) => {
              // Re-use detail popup logic
              const thread = threads.find((t) => t.id === threadId);
              if (!thread) return;
              
              // Direct modal alert inside page
              const overlay = document.createElement('div');
              overlay.className = 'drawer-overlay open';
              overlay.style.zIndex = '200';
              overlay.onclick = () => overlay.remove();
              
              const modal = document.createElement('div');
              modal.className = 'drawer open';
              modal.style.width = '500px';
              modal.style.transform = 'translateX(0)';
              modal.style.left = 'calc(50% - 250px)';
              modal.style.top = '10%';
              modal.style.height = '75vh';
              modal.style.borderRadius = 'var(--border-radius)';
              modal.style.border = '1px solid var(--border-color)';
              modal.style.boxShadow = 'var(--shadow-premium)';
              modal.onclick = (e) => e.stopPropagation();
              
              modal.innerHTML = `
                <div class="drawer-header">
                  <div>
                    <h3 class="drawer-title" >${thread.recipient_name}</h3>
                    <p class="drawer-subtitle">${thread.recipient_email}</p>
                  </div>
                  <button class="drawer-close-btn" id="modal-close-trigger">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div class="drawer-form" style="padding: 24px 32px; gap: 16px;">
                  <div class="form-group">
                    <span class="form-label">Email Subject</span>
                    <span style="font-size:16px; font-weight:600;">${thread.subject}</span>
                  </div>
                  <div class="form-group">
                    <span class="form-label">Sent Date</span>
                    <span class="text-secondary">${formatDate(thread.sent_at)}</span>
                  </div>
                  <div class="form-group" style="flex-grow:1; overflow-y:auto; border-top:1px solid var(--border-color); padding-top:16px;">
                    <span class="form-label" style="margin-bottom:8px;">Original Message Body</span>
                    <p style="white-space:pre-wrap; font-size:13px; line-height:1.6; color:var(--text-secondary);">${thread.original_body}</p>
                  </div>
                </div>
              `;
              
              overlay.appendChild(modal);
              document.body.appendChild(overlay);
              
              modal.querySelector('#modal-close-trigger').onclick = () => overlay.remove();
            }}
            onDismissThread={handleDismissThread}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'drafts' && (
          <Drafts
            drafts={drafts}
            threads={threads}
            API_BASE={API_BASE}
            showToast={showToast}
            refreshData={refreshData}
            formatDate={formatDate}
            relativeTime={relativeTime}
            selectedDraftId={selectedDraftId}
            setSelectedDraftId={setSelectedDraftId}
          />
        )}

        {activeTab === 'analyzer' && (
          <PdfAnalyzer
            userId={userId}
            API_BASE={API_BASE}
            showToast={showToast}
          />
        )}
      </main>

      {/* Slide-over Add Thread Drawer */}
      <AddThreadDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        userId={userId}
        API_BASE={API_BASE}
        showToast={showToast}
        refreshData={refreshData}
      />

      {/* Toast Alert Popups */}
      <div className="toast-container" id="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' ? <SuccessIcon /> : <AlertIcon />}
            <span className="toast-message">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
