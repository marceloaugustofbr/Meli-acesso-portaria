import React from 'react';
import { useHistory } from 'react-router-dom';
import { useExamStore } from '../../../store';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';

const steps = [
  {
    icon: 'fa-solid fa-video',
    title: 'Assista ao vídeo completo',
    desc: 'Assista ao vídeo sobre segurança até o final. Não é possível pular etapas.',
  },
  {
    icon: 'fa-solid fa-circle-question',
    title: 'Responda 23 perguntas',
    desc: 'Responda todas as perguntas sobre o conteúdo apresentado no vídeo.',
  },
  {
    icon: 'fa-solid fa-chart-line',
    title: 'Aprovação com 70% de acertos',
    desc: 'É necessário acertar no mínimo 16 das 23 perguntas para ser aprovado.',
  },
];

export default function ExamRules() {
  const history = useHistory();
  const setStep = useExamStore((s) => s.setStep);

  const handleStart = () => {
    setStep('video');
    history.push(ROUTES.EXAM_VIDEO);
  };

  return (
    <ExamLayout>
      <div className="stagger">
        <div className="has-text-centered" style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#D40511', margin: '0 0 0.5rem' }}>
            Regras do Treinamento
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
            Antes de iniciar, leia atentamente as regras abaixo:
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                background: '#F5F5F5',
                borderRadius: 12,
                padding: '1.25rem 1.5rem',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #D40511 0%, #a30310 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '1.1rem',
                }}
              >
                <i className={s.icon} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#333', margin: '0 0 0.25rem' }}>
                  {s.title}
                </p>
                <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.5, margin: 0 }}>
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="has-text-centered">
          <button
            className="btn-dhl is-large"
            onClick={handleStart}
          >
            <i className="fas fa-play" style={{ fontSize: '0.85rem' }} />
            ENTENDI, VAMOS COMEÇAR
          </button>
        </div>
      </div>
    </ExamLayout>
  );
}
