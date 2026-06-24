import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      const isChunkError = error?.name === 'ChunkLoadError' ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Unexpected token');

      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f5f5f5', fontFamily: "'Nunito', sans-serif", padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)', width: '100%', maxWidth: 400,
            textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#FEF3C7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.5rem', color: '#D97706' }} />
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>
              {isChunkError ? 'Falha ao carregar página' : 'Algo deu errado'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 20px', lineHeight: 1.5 }}>
              {isChunkError
                ? 'O conteúdo da página não pôde ser carregado. Tente novamente.'
                : 'Ocorreu um erro inesperado. Tente novamente.'}
            </p>
            <button
              onClick={this.handleRetry}
              style={{
                background: '#D40511', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 32px', fontSize: '0.9rem',
                fontWeight: 600, cursor: 'pointer', width: '100%',
              }}
            >
              <i className="fas fa-redo" style={{ marginRight: 8 }} />
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
