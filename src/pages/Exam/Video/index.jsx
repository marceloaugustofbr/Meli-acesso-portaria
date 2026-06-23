import React, { useState, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useExamStore } from '../../../store';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';

const MIN_PROGRESS = 0.95;

export default function ExamVideo() {
  const history = useHistory();
  const videoRef = useRef(null);
  const lastTimeRef = useRef(0);
  const totalPlayedRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const videoFinished = useExamStore((s) => s.videoFinished);
  const setVideoFinished = useExamStore((s) => s.setVideoFinished);
  const setStep = useExamStore((s) => s.setStep);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration || videoEnded) return;

    const current = video.currentTime;
    const diff = current - lastTimeRef.current;
    lastTimeRef.current = current;

    // Só acumula progressão natural de reprodução: entre 0.1s e 5s por tick
    if (diff >= 0.1 && diff <= 5) {
      totalPlayedRef.current += diff;
    }

    const pct = Math.min(totalPlayedRef.current / video.duration, 1);
    setProgress(pct);
  }, [videoEnded]);

  const handleRateChange = () => {
    if (videoRef.current && videoRef.current.playbackRate !== 1) {
      videoRef.current.playbackRate = 1;
    }
  };

  const handleEnded = () => {
    setVideoEnded(true);
    setVideoFinished();
  };

  const handleContinue = () => {
    setStep('identification');
    history.push(ROUTES.EXAM_IDENTIFICATION);
  };

  const canContinue = videoFinished || videoEnded || progress >= MIN_PROGRESS;
  const progressPct = Math.round(progress * 100);

  return (
    <ExamLayout>
      <div className="card">
        <div className="card-content">
          <h2 className="title is-5 mb-4">Assista ao vídeo de treinamento</h2>
          <video
            ref={videoRef}
            controls
            controlsList="nodownload noremoteplayback"
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onRateChange={handleRateChange}
            style={{ width: '100%', borderRadius: 8, display: 'block' }}
            src="https://res.cloudinary.com/dl4n3ldua/video/upload/f_auto,q_auto/v1781823597/Integra%C3%A7%C3%A3o_Diaristas_-_Novo_lgi8jl.mp4"
          >
            <track kind="captions" src="" label="Português" />
            Seu navegador não suporta vídeo.
          </video>
          {!canContinue && (
            <div style={{ textAlign: 'center', margin: '0.75rem 0 0.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.35rem' }}>
                Assista ao vídeo completo para realizar a prova
              </p>
              <div style={{
                maxWidth: 300, margin: '0 auto', background: '#e9ecef', borderRadius: 4, height: 6, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progressPct}%`, height: '100%', background: '#D40511', borderRadius: 4,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '0.2rem', display: 'inline-block' }}>
                {progressPct}%
              </span>
            </div>
          )}
          {process.env.NODE_ENV === 'development' && !canContinue && (
            <button
              className="button is-light is-small mb-3"
              onClick={() => setVideoFinished()}
              style={{ display: 'block', margin: '0 auto' }}
            >
              Simular término do vídeo
            </button>
          )}
          <div className="has-text-centered mt-4">
            <button
              className="button"
              disabled={!canContinue}
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
