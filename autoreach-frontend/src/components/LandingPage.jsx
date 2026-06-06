import React, { useEffect, useRef, useState } from 'react';

import LogoImage from '../assets/logo.jpg';

// Apple Cobalt Blue Accent Color
const ACCENT_COLOR = '#0071e3';

// Features SVGs for elegant visual graphics
const ThreadDetectionGraphic = () => (
  <svg viewBox="0 0 400 220" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ background: '#FAF8F5', borderRadius: '4px', border: '1px solid #E8E2D8' }}>
    {/* Grid Lines */}
    <line x1="40" y1="40" x2="360" y2="40" stroke="#E8E2D8" strokeDasharray="4" />
    <line x1="40" y1="110" x2="360" y2="110" stroke="#E8E2D8" strokeDasharray="4" />
    <line x1="40" y1="180" x2="360" y2="180" stroke="#E8E2D8" strokeDasharray="4" />
    
    {/* Thread A (Active) */}
    <circle cx="60" cy="40" r="6" fill="#0071e3" />
    <text x="80" y="44" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#1E1E1C">Sent Outbound Email</text>
    <path d="M 60 40 L 220 40" stroke="#0071e3" strokeWidth="2" strokeDasharray="4 4" />
    <circle cx="220" cy="40" r="6" fill="#34A853" />
    <text x="235" y="44" fontFamily="Inter" fontSize="10" fontWeight="500" fill="#5C5852">Replied (Active)</text>

    {/* Thread B (Stale) */}
    <circle cx="60" cy="110" r="6" fill="#8C7853" />
    <text x="80" y="114" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#1E1E1C">Sent pitch to VC</text>
    <path d="M 60 110 L 300 110" stroke="#A6A097" strokeWidth="2" />
    <line x1="180" y1="100" x2="180" y2="120" stroke="#A6A097" strokeWidth="1.5" />
    <text x="186" y="98" fontFamily="Playfair Display" fontStyle="italic" fontSize="9" fill="#5C5852">7 days limit reached</text>
    <circle cx="300" cy="110" r="6" fill="#EA4335" />
    <text x="315" y="114" fontFamily="Inter" fontSize="10" fontWeight="600" fill="#EA4335">STALE</text>

    {/* Thread C (Monitoring) */}
    <circle cx="60" cy="180" r="6" fill="#8C7853" />
    <text x="80" y="184" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#1E1E1C">Follow-up draft ready</text>
    <path d="M 60 180 L 160 180" stroke="#8C7853" strokeWidth="2" strokeDasharray="3 3" />
    <circle cx="160" cy="180" r="6" fill="#0071e3" />
  </svg>
);

const AIDraftingGraphic = () => (
  <svg viewBox="0 0 400 220" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ background: '#1E1E1C', borderRadius: '4px' }}>
    {/* Left Box: Original Context */}
    <rect x="30" y="40" width="140" height="130" rx="3" fill="#2D2D2A" stroke="#3E3E3A" />
    <text x="42" y="60" fontFamily="Inter" fontSize="9" fontWeight="600" fill="#A6A097">ORIGINAL EMAIL</text>
    <text x="42" y="80" fontFamily="Inter" fontSize="8" fill="#FAF8F5">Hi Sarah, following up</text>
    <text x="42" y="94" fontFamily="Inter" fontSize="8" fill="#FAF8F5">regarding our API sync</text>
    <text x="42" y="108" fontFamily="Inter" fontSize="8" fill="#FAF8F5">let me know when free...</text>
    
    {/* Connecting Flow Arrow */}
    <path d="M 185 105 L 215 105" stroke="#8C7853" strokeWidth="2" fill="none" />
    <polygon points="215,101 223,105 215,109" fill="#8C7853" />
    <text x="180" y="125" fontFamily="Playfair Display" fontStyle="italic" fontSize="9" fill="#8C7853">AI Restructure</text>

    {/* Right Box: AI Draft Output */}
    <rect x="230" y="40" width="140" height="130" rx="3" fill="#2D2D2A" stroke="#8C7853" strokeWidth="1.2" />
    <text x="242" y="60" fontFamily="Inter" fontSize="9" fontWeight="600" fill="#8C7853">GENERATED DRAFT</text>
    <text x="242" y="80" fontFamily="Inter" fontSize="8" fill="#FAF8F5">Hi Sarah,</text>
    <text x="242" y="94" fontFamily="Inter" fontSize="8" fill="#FAF8F5">Hope you are well. I know</text>
    <text x="242" y="108" fontFamily="Inter" fontSize="8" fill="#FAF8F5">things get busy. Do you</text>
    <text x="242" y="122" fontFamily="Inter" fontSize="8" fill="#FAF8F5">have 10 mins this week?</text>
    
    <rect x="242" y="142" width="50" height="16" rx="2" fill="#0071e3" />
    <text x="252" y="153" fontFamily="Inter" fontSize="7" fontWeight="600" fill="#FFFFFF">Approve & Send</text>
  </svg>
);

const MetricsGraphic = () => (
  <svg viewBox="0 0 400 220" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ background: '#FAF8F5', borderRadius: '4px', border: '1px solid #E8E2D8' }}>
    {/* Graph Bar 1 */}
    <rect x="80" y="120" width="40" height="60" rx="2" fill="#D0C8BB" />
    <text x="100" y="110" fontFamily="Inter" fontSize="10" fontWeight="600" textAnchor="middle" fill="#5C5852">12%</text>
    <text x="100" y="195" fontFamily="Inter" fontSize="8" fontWeight="600" textAnchor="middle" fill="#5C5852">Before AI</text>

    {/* Graph Bar 2 */}
    <rect x="180" y="60" width="40" height="120" rx="2" fill="#0071e3" />
    <text x="200" y="50" fontFamily="Inter" fontSize="12" fontWeight="700" textAnchor="middle" fill="#0071e3">46%</text>
    <text x="200" y="195" fontFamily="Inter" fontSize="8" fontWeight="600" textAnchor="middle" fill="#5C5852">With AutoReach</text>
    
    {/* Stat Label */}
    <rect x="250" y="80" width="110" height="60" rx="4" fill="#FFFFFF" stroke="#E8E2D8" />
    <text x="305" y="105" fontFamily="Playfair Display" fontStyle="italic" fontSize="11" textAnchor="middle" fill="#5C5852">Reply Rate Boost</text>
    <text x="305" y="130" fontFamily="Inter" fontSize="18" fontWeight="700" textAnchor="middle" fill="#34A853">+34%</text>
  </svg>
);

function LandingPage({ onGetStarted }) {
  const [activeNav, setActiveNav] = useState('home');

  // Scrollytelling scroll animation hooks
  const sectionRefs = useRef([]);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.15,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      sectionRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  const addToRefs = (el) => {
    if (el && !sectionRefs.current.includes(el)) {
      sectionRefs.current.push(el);
    }
  };

  return (
    <div className="landing-container" style={{ backgroundColor: '#FAF8F5', color: '#1E1E1C', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. Transparent Apple Sticky Navigation Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(250, 248, 245, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #E8E2D8',
        zIndex: 100,
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={LogoImage} alt="AutoReach AI Logo" style={{ height: '32px', width: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.05)' }} />
            <span style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em' }}>AutoReach AI</span>
          </div>
          <nav style={{ display: 'flex', gap: '20px' }}>
            <a href="#features" className="landing-nav-link" style={{ fontSize: '12px', color: '#5C5852', textDecoration: 'none', fontWeight: 500 }}>Features</a>
            <a href="#tech" className="landing-nav-link" style={{ fontSize: '12px', color: '#5C5852', textDecoration: 'none', fontWeight: 500 }}>Tech Stack</a>
          </nav>
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '6px 14px', fontSize: '11px', borderRadius: '20px', border: '1px solid #D0C8BB' }}
          onClick={onGetStarted}
        >
          Sign In
        </button>
      </header>

      {/* 2. Hero Section (Aesthetic, Bold, White Space) */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '120px 24px 100px 24px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, color: '#8C7853', marginBottom: '20px' }}>
          AI-Powered Priority Triage
        </span>
        <h1 style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '56px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: '1.08',
          color: '#1E1E1C',
          marginBottom: '24px'
        }}>
          Outbound follow-ups.<br />
          <span style={{ color: '#8C7853' }}>Handled beautifully.</span>
        </h1>
        <p style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontStyle: 'italic',
          fontSize: '18px',
          lineHeight: '1.6',
          color: '#5C5852',
          maxWidth: '620px',
          marginBottom: '40px'
        }}>
          AutoReach monitors your outbound emails. If a thread goes cold for 7 days, it parses the context, runs a sentiment analysis, and prepares a high-converting follow-up.
        </p>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button 
            className="btn btn-primary" 
            style={{
              backgroundColor: ACCENT_COLOR,
              borderColor: ACCENT_COLOR,
              color: '#FFFFFF',
              padding: '12px 28px',
              fontSize: '14px',
              borderRadius: '24px',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(0, 113, 227, 0.25)'
            }}
            onClick={onGetStarted}
          >
            Get Started
          </button>
          <a href="#features" className="text-link-btn" style={{ fontSize: '13px', textDecoration: 'none', color: '#1E1E1C', fontWeight: 600 }}>
            Learn features →
          </a>
        </div>
      </section>

      {/* 3. Cinematic Scrollytelling Sections */}
      <section id="features" style={{ padding: '40px 20px 100px 20px', maxWidth: '1080px', margin: '0 auto' }}>
        
        {/* Scrolly Section 1: Dead-Thread Monitoring */}
        <div ref={addToRefs} className="scrolly-section" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.1fr',
          gap: '80px',
          alignItems: 'center',
          minHeight: '380px',
          padding: '60px 0',
          borderBottom: '1px solid #E8E2D8',
          opacity: 0,
          transform: 'translateY(40px)',
          transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)'
        }}>
          <div>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, color: '#8C7853', display: 'block', marginBottom: '12px' }}>
              01 / PERSISTENT SCANNING
            </span>
            <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '32px', fontWeight: 600, lineHeight: '1.25', marginBottom: '20px' }}>
              Dead-Thread Monitoring
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#5C5852', marginBottom: '16px' }}>
              AutoReach hooks into your mailbox and daily runs an automated scan. If a thread goes cold for 7 days, it verifies with Gmail IMAP to confirm there are no reply logs.
            </p>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#5C5852' }}>
              No manual follow-up calendars or spreadsheets are needed. Set the parameters, and let the background worker manage active conversations.
            </p>
          </div>
          <div>
            <ThreadDetectionGraphic />
          </div>
        </div>

        {/* Scrolly Section 2: AI Restructure & Drafting */}
        <div ref={addToRefs} className="scrolly-section" style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          gap: '80px',
          alignItems: 'center',
          minHeight: '380px',
          padding: '60px 0',
          borderBottom: '1px solid #E8E2D8',
          opacity: 0,
          transform: 'translateY(40px)',
          transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)'
        }}>
          <div style={{ order: window.innerWidth > 768 ? 0 : 1 }}>
            <AIDraftingGraphic />
          </div>
          <div style={{ order: window.innerWidth > 768 ? 1 : 0 }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, color: '#8C7853', display: 'block', marginBottom: '12px' }}>
              02 / LLM RESTRUCTURING
            </span>
            <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '32px', fontWeight: 600, lineHeight: '1.25', marginBottom: '20px' }}>
              Context-Aware AI Drafting
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#5C5852', marginBottom: '16px' }}>
              When a thread qualifies as stale, AutoReach passes the original email body to OpenAI. It extracts key user intent and crafts a highly personalized, non-pushy follow-up.
            </p>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#5C5852' }}>
              If the LLM request experiences timeouts or rate-limiting, the system automatically writes a professional fallback draft so you never lose communication velocity.
            </p>
          </div>
        </div>

        {/* Scrolly Section 3: Performance metrics */}
        <div ref={addToRefs} className="scrolly-section" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.1fr',
          gap: '80px',
          alignItems: 'center',
          minHeight: '380px',
          padding: '60px 0',
          opacity: 0,
          transform: 'translateY(40px)',
          transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)'
        }}>
          <div>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, color: '#8C7853', display: 'block', marginBottom: '12px' }}>
              03 / SUCCESS METRICS
            </span>
            <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '32px', fontWeight: 600, lineHeight: '1.25', marginBottom: '20px' }}>
              Designed for Results
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#5C5852', marginBottom: '16px' }}>
              Analyze performance parameters transparently. Track reply rates, tokens burned, and observe how automated follow-up drafts boost response rates by up to 34%.
            </p>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#5C5852' }}>
              Keep your team in sync with clear badges, count notifications, and an editorial dashboard that values speed and focus.
            </p>
          </div>
          <div>
            <MetricsGraphic />
          </div>
        </div>

      </section>

      {/* 4. Tech Stack Overview */}
      <section id="tech" style={{ backgroundColor: '#F4EFEA', padding: '80px 20px', borderTop: '1px solid #E8E2D8', borderBottom: '1px solid #E8E2D8' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: '#8C7853', display: 'block', marginBottom: '16px' }}>
            ENGINEERED FOR SCALE
          </span>
          <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '36px', fontWeight: 600, color: '#1E1E1C', marginBottom: '40px' }}>
            A Modern, Full-Stack Stack
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '4px', border: '1px solid #E8E2D8' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E1E1C', marginBottom: '8px' }}>FastAPI</h3>
              <p style={{ fontSize: '12px', color: '#5C5852', lineHeight: '1.5' }}>Asynchronous API backend processing threads.</p>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '4px', border: '1px solid #E8E2D8' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E1E1C', marginBottom: '8px' }}>React</h3>
              <p style={{ fontSize: '12px', color: '#5C5852', lineHeight: '1.5' }}>Minimalist, scannable editorial workspace dashboard.</p>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '4px', border: '1px solid #E8E2D8' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E1E1C', marginBottom: '8px' }}>MySQL</h3>
              <p style={{ fontSize: '12px', color: '#5C5852', lineHeight: '1.5' }}>Robust, relational data storage via async SQLAlchemy.</p>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '4px', border: '1px solid #E8E2D8' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E1E1C', marginBottom: '8px' }}>OpenAI</h3>
              <p style={{ fontSize: '12px', color: '#5C5852', lineHeight: '1.5' }}>Context-aware restructuring engine via GPT models.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Apple CTA Footer */}
      <footer style={{ backgroundColor: '#1E1E1C', color: '#FAF8F5', padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontStyle: 'italic', fontSize: '32px', fontWeight: 600, color: '#FAF8F5', marginBottom: '16px' }}>
            Elevate your outbound workflows.
          </h2>
          <p style={{ fontSize: '14px', color: '#A6A097', lineHeight: '1.6', marginBottom: '32px' }}>
            Join professionals who trust AutoReach to monitor their priority email relationships. Connect your account in minutes.
          </p>
          <button 
            className="btn btn-primary" 
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#FFFFFF',
              color: '#1E1E1C',
              padding: '12px 32px',
              fontSize: '14px',
              borderRadius: '24px',
              fontWeight: 600
            }}
            onClick={onGetStarted}
          >
            Get Started Free
          </button>
          
          <div style={{ marginTop: '80px', borderTop: '1px solid #3E3E3A', paddingTop: '24px', fontSize: '11px', color: '#A6A097', display: 'flex', justifyContent: 'space-between' }}>
            <span>© 2026 AutoReach AI. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Injecting scroll fade-in styling rules */}
      <style>{`
        .scrolly-section.visible {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .landing-nav-link:hover {
          color: #1E1E1C !important;
        }
      `}</style>
    </div>
  );
}

export default LandingPage;
