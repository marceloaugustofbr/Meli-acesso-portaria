import React from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { useExamStore } from '../../../store';
import ROUTES from '../../../constants/routes';
import '../../../assets/css/exam-layout.scss';

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
      <style>{`@media(max-width:768px){.exam-page{background:url('/wallpaper2.jpg') center/cover no-repeat!important}}`}</style>
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
