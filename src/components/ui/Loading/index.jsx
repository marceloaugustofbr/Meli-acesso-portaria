import React from 'react';
import classNames from 'classnames';

export default function Loading({ fullPage = false, text = 'Carregando...' }) {
  return (
    <div className={classNames({ 'is-flex is-align-items-center is-justify-content-center': fullPage })} style={fullPage ? { minHeight: '100vh', width: '100%' } : { padding: '2rem', textAlign: 'center' }}>
      <div>
        <span className="icon is-large">
          <i className="fas fa-spinner fa-pulse fa-2x has-text-primary" />
        </span>
        {text && <p className="mt-2 has-text-grey">{text}</p>}
      </div>
    </div>
  );
}
