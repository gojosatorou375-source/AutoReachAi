import React, { useState, useEffect } from 'react';
import { CloseIcon, SaveIcon } from './Icons';

export default function AddThreadDrawer({ isOpen, onClose, userId, API_BASE, showToast, refreshData }) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [originalBody, setOriginalBody] = useState('');
  const [sentAt, setSentAt] = useState('');
  const [intentTag, setIntentTag] = useState('other');
  const [urgencyScore, setUrgencyScore] = useState(20);

  // Set default date-time to local current time when opened
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setSentAt(now.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      user_id: userId,
      recipient_name: recipientName.trim(),
      recipient_email: recipientEmail.trim(),
      subject: subject.trim(),
      original_body: originalBody.trim(),
      sent_at: new Date(sentAt).toISOString(),
      intent_tag: intentTag,
      urgency_score: parseInt(urgencyScore, 10),
    };

    try {
      const response = await fetch(`${API_BASE}/threads/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Could not register thread.');
      }

      showToast('Outbound conversation registered successfully.', 'success');
      // Reset form
      setRecipientName('');
      setRecipientEmail('');
      setSubject('');
      setOriginalBody('');
      setIntentTag('other');
      setUrgencyScore(20);
      
      onClose();
      refreshData();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'danger');
    }
  };

  return (
    <>
      <div className={`drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div>
            <h3 className="drawer-title">Register Outbound Thread</h3>
            <p class="drawer-subtitle">Initialize monitoring on a new email thread.</p>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <form className="drawer-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Recipient Name</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Recipient Email</label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="name@domain.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject of outbound email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sent Email Body</label>
            <textarea
              required
              value={originalBody}
              onChange={(e) => setOriginalBody(e.target.value)}
              placeholder="Paste the content of the outbound email here..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sent Date & Time</label>
              <input
                type="datetime-local"
                required
                value={sentAt}
                onChange={(e) => setSentAt(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Conversation Intent</label>
              <select value={intentTag} onChange={(e) => setIntentTag(e.target.value)}>
                <option value="other">Other</option>
                <option value="job_application">Job Application</option>
                <option value="sales">Sales & Outreach</option>
                <option value="networking">Networking</option>
                <option value="internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <div className="slider-label-row">
              <label className="form-label">Urgency Weight</label>
              <span className="slider-value">{urgencyScore}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={urgencyScore}
              onChange={(e) => setUrgencyScore(e.target.value)}
              className="form-slider"
            />
            <p className="field-help">Affects priority scanning and AI draft generation tone selection.</p>
          </div>

          <div className="drawer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <SaveIcon />
              Save & Track
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
