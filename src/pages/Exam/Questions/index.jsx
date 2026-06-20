import React, { useState, useCallback, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useExamStore } from '../../../store';
import { useShuffledQuestions } from '../../../hooks';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';
import Loading from '../../../components/ui/Loading';

export default function ExamQuestions() {
  const history = useHistory();
  const updateAnswer = useExamStore((s) => s.updateAnswer);
  const setStep = useExamStore((s) => s.setStep);
  const { questions, isLoading } = useShuffledQuestions();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState({});
  const [transition, setTransition] = useState('fade-in');

  const currentQuestion = questions?.[currentIndex];
  const progress = questions ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleSelect = useCallback((option) => {
    setSelected((prev) => ({ ...prev, [currentIndex]: option }));
  }, [currentIndex]);

  const saveCurrentAnswer = useCallback(() => {
    if (!currentQuestion || !selected[currentIndex]) return;
    updateAnswer({
      questionId: currentQuestion.id,
      selectedAnswer: selected[currentIndex],
    });
  }, [currentQuestion, selected, currentIndex, updateAnswer]);

  const handleNext = useCallback(() => {
    if (!selected[currentIndex]) return;
    saveCurrentAnswer();

    if (currentIndex < questions.length - 1) {
      setTransition('slide-left');
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setTransition('fade-in');
      }, 200);
    } else {
      const correctCount = questions.filter((q, i) => selected[i] === q.correctAnswer).length;
      const percentage = Math.round((correctCount / questions.length) * 100);
      const passed = percentage >= 70;

      if (passed) {
        setStep('terms');
        history.push(ROUTES.EXAM_TERMS);
      } else {
        setStep('result');
        history.push(ROUTES.EXAM_RESULT);
      }
    }
  }, [selected, currentIndex, saveCurrentAnswer, questions, history, setStep]);

  const handleBack = useCallback(() => {
    saveCurrentAnswer();
    setTransition('slide-right');
    setTimeout(() => {
      setCurrentIndex((i) => i - 1);
      setTransition('fade-in');
    }, 200);
  }, [saveCurrentAnswer]);

  const fillCorrect = useCallback(() => {
    if (!questions) return;
    const filled = {};
    questions.forEach((q, i) => {
      filled[i] = q.correctAnswer;
      updateAnswer({ questionId: q.id, selectedAnswer: q.correctAnswer });
    });
    setSelected(filled);
  }, [questions, updateAnswer]);

  const fillWrong = useCallback(() => {
    if (!questions) return;
    const filled = {};
    questions.forEach((q, i) => {
      const wrong = q.options.find((o) => o !== q.correctAnswer);
      filled[i] = wrong || q.options[0];
      updateAnswer({ questionId: q.id, selectedAnswer: filled[i] });
    });
    setSelected(filled);
  }, [questions, updateAnswer]);

  if (isLoading) return <Loading fullPage />;
  if (!questions?.length) return <Loading fullPage text="Carregando perguntas..." />;

  return (
    <ExamLayout>
      <style>{`
        .q-slide { animation: qFadeIn 250ms ease forwards; }
        @keyframes qFadeIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes qFadeOutLeft { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-20px); } }
        @keyframes qFadeOutRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(20px); } }
      `}</style>
      <div className={transition === 'fade-in' ? 'q-slide' : ''}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>
              Pergunta {currentIndex + 1} de {questions.length}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>
              <AnimatedProgress current={currentIndex + 1} total={questions.length} />
            </span>
          </div>
          <div className="exam-progress-bar" style={{ background: '#E0E0E0', height: 5, borderRadius: 3 }}>
            <div className="exam-progress-fill" style={{ width: `${progress}%`, height: '100%', borderRadius: 3, background: '#D40511', transition: 'width 300ms ease' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            className="button is-small"
            onClick={fillCorrect}
            style={{ background: '#28A745', color: '#fff', border: 'none', fontSize: '0.75rem' }}
          >
            ✓ Todas Corretas
          </button>
          <button
            className="button is-small"
            onClick={fillWrong}
            style={{ background: '#D32F2F', color: '#fff', border: 'none', fontSize: '0.75rem' }}
          >
            ✗ Todas Erradas
          </button>
        </div>

        <div style={{
          background: '#F9F9F9',
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <p style={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.5, margin: 0, color: '#222' }}>
            {currentQuestion.question}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
          {currentQuestion.options.map((option) => {
            const isSelected = selected[currentIndex] === option;
            return (
              <div
                key={option}
                className={`option-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(option)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1.25rem',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: `2px solid ${isSelected ? '#D40511' : '#D9D9D9'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 200ms ease',
                  background: isSelected ? '#D40511' : 'transparent',
                }}>
                  {isSelected && <i className="fas fa-check" style={{ color: '#fff', fontSize: '0.65rem' }} />}
                </div>
                <span style={{ fontSize: '0.92rem', color: '#222', lineHeight: 1.4 }}>{option}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
          <button
            className="btn-dhl ripple-btn"
            disabled={currentIndex === 0}
            onClick={handleBack}
            style={{
              background: 'transparent',
              color: '#D40511',
              border: '1.5px solid #D40511',
              padding: '0.65rem 1.5rem',
              opacity: currentIndex === 0 ? 0.4 : 1,
            }}
          >
            <i className="fas fa-arrow-left" style={{ fontSize: '0.78rem' }} />
            Voltar
          </button>
          <button
            className="btn-dhl ripple-btn"
            disabled={!selected[currentIndex]}
            onClick={handleNext}
            style={{ padding: '0.65rem 1.5rem', opacity: !selected[currentIndex] ? 0.5 : 1 }}
          >
            {currentIndex < questions.length - 1 ? 'Próxima' : 'Finalizar'}
            <i className="fas fa-arrow-right" style={{ fontSize: '0.78rem' }} />
          </button>
        </div>
      </div>
    </ExamLayout>
  );
}

function AnimatedProgress({ current, total }) {
  const [display, setDisplay] = useState(current);
  useEffect(() => {
    const timer = setTimeout(() => setDisplay(current), 150);
    return () => clearTimeout(timer);
  }, [current]);
  return <>{display}/{total}</>;
}
