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
      // A nota é calculada server-side pelo Worker
      // O cliente não tem acesso ao correctAnswer por segurança
      setStep('terms');
      history.push(ROUTES.EXAM_TERMS);
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

  if (isLoading) return <Loading fullPage />;
  if (!questions?.length) return <Loading fullPage text="Carregando perguntas..." />;

  return (
    <ExamLayout>

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
            className="btn-dhl is-outline"
            disabled={currentIndex === 0}
            onClick={handleBack}
            style={{ opacity: currentIndex === 0 ? 0.4 : 1 }}
          >
            <i className="fas fa-arrow-left" style={{ fontSize: '0.78rem' }} />
            Voltar
          </button>
          <button
            className="btn-dhl"
            disabled={!selected[currentIndex]}
            onClick={handleNext}
            style={{ opacity: !selected[currentIndex] ? 0.5 : 1 }}
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
