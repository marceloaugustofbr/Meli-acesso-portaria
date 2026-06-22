import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { useExamStore } from '../../../store';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';

const VIDEO_DURATION = 730;

export default function ExamVideo() {
  const history = useHistory();
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(VIDEO_DURATION);
  const videoFinished = useExamStore((s) => s.videoFinished);
  const setVideoFinished = useExamStore((s) => s.setVideoFinished);
  const setStep = useExamStore((s) => s.setStep);

  useEffect(() => {
    let timer;
    if (playing && !videoFinished) {
      timer = setInterval(() => {
        setTimeLeft((t) => Math.max(0, t - 1));
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [playing, videoFinished]);

  const canContinue = videoFinished || timeLeft <= 0;

  const handlePlay = () => setPlaying(true);

  const handlePause = () => setPlaying(false);

  const handleEnded = () => setPlaying(false);

  const handleRateChange = () => {
    if (videoRef.current && videoRef.current.playbackRate !== 1) {
      videoRef.current.playbackRate = 1;
    }
  };

  const handleContinue = () => {
    setStep('identification');
    history.push(ROUTES.EXAM_IDENTIFICATION);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <ExamLayout>
      <div className="card">
        <div className="card-content">
          <h2 className="title is-5 mb-4">Assista ao vídeo de treinamento</h2>
          <video
            ref={videoRef}
            controls
            preload="metadata"
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            onRateChange={handleRateChange}
            style={{ width: '100%', borderRadius: 8, display: 'block' }}
            src="https://res.cloudinary.com/dl4n3ldua/video/upload/f_auto,q_auto/v1781823597/Integra%C3%A7%C3%A3o_Diaristas_-_Novo_lgi8jl.mp4"
          >
            <track kind="captions" src="" label="Português" />
            Seu navegador não suporta vídeo.
          </video>
          {!canContinue && (
            <p style={{ fontSize: '0.75rem', color: '#999', textAlign: 'center', margin: '0.75rem 0 0.5rem' }}>
              Assista ao vídeo completo para realizar a prova · {timeStr}
            </p>
          )}
          {process.env.NODE_ENV === 'development' && !videoFinished && (
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
