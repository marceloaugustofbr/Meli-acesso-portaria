import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';
import { QRCodeCanvas } from 'qrcode.react';
import { useExamStore } from '../../../store';
import { examService } from '../../../services';
import { maskCPF, formatCPF, validateCPF } from '../../../utils/cpf';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';
import { downloadQRCode } from '../../../utils/qr';

export default function ExamCheck() {
  const history = useHistory();
  const setStep = useExamStore((s) => s.setStep);
  const storeSetCpf = useExamStore((s) => s.setCpf);
  const cpfRef = useRef(null);
  const [cpf, setCpf] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [examData, setExamData] = useState(null);
  const [cpfError, setCpfError] = useState('');
  const qrRef = useRef(null);
  const handleDownloadQR = () => downloadQRCode(qrRef, examData?.cpf || cpf);

  useEffect(() => {
    cpfRef.current?.focus();
  }, []);

  const handleCPFChange = (e) => {
    setCpf(maskCPF(e.target.value));
    setResult(null);
    setExamData(null);
    setCpfError('');
  };

  const handleCheck = async () => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return;

    if (!validateCPF(cpf)) {
      setCpfError('CPF inválido');
      return;
    }

    setChecking(true);
    setResult(null);
    setExamData(null);
    try {
      const statusResult = await examService.checkStatus(cpf);
      if (statusResult.found) {
        setExamData(statusResult);
        if (statusResult.status === 'approved') {
          setResult('liberado');
        } else if (statusResult.status === 'blocked') {
          setResult('bloqueado');
        } else {
          setResult('reprovado');
        }
      } else {
        setResult('pendente');
      }
    } catch (err) {
      // Erro silenciado — estado de erro já é tratado na UI
      setResult('pendente');
    } finally {
      setChecking(false);
    }
  };

  const handleProceed = () => {
    storeSetCpf(cpf);
    setStep('rules');
    history.push(ROUTES.EXAM_RULES);
  };

  const handleFinish = () => {
    history.push(ROUTES.ROOT);
  };

  const handleRetake = () => {
    storeSetCpf(cpf);
    setStep('rules');
    history.push(ROUTES.EXAM_RULES);
  };

  return (
    <ExamLayout>
      <div className="card">
        <div className="card-content has-text-centered">
          {!result && (
            <>
              <span className="icon is-large mb-3">
                <i className="fas fa-search fa-2x" style={{ color: '#D40511' }} />
              </span>
              <h2 className="title is-5" style={{ color: '#D40511' }}>Verificar Cadastro</h2>
              <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.5, margin: '0 0 0.25rem', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
                Antes de prosseguir, informe seu CPF para consultar a situação cadastral.
              </p>
              <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.5, margin: '0 0 1.25rem', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
                Se já estiver liberado, você será notificado. Caso contrário, siga para o treinamento.
              </p>

              <div className="field">
                <div className="control has-icons-left">
                  <input
                    ref={cpfRef}
                    className="input is-medium has-text-centered"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCPFChange}
                    maxLength={14}
                  />
                  <span className="icon is-left is-small">
                    <i className="fas fa-id-card" />
                  </span>
                </div>
                {cpfError && <p className="help is-danger">{cpfError}</p>}
              </div>

              <button
                className={classNames('btn-dhl is-medium is-fullwidth', { 'is-loading': checking })}
                disabled={cpf.replace(/\D/g, '').length !== 11 || !!cpfError || checking}
                onClick={handleCheck}
              >
                Verificar
              </button>
            </>
          )}

          {result === 'liberado' && examData && (
            <div className="mt-2">
              <div
                className="box"
                style={{
                  border: '2px solid #28A745',
                  borderRadius: 16,
                  padding: 0,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(40,167,69,0.15)',
                }}
              >
                <div
                  className="has-text-white has-text-centered"
                  style={{ background: 'linear-gradient(135deg, #28A745 0%, #1e7e34 100%)', padding: '32px 24px 24px' }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <i className="fas fa-user-circle fa-3x" />
                  </div>
                  <p className="title is-5 has-text-white mb-1" style={{ fontWeight: 600 }}>{examData.name}</p>
                  <p className="has-text-white" style={{ opacity: 0.8, fontSize: '0.85rem' }}>
                    {formatCPF(examData.cpf || cpf)}
                  </p>
                </div>

                <div style={{ padding: '20px 24px' }}>
                  <div className="columns is-mobile is-vcentered" style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div className="column" style={{ borderRight: '1px solid #eee' }}>
                      <span style={{ fontSize: '0.75rem', color: '#999' }}>Cidade</span>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: '4px 0 0' }}>{examData.city}</p>
                    </div>
                    <div className="column">
                      <span style={{ fontSize: '0.75rem', color: '#999' }}>Empresa diarista</span>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: '4px 0 0' }}>{examData.operationType}</p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 16 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        background: '#FFCC00',
                        color: '#28A745',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        borderRadius: 20,
                        padding: '5px 28px',
                        marginBottom: 12,
                      }}
                    >
                      LIBERADO
                    </span>
                    <p style={{ fontSize: '0.8rem', color: '#888', margin: 0 }}>
                      Liberado em {examData.createdAt ? new Date(examData.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#888', margin: '6px 0 0' }}>
                      Você já concluiu o treinamento e está liberado para acessar as operações.
                    </p>
                  </div>
                </div>

                <div style={{
                  background: '#fff', borderRadius: 10, padding: '1rem',
                  marginTop: 16, textAlign: 'center',
                  border: '1px solid #E0E0E0',
                }}>
                  <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, margin: '0 0 0.75rem' }}>
                    <i className="fas fa-qrcode" style={{ marginRight: 6 }} />
                    Comprovante digital
                  </p>
                  <QRCodeCanvas
                    ref={qrRef}
                    value={(examData.cpf || cpf).replace(/\D/g, '')}
                    size={140}
                    level="M"
                    style={{ display: 'block', margin: '0 auto' }}
                  />
                  <button
                    className="btn-dhl is-small is-ghost"
                    onClick={handleDownloadQR}
                    style={{ marginTop: '0.75rem' }}
                  >
                    <i className="fas fa-download" style={{ marginRight: 6 }} />
                    Baixar QR Code
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button
                  className="btn-dhl is-medium is-success"
                  onClick={handleFinish}
                >
                  <span className="icon is-small"><i className="fas fa-check" /></span>
                  <span>FINALIZAR</span>
                </button>
              </div>
            </div>
          )}

          {result === 'reprovado' && examData && (
            <div className="mt-2">
              <div
                className="box"
                style={{
                  border: '2px solid #D32F2F',
                  borderRadius: 16,
                  padding: 0,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(211,47,47,0.15)',
                }}
              >
                <div
                  className="has-text-white has-text-centered"
                  style={{ background: 'linear-gradient(135deg, #D32F2F 0%, #b71c1c 100%)', padding: '32px 24px 24px' }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <i className="fas fa-user-circle fa-3x" />
                  </div>
                  <p className="title is-5 has-text-white mb-1" style={{ fontWeight: 600 }}>{examData.name}</p>
                  <p className="has-text-white" style={{ opacity: 0.8, fontSize: '0.85rem' }}>
                    {formatCPF(examData.cpf || cpf)}
                  </p>
                </div>

                <div style={{ padding: '20px 24px' }}>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        background: '#D32F2F',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        borderRadius: 20,
                        padding: '5px 28px',
                        marginBottom: 12,
                      }}
                    >
                      REPROVADO
                    </span>
                    <p style={{ fontWeight: 800, fontSize: '2rem', color: '#D32F2F', margin: '0 0 4px' }}>
                      {examData.percentage || examData.score || 0}%
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>
                      {examData.correctAnswers || examData.score || 0} de {((examData.correctAnswers || 0) + (examData.wrongAnswers || 0)) || '?'} acertos
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 16 }}>
                    <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 12px' }}>
                      Ultima tentativa realizada: {examData.createdAt ? new Date(examData.createdAt).toLocaleString('pt-BR') : '-'}
                    </p>
                    <div style={{ background: '#FFF3E0', borderRadius: 10, padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', color: '#E65100', lineHeight: 1.5 }}>
                      <strong>Atenção:</strong> É necessário obter nota superior a 70% para liberação de acesso às operações. Enquanto não atingir a nota mínima, <strong>não será permitida a entrada</strong> e você será barrado na portaria.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  className="btn-dhl is-medium"
                  onClick={handleRetake}
                >
                  <span className="icon is-small"><i className="fas fa-redo" /></span>
                  <span>REFAZER PROVA</span>
                </button>
                <button
                  className="btn-dhl is-medium is-outline"
                  onClick={handleFinish}
                >
                  <span className="icon is-small"><i className="fas fa-sign-out-alt" /></span>
                  <span>SAIR</span>
                </button>
              </div>
            </div>
          )}

          {result === 'bloqueado' && examData && (
            <div className="mt-2">
              <div
                className="box"
                style={{
                  border: '2px solid #E65100',
                  borderRadius: 16,
                  padding: 0,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(230,81,0,0.15)',
                }}
              >
                <div
                  className="has-text-white has-text-centered"
                  style={{ background: 'linear-gradient(135deg, #E65100 0%, #bf360c 100%)', padding: '32px 24px 24px' }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <i className="fas fa-ban fa-3x" />
                  </div>
                  <p className="title is-5 has-text-white mb-1" style={{ fontWeight: 600 }}>{examData.name}</p>
                  <p className="has-text-white" style={{ opacity: 0.8, fontSize: '0.85rem' }}>
                    {formatCPF(examData.cpf || cpf)}
                  </p>
                </div>

                <div style={{ padding: '20px 24px' }}>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        background: '#E65100',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        borderRadius: 20,
                        padding: '5px 28px',
                        marginBottom: 12,
                      }}
                    >
                      BLOQUEADO
                    </span>
                  </div>

                  <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 16 }}>
                    <div style={{ background: '#FFF3E0', borderRadius: 10, padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', color: '#E65100', lineHeight: 1.5 }}>
                      <i className="fas fa-info-circle" style={{ marginRight: 4 }} />
                      Você está bloqueado para acessar as operações. Entre em contato com a liderança local da <strong>{examData.operationType || 'TSI'}</strong> para entender o motivo.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button
                  className="btn-dhl is-medium is-outline"
                  onClick={handleFinish}
                >
                  <span className="icon is-small"><i className="fas fa-sign-out-alt" /></span>
                  <span>SAIR</span>
                </button>
              </div>
            </div>
          )}

          {result === 'pendente' && (
            <div className="mt-2">
              <div
                className="box"
                style={{
                  border: '2px solid #FF8F00',
                  borderRadius: 16,
                  padding: 0,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(255,143,0,0.15)',
                }}
              >
                <div
                  className="has-text-white has-text-centered"
                  style={{ background: 'linear-gradient(135deg, #FF8F00 0%, #E65100 100%)', padding: '32px 24px 24px' }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <i className="fas fa-user-plus fa-3x" />
                  </div>
                  <p className="title is-5 has-text-white mb-1" style={{ fontWeight: 600 }}>
                    Primeiro Acesso
                  </p>
                </div>

                <div style={{ padding: '20px 24px' }}>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        background: '#FF8F00',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        borderRadius: 20,
                        padding: '5px 28px',
                        marginBottom: 12,
                      }}
                    >
                      SEM TREINAMENTO
                    </span>
                    <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.6, margin: '0 auto', maxWidth: 380 }}>
                      Você ainda não possui treinamento registrado. Para obter a liberação de acesso às operações da DHL, é necessário concluir o treinamento de segurança.
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 16 }}>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#666' }}>
                        <i className="fas fa-video" style={{ color: '#FF8F00' }} />
                        <span>Assistir vídeo</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#666' }}>
                        <i className="fas fa-circle-question" style={{ color: '#FF8F00' }} />
                        <span>23 perguntas</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#666' }}>
                        <i className="fas fa-check-circle" style={{ color: '#FF8F00' }} />
                        <span>Mínimo 70%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn-dhl is-medium"
                  onClick={handleProceed}
                >
                  <span className="icon is-small"><i className="fas fa-play" /></span>
                  <span>INICIAR TREINAMENTO</span>
                </button>
                <button
                  className="btn-dhl is-medium is-outline"
                  onClick={handleFinish}
                >
                  <span className="icon is-small"><i className="fas fa-sign-out-alt" /></span>
                  <span>VOLTAR</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ExamLayout>
  );
}
