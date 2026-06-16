import React from 'react';
import { useHistory } from 'react-router-dom';
import { useExamStore } from '../../../store';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';

export default function ExamVideo() {
  const history = useHistory();
  const videoFinished = useExamStore((s) => s.videoFinished);
  const setVideoFinished = useExamStore((s) => s.setVideoFinished);
  const setStep = useExamStore((s) => s.setStep);

  const handleContinue = () => {
    setStep('identification');
    history.push(ROUTES.EXAM_IDENTIFICATION);
  };

  return (
    <ExamLayout>
      <div className="card">
        <div className="card-content">
          <h2 className="title is-5 mb-4">Assista ao vídeo de treinamento</h2>
          <div className="mb-4" style={{ background: '#000', borderRadius: 8, padding: '2rem', textAlign: 'center' }}>
            <p className="has-text-white">Player de vídeo</p>
            <p className="has-text-grey-light is-size-7 mt-2">
              URL do vídeo será configurada posteriormente
            </p>
          </div>
          {!videoFinished && (
            <button
              className="button is-light is-small mb-3"
              onClick={() => setVideoFinished()}
            >
              Simular término do vídeo
            </button>
          )}
          <div className="has-text-centered mt-4">
            <button
              className="button"
              disabled={!videoFinished}
              onClick={handleContinue}
              style={{ background: '#D40511', color: '#fff', border: 'none' }}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </ExamLayout>
  );
}
