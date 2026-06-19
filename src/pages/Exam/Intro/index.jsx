import React from 'react';
import { useHistory } from 'react-router-dom';
import { useExamStore } from '../../../store';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';

export default function ExamIntro() {
  const history = useHistory();
  const setStep = useExamStore((s) => s.setStep);

  const handleStart = () => {
    setStep('check');
    history.push(ROUTES.EXAM_CHECK);
  };

  return (
    <ExamLayout>
      <div className="stagger">
        <div className="has-text-centered">
          <div style={{ margin: '0 auto 1.25rem', textAlign: 'center' }}>
            <img src="/dhl-logov2.png" alt="DHL" style={{ width: 144 }} />
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#D40511', margin: '0 0 0.5rem' }}>
            Treinamento de Segurança Obrigatório
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 1.5rem' }}>
            Para ter acesso às operações da DHL, é obrigatório a realização do treinamento de segurança.
            <br /><br />
            Somente após a conclusão e aprovação, você será <strong>liberado na portaria</strong> para acessar as operações.
          </p>
        </div>

        <div style={{
          background: '#F5F5F5',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
        }}>
          <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.75rem', color: '#444' }}>Etapas do Treinamento:</p>
          <ul style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.8, margin: 0, paddingLeft: '1.25rem' }}>
            <li>Assista ao vídeo completo sobre segurança</li>
            <li>Responda <strong>23 perguntas</strong> sobre o conteúdo</li>
            <li>Aprovação com no mínimo <strong style={{ color: '#D40511' }}>70%</strong> de acertos (16/23)</li>
            <li>Leia e concorde com os <strong>Termos de Segurança</strong></li>
            <li>Assine digitalmente ao final</li>
          </ul>
        </div>

        <div className="has-text-centered">
          <button className="btn-dhl ripple-btn" onClick={handleStart} style={{ padding: '0.85rem 2.5rem', fontSize: '1rem' }}>
            <i className="fas fa-play" style={{ fontSize: '0.85rem' }} />
            INICIAR
          </button>
        </div>
      </div>
    </ExamLayout>
  );
}
