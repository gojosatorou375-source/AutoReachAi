import React, { useState } from 'react';
import LogoImage from '../assets/logo.jpg';

// Google Brand SVG Icon
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="google-icon" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

function Login({ onLogin, API_BASE, showToast }) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [emailInput, setEmailInput] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [gmailPassword, setGmailPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showGmailPassword, setShowGmailPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGooglePassword, setCustomGooglePassword] = useState('');
  const [showCustomGooglePassword, setShowCustomGooglePassword] = useState(false);
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  // Manual Email login and Gmail sync
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    const pass = localPassword.trim();
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!pass) {
      setErrorMsg('Please enter your password.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.includes('@') && !emailRegex.test(email)) {
      setErrorMsg('Please enter a valid email address format.');
      return;
    }

    setIsLoggingIn(true);
    setErrorMsg('');

    try {
      if (authMode === 'signup') {
        // 1. Sign up user
        const signupRes = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: pass,
            gmail_password: gmailPassword.trim() || null
          }),
        });

        const signupData = await signupRes.json();
        if (!signupRes.ok) {
          throw new Error(signupData.detail || 'Sign up failed.');
        }
        showToast('Account created successfully! Logging in...', 'success');
      }

      // 2. Log in user
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: pass,
        }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData.detail || 'Login failed.');
      }

      // 3. Trigger Gmail sync after successful login
      try {
        const syncRes = await fetch(`${API_BASE}/threads/sync-gmail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: email,
            gmail_password: '', // will fetch from DB!
          }),
        });
        const syncData = await syncRes.json();
        if (syncRes.ok) {
          if (syncData.mock) {
            showToast('Signed in with demonstration mock data.', 'success');
          } else {
            showToast(`Connected! Synced ${syncData.synced_count} outbound threads from Gmail.`, 'success');
          }
        }
      } catch (syncErr) {
        console.error('Gmail sync on login failed:', syncErr);
        showToast('Gmail sync failed on sign-in. You can sync again from settings.', 'warning');
      }

      // 4. Authenticate session
      onLogin(email);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      showToast(err.message, 'danger');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Account list chooser selection (background auto-sync)
  const handleSelectGoogleAccount = async (email) => {
    setIsLoggingIn(true);
    setIsGoogleModalOpen(false);
    try {
      // Mock signup for Google login if not exists
      await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: 'google_mock_password',
          gmail_password: ''
        }),
      });
    } catch (e) {
      // Ignore signup error if already exists
    }

    try {
      // Log in
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: 'google_mock_password',
        }),
      });
      if (!loginRes.ok) {
        throw new Error('Google authentication login failed.');
      }

      const response = await fetch(`${API_BASE}/threads/sync-gmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: email,
          gmail_password: '',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Gmail sync failed.');
      }

      showToast(`Connected ${email} and synced threads successfully!`, 'success');
      onLogin(email);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'danger');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Custom Google account submission
  const handleCustomGoogleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = customGoogleEmail.trim();
    const cleanPassword = customGooglePassword.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      alert('Please enter a valid Google Account email address.');
      return;
    }

    setIsLoggingIn(true);
    setIsGoogleModalOpen(false);
    try {
      // Create account
      await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: 'google_mock_password',
          gmail_password: cleanPassword
        }),
      });
    } catch (e) {
      // Ignore if user already exists, update Google password
      try {
        await fetch(`${API_BASE}/auth/update-gmail?email=${encodeURIComponent(cleanEmail)}&gmail_password=${encodeURIComponent(cleanPassword)}`, {
          method: 'POST'
        });
      } catch (err) {
        console.error(err);
      }
    }

    try {
      // Log in
      await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: 'google_mock_password',
        }),
      });

      const response = await fetch(`${API_BASE}/threads/sync-gmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: cleanEmail,
          gmail_password: cleanPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Gmail sync failed.');
      }

      showToast(`Connected ${cleanEmail} successfully!`, 'success');
      onLogin(cleanEmail);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'danger');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Branding header */}
        <div className="login-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <img src={LogoImage} alt="AutoReach AI Logo" style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'cover', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }} />
          <h1 className="login-title" style={{ margin: 0 }}>AutoReach AI</h1>
          <p className="login-subtitle" style={{ marginTop: '4px' }}>AI-powered Priority Triage & Email Auto-Responder</p>
        </div>

        {/* Action controls */}
        <div className="login-actions">
          {/* Toggles for Sign In / Sign Up */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setErrorMsg(''); }}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: authMode === 'signin' ? '2px solid #0071e3' : 'none',
                color: authMode === 'signin' ? '#0071e3' : 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: authMode === 'signup' ? '2px solid #0071e3' : 'none',
                color: authMode === 'signup' ? '#0071e3' : 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Create Account
            </button>
          </div>

          {/* Manual Email Form */}
          <form onSubmit={handleManualSubmit} className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="login-email" className="field-label">
                Email Address
              </label>
              <input
                id="login-email"
                type="text"
                className="input-field"
                placeholder="you@gmail.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                disabled={isLoggingIn}
              />
            </div>

            {/* AutoReach Password */}
            <div className="form-group">
              <label htmlFor="login-password" className="field-label">
                Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="input-field"
                  placeholder="AutoReach Password"
                  value={localPassword}
                  onChange={(e) => {
                    setLocalPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  disabled={isLoggingIn}
                  style={{ paddingRight: '45px' }}
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
            </div>

            {/* Google App Password (optional) - Sign Up Only */}
            {authMode === 'signup' && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="gmail-password" className="field-label">
                    Google App Password
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>(Optional)</span>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="gmail-password"
                    type={showGmailPassword ? "text" : "password"}
                    className="input-field"
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={gmailPassword}
                    onChange={(e) => {
                      setGmailPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    disabled={isLoggingIn}
                    style={{ paddingRight: '45px' }}
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
                    onClick={() => setShowGmailPassword(!showGmailPassword)}
                  >
                    {showGmailPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block', lineHeight: '1.4' }}>
                  Required to sync your Gmail sent messages. Generate a 16-character App Password in your Google Account settings.
                </span>
              </div>
            )}

            {errorMsg && <div className="login-error" style={{ color: '#E30000', fontSize: '12px', marginTop: '-4px' }}>{errorMsg}</div>}

            <button 
              type="submit" 
              className={`btn btn-primary ${isLoggingIn ? 'btn-loading' : ''}`}
              disabled={isLoggingIn}
              style={{ width: '100%', marginTop: '8px', padding: '12px' }}
            >
              {isLoggingIn ? (
                <>
                  <span className="btn-spinner"></span>
                  {authMode === 'signin' ? "Signing In..." : "Creating Account..."}
                </>
              ) : (authMode === 'signin' ? "Sign In" : "Create Account")}
            </button>
          </form>

          {/* Google SSO Button */}
          <div className="divider" style={{ margin: '20px 0 10px 0' }}>or connect with Google</div>
          <button 
            type="button" 
            className="google-btn" 
            onClick={() => setIsGoogleModalOpen(true)}
            disabled={isLoggingIn}
            style={{ width: '100%' }}
          >
            <GoogleIcon />
            Sign in with Google
          </button>
        </div>
      </div>

      {/* Simulated Google OAuth Dialog Box overlay */}
      {isGoogleModalOpen && (
        <div className="oauth-overlay" onClick={() => setIsGoogleModalOpen(false)}>
          <div className="oauth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="oauth-header">
              <svg viewBox="0 0 24 24" className="oauth-google-logo" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <h2 className="oauth-title">Choose an account</h2>
              <p className="oauth-subtitle">to continue to <strong>AutoReach AI</strong></p>
            </div>

            <div className="oauth-accounts">
              {/* Account 1: Mohan */}
              <button 
                type="button" 
                className="oauth-account-row" 
                onClick={() => handleSelectGoogleAccount('mohan.autoreach@gmail.com')}
                disabled={isLoggingIn}
              >
                <div className="oauth-avatar oauth-avatar-google">M</div>
                <div className="oauth-account-info">
                  <span className="oauth-account-name">Mohan Kumar</span>
                  <span className="oauth-account-email">mohan.autoreach@gmail.com</span>
                </div>
              </button>

              {/* Account 2: Guest */}
              <button 
                type="button" 
                className="oauth-account-row" 
                onClick={() => handleSelectGoogleAccount('guest.user@gmail.com')}
                disabled={isLoggingIn}
              >
                <div className="oauth-avatar">G</div>
                <div className="oauth-account-info">
                  <span className="oauth-account-name">Guest Operator</span>
                  <span className="oauth-account-email">guest.user@gmail.com</span>
                </div>
              </button>

              {/* Toggle custom input */}
              {!showCustomGoogleInput ? (
                <button 
                  type="button" 
                  className="oauth-account-row" 
                  onClick={() => setShowCustomGoogleInput(true)}
                  disabled={isLoggingIn}
                >
                  <div className="oauth-avatar" style={{ backgroundColor: '#F1F3F4', color: '#5F6368' }}>+</div>
                  <div className="oauth-account-info">
                    <span className="oauth-account-name" style={{ color: '#1A73E8' }}>Use another account</span>
                  </div>
                </button>
              ) : (
                <form onSubmit={handleCustomGoogleSubmit} className="oauth-custom-input">
                  <input
                    type="email"
                    placeholder="Enter Google account email"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    disabled={isLoggingIn}
                    required
                  />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', margin: '4px 0' }}>
                    <input
                      type={showCustomGooglePassword ? "text" : "password"}
                      placeholder="App Password (Optional for mock)"
                      value={customGooglePassword}
                      onChange={(e) => setCustomGooglePassword(e.target.value)}
                      disabled={isLoggingIn}
                      style={{ paddingRight: '45px' }}
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#1A73E8',
                      }}
                      onClick={() => setShowCustomGooglePassword(!showCustomGooglePassword)}
                    >
                      {showCustomGooglePassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                      onClick={() => setShowCustomGoogleInput(false)}
                      disabled={isLoggingIn}
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: '#1A73E8', borderColor: '#1A73E8' }}
                      disabled={isLoggingIn}
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="oauth-footer">
              <button 
                type="button" 
                className="text-link-btn" 
                style={{ fontSize: '12px', textDecoration: 'none', color: '#5F6368' }}
                onClick={() => setIsGoogleModalOpen(false)}
                disabled={isLoggingIn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
