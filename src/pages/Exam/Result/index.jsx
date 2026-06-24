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

function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(() => useExamStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useExamStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return () => { unsub(); };
  }, []);

  return hydrated;
}

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
  const hydrated = useStoreHydrated();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [cooldown, setCooldown] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [result, setResult] = useState(null);
  const savingRef = useRef(false);
  const qrRef = useRef(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const identificationRef = useRef(identification);
  identificationRef.current = identification;
  const startTimeRef = useRef(startTime);
  startTimeRef.current = startTime;
  const signatureRef = useRef(signature);
  signatureRef.current = signature;
  const signatureIpRef = useRef(signatureIp);
  signatureIpRef.current = signatureIp;
  const signatureUserAgentRef = useRef(signatureUserAgent);
  signatureUserAgentRef.current = signatureUserAgent;

  const handleDownloadQR = useCallback(() => {
    downloadQRCode(qrRef, identificationRef.current?.cpf);
  }, []);

  const endTime = useMemo(() => new Date().toISOString(), []);

  const start = startTime ? new Date(startTime) : new Date();
  const end = new Date(endTime);
  const duration = Math.round((end - start) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  useEffect(() => {
    if (identificationRef.current?.cpf) {
      examService.countByCpf(identificationRef.current.cpf).then(setAttemptCount).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return undefined;
    if (savingRef.current || result || cooldown) return undefined;

    const ident = identificationRef.current;
    const ans = answersRef.current;
    const sTime = startTimeRef.current;
    const sig = signatureRef.current;
    const sigIp = signatureIpRef.current;
    const sigUa = signatureUserAgentRef.current;

    if (!ans || ans.length === 0) {
      setSaveError('Nenhuma resposta encontrada. Por favor, refaça a prova.');
      return undefined;
    }

    savingRef.current = true;
    setSaving(true);

    let mounted = true;

    (async () => {
      try {
        const examData = {
          name: ident?.name,
          cpf: ident?.cpf,
          city: ident?.city,
          operationType: ident?.operationType,
          startTime: sTime,
          endTime,
          duration,
          answers: ans,
          signature: sig || null,
          signatureIp: sigIp || null,
          signatureDate: new Date().toISOString(),
          signatureUserAgent: sigUa || null,
        };
        const response = await examService.create(examData);
        if (mounted) {
          setResult({
            correctCount: response.score,
            total: ans.length,
            wrongCount: ans.length - response.score,
            percentage: response.percentage,
            status: response.status,
          });
          setAttemptCount(response.attempts || 1);
          setSaving(false);
        }
      } catch (err) {
        if (!mounted) return;
        const msg = err.message || '';
        const match = msg.match(/(\d+)\s*minuto/);
        if (match) {
          setCooldown(parseInt(match[1], 10));
        } else {
          setSaveError(msg || 'Erro ao salvar. Tente novamente.');
        }
        setSaving(false);
        savingRef.current = false;
      }
    })();

    return () => { mounted = false; };
  }, [hydrated]);

  const finalStatus = result?.status;
  const showLoading = saving && !result && !cooldown;

  if (cooldown) {
    return (
      <ExamLayout>
        <div className="stagger" style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#FFF3E0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <i className="fas fa-clock" style={{ fontSize: '2rem', color: '#E65100' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#E65100', margin: '0 0 0.25rem' }}>
            Aguarde para refazer
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
            Você precisa aguardar <strong>{cooldown} minuto(s)</strong> antes de refazer a prova.
          </p>
          <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1.5rem' }}>
            Tentativa {attemptCount}ª
          </p>
          <button onClick={() => { reset(); history.push(ROUTES.ROOT); }}
            style={{ padding: '0.75rem 2rem', background: '#E65100', color: '#fff',
                     border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
            <i className="fas fa-arrow-left" style={{ marginRight: 8 }} />
            Voltar
          </button>
        </div>
      </ExamLayout>
    );
  }

  if (showLoading) {
    return (
      <ExamLayout>
        <Loading fullPage text="Salvando resultado..." />
      </ExamLayout>
    );
  }

  if (saveError && !result) {
    return (
      <ExamLayout>
        <div className="stagger" style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#FFEBEE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', color: '#D32F2F' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#D32F2F', margin: '0 0 0.25rem' }}>
            Erro ao salvar
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>{saveError}</p>
          <button onClick={() => { reset(); history.push(ROUTES.ROOT); }}
            style={{ padding: '0.75rem 2rem', background: '#D32F2F', color: '#fff',
                     border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
            <i className="fas fa-arrow-left" style={{ marginRight: 8 }} />
            Voltar
          </button>
        </div>
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
                Você está apto a acessar a operação. Dirija-se à <strong>portaria interna</strong> e apresente o
                <strong> QR Code abaixo</strong> para ser liberado.
              </p>
            </div>
            <div style={{
              background: '#fff', borderRadius: 10, padding: '1.25rem',
              marginBottom: '1.5rem', textAlign: 'center',
              border: '2px solid #28A745',
            }}>
              <p style={{ fontSize: '0.8rem', color: '#28A745', fontWeight: 700, margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <i className="fas fa-qrcode" style={{ marginRight: 6 }} />
                Seu passe de acesso
              </p>
              <p style={{ fontSize: '0.75rem', color: '#888', margin: '0 0 0.75rem' }}>
                Apresente este QR Code na portaria para entrar
              </p>
              <QRCodeCanvas
                ref={qrRef}
                value={identification?.cpf?.replace(/\D/g, '') || ''}
                size={160}
                level="M"
                style={{ display: 'block', margin: '0 auto' }}
              />
              <button
                onClick={handleDownloadQR}
                style={{
                  marginTop: '0.75rem', padding: '0.45rem 1.25rem', fontSize: '0.8rem',
                  background: '#28A745', color: '#fff', border: 'none',
                  borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                }}
              >
                <i className="fas fa-download" style={{ marginRight: 6 }} />
                Salvar QR Code
              </button>
              <div style={{
                marginTop: '0.75rem', padding: '0.5rem 0.75rem',
                background: '#FFF8E1', borderRadius: 6,
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
              }}>
                <i className="fas fa-key" style={{ color: '#F9A825', fontSize: '0.75rem', marginTop: 2, flexShrink: 0 }} />
                <p style={{ fontSize: '0.72rem', color: '#6D4C00', margin: 0, lineHeight: 1.4, textAlign: 'left' }}>
                  Sem o QR Code? Apresente seu <strong>CPF</strong> diretamente na portaria.
                </p>
              </div>
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
            {minutes}min {seconds}s • Tentativa {attemptCount}ª
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
