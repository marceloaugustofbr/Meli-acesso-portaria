import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { shallow } from 'zustand/shallow';
import { useExamStore } from '../../../store';
import { examService, storageService } from '../../../services';
import { formatCPF } from '../../../utils/cpf';
import { useQuestions } from '../../../hooks';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';
import Loading from '../../../components/ui/Loading';

function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}</>;
}

export default function ExamResult() {
  const history = useHistory();
  const { identification, startTime, answers, signature, reset } = useExamStore(
    (s) => ({
      identification: s.identification,
      startTime: s.startTime,
      answers: s.answers,
      signature: s.signature,
      reset: s.reset,
    }),
    shallow
  );
  const { data: questions, isLoading: questionsLoading } = useQuestions();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [autoSaved, setAutoSaved] = useState(false);
  const savingRef = useRef(false);

  const endTime = useMemo(() => new Date().toISOString(), []);

  const correctCount = useMemo(() => {
    if (!questions || !answers.length) return 0;
    return answers.filter((a) => {
      const question = questions.find((qq) => qq.id === a.questionId);
      return question && a.selectedAnswer === question.correctAnswer;
    }).length;
  }, [answers, questions]);

  const wrongCount = answers.length - correctCount;
  const total = answers.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const status = percentage >= 70 ? 'approved' : 'reproved';

  const start = startTime ? new Date(startTime) : new Date();
  const end = new Date(endTime);
  const duration = Math.round((end - start) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  useEffect(() => {
    if (identification?.cpf) {
      examService.countByCpf(identification.cpf).then(setAttemptCount);
    }
  }, [identification]);

  useEffect(() => {
    if (questionsLoading || savingRef.current || autoSaved) return;
    savingRef.current = true;
    setSaving(true);

    (async () => {
      try {
        let signatureUrl = null;
        if (signature) {
          try {
            signatureUrl = await storageService.uploadSignature(signature, identification?.cpf);
          } catch (err) {
            console.warn('Erro ao enviar assinatura pro Cloudinary, salvando inline:', err);
          }
        }

        const enrichedAnswers = questions
          ? answers.map((a) => {
              const q = questions.find((qq) => qq.id === a.questionId);
              if (!q) return { ...a, question: '', correctAnswer: '', isCorrect: false };
              return {
                ...a,
                question: q.question,
                correctAnswer: q.correctAnswer,
                isCorrect: a.selectedAnswer === q.correctAnswer,
              };
            })
          : answers;

        const examData = {
          name: identification?.name,
          cpf: identification?.cpf,
          city: identification?.city,
          operationType: identification?.operationType,
          startTime,
          endTime,
          duration,
          score: correctCount,
          correctAnswers: correctCount,
          wrongAnswers: wrongCount,
          percentage,
          status,
          signature: signatureUrl || signature,
          answers: enrichedAnswers,
        };
        await examService.create(examData);
        setAutoSaved(true);
        setTimeout(() => {
          reset();
          history.push(ROUTES.ROOT);
        }, 2000);
      } catch (err) {
        console.error('Erro ao salvar exame:', err);
        setSaveError(err.message || 'Erro ao salvar. Tente novamente.');
        setSaving(false);
        savingRef.current = false;
      }
    })();
  }, [questionsLoading]);

  if (questionsLoading) return <Loading fullPage text="Calculando resultado..." />;

  return (
    <ExamLayout>
      <div className="stagger" style={{ textAlign: 'center' }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: status === 'approved' ? '#E8F5E9' : '#FFEBEE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
        }}>
          <i
            className={`fas ${status === 'approved' ? 'fa-check-circle' : 'fa-times-circle'}`}
            style={{ fontSize: '2rem', color: status === 'approved' ? '#28A745' : '#D32F2F' }}
          />
        </div>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: status === 'approved' ? '#28A745' : '#D32F2F',
          margin: '0 0 0.25rem',
        }}>
          {status === 'approved' ? 'APROVADO' : 'REPROVADO'}
        </h1>

        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1.5rem' }}>
          {status === 'approved'
            ? 'Parabéns! Você foi aprovado no treinamento.'
            : 'Infelizmente você não atingiu a nota mínima. Tente novamente.'}
        </p>

        <div style={{
          background: '#F9F9F9',
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '1.5rem',
          textAlign: 'left',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#888' }}>Nome</span>
              <p style={{ fontWeight: 600, margin: '2px 0 0', fontSize: '0.9rem', color: '#222' }}>{identification?.name}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#888' }}>CPF</span>
              <p style={{ fontWeight: 600, margin: '2px 0 0', fontSize: '0.9rem', color: '#222' }}>{formatCPF(identification?.cpf || '')}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#888' }}>Cidade</span>
              <p style={{ fontWeight: 600, margin: '2px 0 0', fontSize: '0.9rem', color: '#222' }}>{identification?.city}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#888' }}>Empresa</span>
              <p style={{ fontWeight: 600, margin: '2px 0 0', fontSize: '0.9rem', color: '#222' }}>{identification?.operationType}</p>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E0E0E0', margin: '1rem 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', textAlign: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: '0.75rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#222' }}>
                <AnimatedNumber value={correctCount} />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#888' }}>Acertos</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: '0.75rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#D32F2F' }}>
                <AnimatedNumber value={wrongCount} />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#888' }}>Erros</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: '0.75rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: status === 'approved' ? '#28A745' : '#D32F2F' }}>
                <AnimatedNumber value={percentage} />%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#888' }}>Nota</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: '#888' }}>
            {minutes}min {seconds}s • Tentativa {attemptCount + 1}ª
          </div>
        </div>

        {saveError && <p style={{ fontSize: '0.8rem', color: '#D32F2F', marginBottom: '0.75rem' }}>{saveError}</p>}

        {saving && !autoSaved && (
          <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.5rem' }}>
            <i className="fas fa-spinner fa-pulse" style={{ marginRight: 8 }} />
            Salvando resultado...
          </p>
        )}

        {autoSaved && (
          <p style={{ fontSize: '0.85rem', color: '#28A745', marginTop: '0.5rem' }}>
            <i className="fas fa-check-circle" style={{ marginRight: 8 }} />
            Resultado salvo! Redirecionando...
          </p>
        )}
      </div>
    </ExamLayout>
  );
}
