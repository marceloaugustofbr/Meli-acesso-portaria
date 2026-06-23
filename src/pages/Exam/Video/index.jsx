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
  const videoFinished = useExamStore((s) => s.videoFinished);
  const setVideoFinished = useExamStore((s) => s.setVideoFinished);
  const setStep = useExamStore((s) => s.setStep);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const current = video.currentTime;
    const diff = current - lastTimeRef.current;
    lastTimeRef.current = current;

    // Só acumula progressão natural de reprodução: entre 0.1s e 5s por tick
    if (diff >= 0.1 && diff <= 5) {
      totalPlayedRef.current += diff;
    }

    const pct = Math.min(totalPlayedRef.current / video.duration, 1);
    setProgress(pct);
  }, []);

  const handleRateChange = () => {
    if (videoRef.current && videoRef.current.playbackRate !== 1) {
      videoRef.current.playbackRate = 1;
    }
  };

  const handleEnded = () => {
    if (progress >= MIN_PROGRESS) {
      setVideoFinished();
    }
  };

  const handleContinue = () => {
    setStep('identification');
    history.push(ROUTES.EXAM_IDENTIFICATION);
  };

  const canContinue = videoFinished || progress >= MIN_PROGRESS;
  const progressPct = Math.round(progress * 100);

  return (
    <ExamLayout>
      <div className="card">
        <div className="card-content" style={{ padding: '1.5rem' }}>
          <h2 className="title is-5 mb-4" style={{ fontSize: 'clamp(1rem, 4vw, 1.25rem)' }}>Assista ao vídeo de treinamento</h2>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
            <video
              ref={videoRef}
              controls
              controlsList="nodownload noremoteplayback"
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onRateChange={handleRateChange}
              style={{ width: '100%', height: '100%', display: 'block' }}
              src="https://res.cloudinary.com/dl4n3ldua/video/upload/f_auto,q_auto/v1781823597/Integra%C3%A7%C3%A3o_Diaristas_-_Novo_lgi8jl.mp4"
            >
              <track kind="captions" src="" label="Português" />
              Seu navegador não suporta vídeo.
            </video>
          </div>
          <div style={{ textAlign: 'center', margin: '1rem 0' }}>
            {!canContinue ? (
              <>
                <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>
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
                <span style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '0.3rem', display: 'inline-block' }}>
                  {progressPct}%
                </span>
              </>
            ) : (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '0.5rem 1rem',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                color: '#166534',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                <i className="fas fa-check-circle" style={{ fontSize: '1rem' }} />
                Vídeo assistido
              </div>
            )}
          </div>
          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <button
              className="button is-fullwidth-mobile"
              disabled={!canContinue}
              onClick={handleContinue}
              style={{
                background: canContinue ? '#D40511' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '0.85rem 2rem',
                fontWeight: 600,
                fontSize: '1rem',
                transition: 'background 0.3s ease',
                minWidth: 200,
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </ExamLayout>
  );
}
