'use client';

import { useEffect } from 'react';

export default function ResetPasswordPage() {
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    
    if (hash || search) {
      const deepLink = 'fantasychess://reset-password' + hash + search;
      window.location.href = deepLink;
      
      setTimeout(() => {
        const messageEl = document.getElementById('message');
        if (messageEl) {
          messageEl.innerHTML = 
            'If the app didn\'t open automatically, please make sure Fantasy Chess is installed on your device.<br><br><a href="' + deepLink + '" style="color: #2563eb; text-decoration: underline;">Tap here to try again</a>';
        }
      }, 2000);
    } else {
      const messageEl = document.getElementById('message');
      if (messageEl) {
        messageEl.innerHTML = 'Invalid reset link. Please request a new password reset from the app.';
      }
    }
  }, []);

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      margin: 0,
      textAlign: 'center'
    }}>
      <div style={{ maxWidth: '400px', padding: '40px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>Reset Password</h1>
        <div style={{
          border: '4px solid #334155',
          borderTop: '4px solid #2563eb',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          margin: '20px auto'
        }} />
        <p id="message" style={{ fontSize: '18px', color: '#94a3b8' }}>
          Opening Fantasy Chess app...
        </p>
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
