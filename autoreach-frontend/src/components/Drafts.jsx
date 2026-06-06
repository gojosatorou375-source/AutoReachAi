import React, { useState, useEffect } from 'react';
import { ChevronIcon, SuccessIcon, AlertIcon } from './Icons';

export default function Drafts({
  drafts,
  threads,
  API_BASE,
  showToast,
  refreshData,
  formatDate,
  relativeTime,
  selectedDraftId,
  setSelectedDraftId,
}) {
  const [activeFilter, setActiveFilter] = useState('pending');
  const [isOriginalOpen, setIsOriginalOpen] = useState(false);
  const [selectedTone, setSelectedTone] = useState('professional');
  const [isApproving, setIsApproving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filter drafts matching sub-status
  const filteredDrafts = drafts
    .filter((d) => d.status === activeFilter)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Auto-select first draft on filter switch or list reload
  useEffect(() => {
    if (filteredDrafts.length > 0) {
      // If currently selected draft is not in the filtered list, select the first one
      const exists = filteredDrafts.some((d) => d.id === selectedDraftId);
      if (!exists) {
        setSelectedDraftId(filteredDrafts[0].id);
      }
    } else {
      setSelectedDraftId(null);
    }
  }, [activeFilter, drafts]);

  const selectedDraft = drafts.find((d) => d.id === selectedDraftId);
  const selectedThread = selectedDraft ? threads.find((t) => t.id === selectedDraft.thread_id) : null;

  // Initialize selected tone when draft changes
  useEffect(() => {
    if (selectedDraft) {
      setSelectedTone(selectedDraft.tone);
      setCopied(false);
    }
  }, [selectedDraftId]);

  const handleApprove = async () => {
    if (!selectedDraft) return;
    setIsApproving(true);
    try {
      const response = await fetch(`${API_BASE}/drafts/${selectedDraft.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gmail_password: '' }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to approve/send draft.');
      }

      if (data.status === 'sent') {
        showToast('Draft approved and follow-up email sent successfully!', 'success');
      } else {
        showToast('Draft approved (simulated email delivery).', 'success');
      }
      await refreshData();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'danger');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDismiss = async () => {
    if (!selectedDraft) return;
    if (!confirm('Are you sure you want to dismiss this draft follow-up?')) return;

    try {
      const response = await fetch(`${API_BASE}/drafts/${selectedDraft.id}/dismiss`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to dismiss draft.');

      showToast('Draft dismissed.', 'success');
      await refreshData();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'danger');
    }
  };

  const handleRegenerate = async () => {
    if (!selectedDraft) return;
    setIsRegenerating(true);
    try {
      const response = await fetch(`${API_BASE}/drafts/${selectedDraft.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: selectedTone }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to regenerate draft.');
      }

      const newDraft = await response.json();
      showToast(`Draft regenerated in "${selectedTone}" tone.`, 'success');
      
      // Auto select the new generated draft
      setSelectedDraftId(newDraft.id);
      await refreshData();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'danger');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!selectedDraft) return;
    const fullText = `Subject: ${selectedDraft.draft_subject}\n\n${selectedDraft.draft_body}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      showToast('Copied subject and body to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section id="panel-drafts" className="tab-panel active">
      <header className="panel-header">
        <div>
          <h2 className="section-title">AI Follow-up Draft Box</h2>
          <p className="section-subtitle">Review, edit, and approve generated drafts for stale conversations.</p>
        </div>
      </header>

      <div className="draft-workspace">
        {/* Left column: Draft list */}
        <div className="drafts-sidebar">
          <div className="draft-sidebar-filter">
            {['pending', 'approved', 'dismissed'].map((status) => (
              <button
                key={status}
                className={`tab-sub-btn ${activeFilter === status ? 'active' : ''}`}
                onClick={() => setActiveFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <div className="drafts-list">
            {filteredDrafts.length === 0 ? (
              <p className="loading-text" style={{ fontSize: '13px' }}>
                No {activeFilter} drafts found.
              </p>
            ) : (
              filteredDrafts.map((d) => {
                const thread = threads.find((t) => t.id === d.thread_id);
                const recipient = thread ? thread.recipient_name : 'Unknown Recipient';
                const isActive = selectedDraftId === d.id;

                return (
                  <div
                    key={d.id}
                    className={`draft-card ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedDraftId(d.id)}
                  >
                    <div className="draft-card-header">
                      <span className="draft-card-recipient">{recipient}</span>
                      <span className="draft-card-date">{relativeTime(d.created_at)}</span>
                    </div>
                    <div className="draft-card-subject">{d.draft_subject}</div>
                    <div className="draft-card-footer">
                      <span className="draft-card-tone">{d.tone.toUpperCase()}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                        {d.tokens_used} tokens
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Selected draft editor */}
        <div className="draft-editor-pane">
          {!selectedDraft ? (
            <div className="draft-editor-placeholder">
              <svg className="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <h3>No Draft Selected</h3>
              <p>Select a follow-up draft from the left panel to review and take action.</p>
            </div>
          ) : (
            <>
              {/* Loaded Selected Draft */}
              <div className="draft-editor-header">
                <div className="draft-editor-title-container">
                  <h3 style={{ fontSize: '20px', fontWeight: 600 }}>Review Follow-up Draft</h3>
                  <div className="draft-recipient-details">
                    <span>
                      To: <strong>{selectedThread ? selectedThread.recipient_name : 'Unknown'}</strong> (
                      {selectedThread ? selectedThread.recipient_email : 'unknown@domain.com'})
                    </span>
                    {selectedDraft.status === 'pending' && (
                      <span className="badge badge-warning draft-editor-meta-badge">Pending Review</span>
                    )}
                    {selectedDraft.status === 'approved' && (
                      <span className="badge badge-ready draft-editor-meta-badge">Approved</span>
                    )}
                    {selectedDraft.status === 'dismissed' && (
                      <span className="badge badge-dismissed draft-editor-meta-badge">Dismissed</span>
                    )}
                  </div>
                </div>
                <span className="text-secondary" style={{ fontSize: '11px' }}>
                  Created: {formatDate(selectedDraft.created_at)}
                </span>
              </div>

              <div className="draft-editor-body">
                {/* Accordion: Original Thread Message */}
                <div className="original-thread-box">
                  <div
                    className={`thread-box-header ${isOriginalOpen ? 'open' : ''}`}
                    onClick={() => setIsOriginalOpen(!isOriginalOpen)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>Original Outbound Message Details</span>
                    <ChevronIcon className={`chevron-icon ${isOriginalOpen ? 'rotated' : ''}`} />
                  </div>
                  <div className={`thread-box-content ${isOriginalOpen ? 'open' : ''}`}>
                    <p style={{ marginBottom: '8px' }}>
                      <strong>Subject:</strong> {selectedThread ? selectedThread.subject : 'No subject'}
                    </p>
                    <p style={{ fontFamily: "'Inter', sans-serif" }}>
                      {selectedThread ? selectedThread.original_body : 'No body data.'}
                    </p>
                  </div>
                </div>

                {/* Draft Subject Output */}
                <div className="editor-field-group">
                  <label className="form-label" htmlFor="editor-draft-subject">
                    Follow-up Subject
                  </label>
                  <input
                    type="text"
                    className="editor-input-subject"
                    id="editor-draft-subject"
                    value={selectedDraft.draft_subject}
                    readOnly
                  />
                </div>

                {/* Draft Body Textarea */}
                <div className="editor-field-group" style={{ flexGrow: 1 }}>
                  <label className="form-label" htmlFor="editor-draft-body">
                    Follow-up Message Body
                  </label>
                  <textarea
                    className="editor-textarea-body"
                    id="editor-draft-body"
                    value={selectedDraft.draft_body}
                    readOnly
                  />
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="editor-toolbar">
                <div className="editor-tokens-meta">
                  <span>
                    Tokens Consumed: <strong>{selectedDraft.tokens_used}</strong>
                  </span>
                  <span>
                    Tone Style: <strong>{selectedDraft.tone.toUpperCase()}</strong>
                  </span>
                </div>

                <div className="editor-actions-group">
                  <button className="btn btn-secondary" onClick={handleCopyToClipboard}>
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>

                  {selectedDraft.status === 'pending' && (
                    <>
                      {/* Regeneration Controls */}
                      <div className="regeneration-controls">
                        <select
                          id="editor-tone-select"
                          title="Choose tone for AI regeneration"
                          value={selectedTone}
                          onChange={(e) => setSelectedTone(e.target.value)}
                        >
                          <option value="professional">Professional</option>
                          <option value="friendly">Friendly</option>
                          <option value="urgent">Urgent</option>
                          <option value="warm">Warm</option>
                          <option value="direct">Direct</option>
                          <option value="persuasive">Persuasive</option>
                        </select>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={isRegenerating}
                          onClick={handleRegenerate}
                        >
                          {isRegenerating ? (
                            <>
                              <span className="loading-pulse"></span> Crafting...
                            </>
                          ) : (
                            'Regenerate'
                          )}
                        </button>
                      </div>

                      <button className="btn btn-secondary" onClick={handleDismiss}>
                        Dismiss
                      </button>
                      <button
                        className="btn btn-primary"
                        disabled={isApproving}
                        onClick={handleApprove}
                      >
                        {isApproving ? (
                          <>
                            <span className="btn-spinner"></span> Sending...
                          </>
                        ) : (
                          localStorage.getItem('autoreach_app_password') ? 'Approve & Send' : 'Approve Draft'
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
