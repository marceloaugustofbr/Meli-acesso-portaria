import React from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { useExamStore } from '../../../store';
import ROUTES from '../../../constants/routes';

const progressSteps = ['video', 'identification', 'questions', 'terms', 'signature', 'result'];

export default function ExamLayout({ children }) {
  const location = useLocation();
  const currentStep = useExamStore((s) => s.step);
  const progressIndex = progressSteps.indexOf(currentStep);
  const showProgress = ![ROUTES.EXAM_INTRO, ROUTES.EXAM_CHECK].includes(location.pathname);
  const safeIndex = Math.max(0, progressIndex);
  const progress = Math.max(5, (safeIndex / (progressSteps.length - 1)) * 100);

  return (
    <>
      <style>{`
        .exam-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          position: relative;
          overflow: hidden;
          background:
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 40px,
              rgba(255,204,0,0.08) 40px,
              rgba(255,204,0,0.08) 41px
            ),
            linear-gradient(160deg, #FFCC00, #F6D33D);
        }
        .exam-page::after {
          content: '';
          position: absolute;
          inset: -50%;
          background: radial-gradient(ellipse at 30% 50%, rgba(212,5,17,0.04) 0%, transparent 50%),
                      radial-gradient(ellipse at 70% 50%, rgba(212,5,17,0.03) 0%, transparent 50%);
          pointer-events: none;
          z-index: 1;
        }
        @media (prefers-reduced-motion: no-preference) {
          .exam-page::after {
            animation: exam-drift 20s ease-in-out infinite;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .exam-page::after { animation: none; }
        }
        @keyframes exam-drift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(2%, 1%) rotate(0.5deg); }
          66% { transform: translate(-1%, -1%) rotate(-0.5deg); }
        }
        .exam-inner {
          width: 100%;
          max-width: 720px;
          position: relative;
          z-index: 2;
        }
        .exam-progress {
          margin-bottom: 1.25rem;
        }
        .exam-progress-bar {
          height: 6px;
          border-radius: 3px;
          background: rgba(255,255,255,0.4);
          overflow: hidden;
          position: relative;
        }
        .exam-progress-fill {
          height: 100%;
          border-radius: 3px;
          background: #D40511;
          transition: width 400ms ease;
        }
        .exam-steps {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
        }
        .exam-step-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255,255,255,0.35);
          transition: all 300ms ease;
          flex-shrink: 0;
        }
        .exam-step-dot.active {
          background: #D40511;
          box-shadow: 0 0 6px rgba(212,5,17,0.4);
          transform: scale(1.2);
        }
        .exam-step-dot.done {
          background: rgba(212,5,17,0.5);
        }
        @media (max-width: 768px) {
          .exam-page {
            background: url('/wallpaper2.jpg') center/cover no-repeat;
            padding: 1rem 0.5rem;
            align-items: flex-start;
          }
          .exam-page::after {
            display: none;
          }
          .exam-progress {
            margin-bottom: 1rem;
          }
        }
      `}</style>
      <div className="exam-page">
        <div className="exam-inner">
          {showProgress && (
            <div className="exam-progress">
              <div className="exam-progress-bar">
                <div className="exam-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="exam-steps">
                {progressSteps.map((step, i) => (
                  <div
                    key={step}
                    className={`exam-step-dot ${i === progressIndex ? 'active' : ''} ${i < progressIndex ? 'done' : ''}`}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="glass-card" style={{ padding: '2rem 2rem 2.5rem' }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

ExamLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
