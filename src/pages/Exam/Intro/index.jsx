import React from 'react';
import { useHistory } from 'react-router-dom';
import { useExamStore } from '../../../store';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';

export default function ExamIntro() {
  const history = useHistory();
  const setStep = useExamStore((s) => s.setStep);

  const handleCheckResult = () => {
    setStep('check');
    history.push(ROUTES.EXAM_CHECK);
  };

  const handleStartExam = () => {
    setStep('check');
    history.push(ROUTES.EXAM_CHECK);
  };

  const cardStyle = {
    flex: 1,
    minWidth: 220,
    background: '#fff',
    border: '2px solid #eee',
    borderRadius: 16,
    padding: '2rem 1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
  };

  return (
    <ExamLayout>
      <div className="stagger">
        <div className="has-text-centered" style={{ marginBottom: '2rem' }}>
          <div style={{ margin: '0 auto 1.25rem', textAlign: 'center' }}>
            <img
              src="/LOGOSAFEACESS.webp"
              alt="SafeAcess"
              style={{ width: 200, userSelect: 'none', WebkitUserDrag: 'none' }}
              draggable="false"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>

          <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
            Plataforma de treinamento e liberação de acesso às operações da DHL.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div
            className="ripple-btn"
            style={cardStyle}
            onClick={handleCheckResult}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#D40511';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,5,17,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#eee';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #28A745 0%, #1e7e34 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '1.25rem',
              }}
            >
              <i className="fas fa-clipboard-check" />
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#333', margin: '0 0 0.5rem' }}>
              Consultar Resultado
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.5, margin: 0 }}>
              Já fez o treinamento? Confira seu status aqui.
            </p>
          </div>

          <div
            className="ripple-btn"
            style={cardStyle}
            onClick={handleStartExam}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#D40511';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,5,17,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#eee';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #D40511 0%, #a30310 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '1.25rem',
              }}
            >
              <i className="fas fa-graduation-cap" />
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#333', margin: '0 0 0.5rem' }}>
              Iniciar Treinamento
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.5, margin: 0 }}>
              Novo por aqui? Assista ao vídeo e responda as perguntas.
            </p>
          </div>
        </div>
      </div>
    </ExamLayout>
  );
}
