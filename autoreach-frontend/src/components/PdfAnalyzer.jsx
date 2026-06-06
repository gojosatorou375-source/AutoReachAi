import React, { useState, useEffect, useRef } from 'react';

export default function PdfAnalyzer({ userId, API_BASE, showToast }) {
  const [history, setHistory] = useState([]);
  const [activeAnalysisId, setActiveAnalysisId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Fetch history list on mount or userId change
  const fetchHistory = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`${API_BASE}/analyzer/history?user_id=${encodeURIComponent(userId)}&limit=50`);
      if (!response.ok) throw new Error('Failed to load analysis history.');
      const data = await response.json();
      setHistory(data.analyses || []);
      if (data.analyses && data.analyses.length > 0) {
        setActiveAnalysisId(data.analyses[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast(err.message, 'danger');
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const activeAnalysis = history.find((a) => a.id === activeAnalysisId);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeAnalysis?.chat_history]);

  // Upload File handler
  const uploadFile = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      showToast('Only PDF files are supported.', 'danger');
      return;
    }

    setIsUploading(true);
    showToast(`Uploading and analyzing '${file.name}'...`, 'success');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/analyzer/upload?user_id=${encodeURIComponent(userId)}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Analysis failed.');
      }

      showToast(`Document successfully analyzed!`, 'success');
      setHistory((prev) => [data, ...prev]);
      setActiveAnalysisId(data.id);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'danger');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    uploadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    uploadFile(file);
  };

  // Chat Submission handler
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeAnalysisId || isSendingChat) return;

    const userMessageText = chatInput.trim();
    setChatInput('');
    setIsSendingChat(true);

    // Optimistically add user message to chat UI
    setHistory((prevHistory) =>
      prevHistory.map((item) => {
        if (item.id === activeAnalysisId) {
          return {
            ...item,
            chat_history: [...item.chat_history, { role: 'user', content: userMessageText }],
          };
        }
        return item;
      })
    );

    try {
      const response = await fetch(`${API_BASE}/analyzer/${activeAnalysisId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessageText }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send message.');
      }

      // Update history with the final chat history from backend
      setHistory((prevHistory) =>
        prevHistory.map((item) => {
          if (item.id === activeAnalysisId) {
            return {
              ...item,
              chat_history: data.chat_history,
            };
          }
          return item;
        })
      );
    } catch (err) {
      console.error(err);
      showToast(err.message, 'danger');
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <section id="panel-analyzer" className="tab-panel active">
      <header className="panel-header">
        <div>
          <h2 className="section-title">Invoice & PDF Analyzer</h2>
          <p className="section-subtitle">Upload PDFs to extract key values, summarize files, and chat with details.</p>
        </div>
      </header>

      <div className="analyzer-layout">
        {/* Left column: History & Upload */}
        <div className="analyzer-sidebar">
          <div
            className={`analyzer-upload-zone ${dragOver ? 'drag-over' : ''} ${isUploading ? 'loading' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              style={{ display: 'none' }}
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="upload-loading-container">
                <span className="btn-spinner" style={{ width: '24px', height: '24px' }}></span>
                <span className="upload-label" style={{ marginTop: '12px', fontWeight: 600 }}>Analyzing Document...</span>
              </div>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="upload-icon">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <span className="upload-label">Drag & Drop PDF or Click</span>
                <span className="upload-subtext">Supports invoices, receipts, and bills</span>
              </>
            )}
          </div>

          <h3 className="sidebar-section-title">Analysis History</h3>
          <div className="analyzer-history-list">
            {history.length === 0 ? (
              <p className="history-empty">No analyzed documents yet.</p>
            ) : (
              history.map((a) => (
                <button
                  key={a.id}
                  className={`analyzer-history-item ${activeAnalysisId === a.id ? 'active' : ''}`}
                  onClick={() => setActiveAnalysisId(a.id)}
                >
                  <div className="history-item-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="file-icon">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="history-filename" title={a.filename}>{a.filename}</span>
                  </div>
                  <div className="history-meta-row">
                    <span className="history-vendor">{a.vendor || 'Unknown Vendor'}</span>
                    <span className="history-amount">{a.amount || 'N/A'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Center column: Document details */}
        <div className="analyzer-details-container">
          {activeAnalysis ? (
            <div className="details-scrollable">
              <div className="analyzer-card">
                <h3 className="analyzer-card-title">Extracted Invoice Details</h3>
                <div className="analysis-grid">
                  <div className="grid-item">
                    <span className="grid-label">Vendor Name</span>
                    <span className="grid-value" title={activeAnalysis.vendor}>{activeAnalysis.vendor || '—'}</span>
                  </div>
                  <div className="grid-item">
                    <span className="grid-label">Total Amount</span>
                    <span className="grid-value" style={{ color: 'var(--accent-color)', fontWeight: 700 }}>
                      {activeAnalysis.amount || '—'}
                    </span>
                  </div>
                  <div className="grid-item">
                    <span className="grid-label">Payment Due Date</span>
                    <span className="grid-value">{activeAnalysis.due_date || '—'}</span>
                  </div>
                  <div className="grid-item">
                    <span className="grid-label">Invoice Number</span>
                    <span className="grid-value">{activeAnalysis.invoice_number || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="analyzer-card" style={{ marginTop: '20px' }}>
                <h3 className="analyzer-card-title">AI Summary</h3>
                <p className="summary-text">{activeAnalysis.summary}</p>
              </div>

              <div className="analyzer-card" style={{ marginTop: '20px' }}>
                <div 
                  className="collapsible-header"
                  onClick={() => setShowRawText(!showRawText)}
                >
                  <h3 className="analyzer-card-title" style={{ margin: 0 }}>Raw Extracted Text</h3>
                  <button className="text-link-btn" style={{ fontSize: '12px' }}>
                    {showRawText ? 'Hide text' : 'Show text'}
                  </button>
                </div>
                {showRawText && (
                  <pre className="raw-text-block">{activeAnalysis.raw_text}</pre>
                )}
              </div>
            </div>
          ) : (
            <div className="analyzer-empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="empty-state-icon">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <circle cx="10" cy="13" r="2" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <h3>No Document Selected</h3>
              <p>Upload a PDF invoice, bill, or receipt on the left to start analyzing context.</p>
            </div>
          )}
        </div>

        {/* Right column: Chat interface */}
        <div className="analyzer-chat-container">
          <div className="chat-header-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="chat-header-icon">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="chat-header-title">Ask AI Context</span>
          </div>

          <div className="chat-feed">
            {activeAnalysis ? (
              activeAnalysis.chat_history.map((msg, index) => (
                <div key={index} className={`chat-bubble-wrapper ${msg.role}`}>
                  <div className={`chat-bubble ${msg.role}`}>
                    {msg.content}
                  </div>
                </div>
              ))
            ) : (
              <div className="chat-empty-feed">
                <p>Upload a PDF document to query details about amounts, line items, and terms.</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="chat-input-form">
            <input
              type="text"
              className="chat-input-field"
              placeholder={activeAnalysis ? "Ask a question about this file..." : "Select a file to start chat..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!activeAnalysis || isSendingChat}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!activeAnalysis || !chatInput.trim() || isSendingChat}
              title="Send prompt to AI"
            >
              {isSendingChat ? (
                <span className="btn-spinner" style={{ width: '12px', height: '12px' }}></span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
