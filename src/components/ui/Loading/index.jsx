import React from 'react';

export default function Loading({ fullPage = false, text = 'Carregando...' }) {
  return (
    <div style={fullPage
      ? { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }
      : { padding: '2rem', textAlign: 'center' }
    }>
      <div>
        <span className="icon is-large">
          <i className="fas fa-spinner fa-pulse fa-2x has-text-primary" />
        </span>
        {text && <p className="mt-2 has-text-grey">{text}</p>}
      </div>
    </div>
  );
}
