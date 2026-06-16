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
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #D40511, #9a030c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <i className="fas fa-shield-alt fa-2x" style={{ color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#D40511', margin: '0 0 0.5rem' }}>
            Treinamento de Segurança
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 1.5rem' }}>
            Bem-vindo ao treinamento de Segurança.
            <br />
            Antes de acessar nossas operações é obrigatório assistir ao treinamento,
            realizar a avaliação e concordar com os termos de segurança.
          </p>
        </div>

        <div style={{
          background: '#F5F5F5',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
        }}>
          <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.75rem', color: '#444' }}>Funcionamento da Prova:</p>
          <ul style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.8, margin: 0, paddingLeft: '1.25rem' }}>
            <li>Assista ao vídeo completo sobre segurança</li>
            <li>Responda <strong>10 perguntas</strong> sobre o conteúdo</li>
            <li>Aprovação com no mínimo <strong style={{ color: '#D40511' }}>70%</strong> de acertos (7/10)</li>
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
