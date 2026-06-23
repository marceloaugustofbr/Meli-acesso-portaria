import React from 'react';

export default function Loading({ fullPage = false, text = 'Carregando...' }) {
  return (
    <div style={fullPage
      ? { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }
      : { padding: '2rem', textAlign: 'center' }
    }>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ position: 'relative', width: 48, height: 48 }}>
          <div style={{
            position: 'absolute', inset: 0,
            border: '4px solid #f0f0f0',
            borderTopColor: '#D40511',
            borderRadius: '50%',
            animation: 'safeacess-spin 0.8s linear infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 6,
            border: '3px solid transparent',
            borderTopColor: '#FFD700',
            borderRadius: '50%',
            animation: 'safeacess-spin 1.2s linear infinite reverse',
          }} />
        </div>
        {text && (
          <p style={{ fontSize: '0.85rem', color: '#888', fontWeight: 500, letterSpacing: '0.02em', margin: 0 }}>
            {text}
          </p>
        )}
      </div>
      <style>{`
        @keyframes safeacess-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
