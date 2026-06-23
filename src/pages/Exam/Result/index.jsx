import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { shallow } from 'zustand/shallow';
import { QRCodeCanvas } from 'qrcode.react';
import { useExamStore } from '../../../store';
import { examService } from '../../../services';
import { formatCPF } from '../../../utils/cpf';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';
import Loading from '../../../components/ui/Loading';
import { downloadQRCode } from '../../../utils/qr';

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
  const { identification, startTime, answers, signature, signatureIp, signatureUserAgent, reset } = useExamStore(
    (s) => ({
      identification: s.identification,
      startTime: s.startTime,
      answers: s.answers,
      signature: s.signature,
      signatureIp: s.signatureIp,
      signatureUserAgent: s.signatureUserAgent,
      reset: s.reset,
    }),
    shallow
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [result, setResult] = useState(null);
  const savingRef = useRef(false);
  const qrRef = useRef(null);

  const handleDownloadQR = useCallback(() => {
    downloadQRCode(qrRef, identification?.cpf);
  }, [identification]);

  const endTime = useMemo(() => new Date().toISOString(), []);

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
    if (savingRef.current || result) return undefined;
    savingRef.current = true;
    setSaving(true);

    let mounted = true;

    (async () => {
      try {
        // O Worker calcula a nota server-side com as respostas corretas
        const examData = {
          name: identification?.name,
          cpf: identification?.cpf,
          city: identification?.city,
          operationType: identification?.operationType,
          startTime,
          endTime,
          duration,
          answers,
          signature: signature || null,
          signatureIp: signatureIp || null,
          signatureDate: new Date().toISOString(),
          signatureUserAgent: signatureUserAgent || null,
        };
        const response = await examService.create(examData);
        if (mounted) {
          setResult({
            correctCount: response.score,
            total: answers.length,
            wrongCount: answers.length - response.score,
            percentage: response.percentage,
            status: response.status,
          });
          setSaving(false);
        }
      } catch (err) {
        // Erro silenciado — estado de erro já é tratado na UI
        if (mounted) {
          setSaveError(err.message || 'Erro ao salvar. Tente novamente.');
          setSaving(false);
          savingRef.current = false;
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  const finalStatus = result?.status;
  const showLoading = saving && !result;

  if (showLoading) {
    return (
      <ExamLayout>
        <Loading fullPage text="Salvando resultado..." />
      </ExamLayout>
    );
  }

  return (
    <ExamLayout>
      <div className="stagger" style={{ textAlign: 'center' }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: finalStatus === 'approved' ? '#E8F5E9' : '#FFEBEE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
        }}>
          <i
            className={`fas ${finalStatus === 'approved' ? 'fa-check-circle' : 'fa-times-circle'}`}
            style={{ fontSize: '2rem', color: finalStatus === 'approved' ? '#28A745' : '#D32F2F' }}
          />
        </div>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: finalStatus === 'approved' ? '#28A745' : '#D32F2F',
          margin: '0 0 0.25rem',
        }}>
          {finalStatus === 'approved' ? 'APROVADO' : 'REPROVADO'}
        </h1>

        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.75rem' }}>
          {finalStatus === 'approved'
            ? 'Parabéns! Você foi aprovado no treinamento.'
            : 'Infelizmente você não atingiu a nota mínima. Tente novamente.'}
        </p>

        {finalStatus === 'approved' && (
          <>
            <div style={{
              background: '#E3F2FD', borderRadius: 10, padding: '1rem 1.25rem',
              marginBottom: '1rem', textAlign: 'left',
            }}>
              <p style={{ fontSize: '0.85rem', color: '#1565C0', fontWeight: 600, margin: '0 0 0.35rem' }}>
                <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
                Próximos passos
              </p>
              <p style={{ fontSize: '0.82rem', color: '#1E3A5F', margin: 0, lineHeight: 1.5 }}>
                Você está apto a acessar a operação. Dirija-se à <strong>portaria interna</strong> e apresente seu
                <strong> CPF</strong> para ser liberado.
              </p>
            </div>
            <div style={{
              background: '#fff', borderRadius: 10, padding: '1rem',
              marginBottom: '1.5rem', textAlign: 'center',
              border: '1px solid #E0E0E0',
            }}>
              <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, margin: '0 0 0.75rem' }}>
                <i className="fas fa-qrcode" style={{ marginRight: 6 }} />
                Comprovante digital
              </p>
              <QRCodeCanvas
                ref={qrRef}
                value={identification?.cpf?.replace(/\D/g, '') || ''}
                size={140}
                level="M"
                style={{ display: 'block', margin: '0 auto' }}
              />
              <button
                onClick={handleDownloadQR}
                style={{
                  marginTop: '0.75rem', padding: '0.35rem 1rem', fontSize: '0.75rem',
                  background: '#f5f5f5', color: '#333', border: '1px solid #ddd',
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                <i className="fas fa-download" style={{ marginRight: 6 }} />
                Baixar QR Code
              </button>
            </div>
          </>
        )}

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
                <AnimatedNumber value={result?.correctCount ?? 0} />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#888' }}>Acertos</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: '0.75rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#D32F2F' }}>
                <AnimatedNumber value={result?.wrongCount ?? 0} />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#888' }}>Erros</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: '0.75rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: finalStatus === 'approved' ? '#28A745' : '#D32F2F' }}>
                <AnimatedNumber value={result?.percentage ?? 0} />%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#888' }}>Nota</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: '#888' }}>
            {minutes}min {seconds}s • Tentativa {attemptCount + 1}ª
          </div>
        </div>

        {saveError && <p style={{ fontSize: '0.8rem', color: '#D32F2F', marginBottom: '0.75rem' }}>{saveError}</p>}

        {result && (
          <button onClick={() => { reset(); history.push(ROUTES.ROOT); }}
            style={{ marginTop: '1rem', padding: '0.75rem 2rem', background: '#28A745',
                     color: '#fff', border: 'none', borderRadius: 8, fontSize: '1rem',
                     fontWeight: 600, cursor: 'pointer' }}>
            <i className="fas fa-check-circle" style={{ marginRight: 8 }} />
            Fechar
          </button>
        )}
      </div>
    </ExamLayout>
  );
}
