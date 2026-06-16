import React, { useState, useRef, useEffect } from 'react';
import { examService } from '../../services';
import { maskCPF, formatCPF, validateCPF } from '../../utils/cpf';

export default function Portaria() {
  const cpfRef = useRef(null);
  const [cpf, setCpf] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [examData, setExamData] = useState(null);
  const [cpfError, setCpfError] = useState('');
  const [accessPin, setAccessPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [authorized, setAuthorized] = useState(
    () => sessionStorage.getItem('portaria_auth') === 'true'
  );

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (accessPin === (process.env.REACT_APP_PORTARIA_PIN || '1234')) {
      sessionStorage.setItem('portaria_auth', 'true');
      setAuthorized(true);
      setPinError('');
    } else {
      setPinError('Senha incorreta');
    }
  };

  useEffect(() => {
    if (authorized) cpfRef.current?.focus();
  }, [authorized]);

  if (!authorized) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: '#f5f5f5',
        fontFamily: "'Nunito', sans-serif",
      }}>
        <form onSubmit={handlePinSubmit} style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: 360,
          textAlign: 'center',
        }}>
          <i className="fas fa-lock" style={{ fontSize: '2rem', color: '#D40511', marginBottom: 16 }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#D40511', margin: '0 0 4px' }}>
            Acesso Restrito
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 20px' }}>
            Informe a senha de acesso à portaria
          </p>
          <input
            type="password"
            className="input is-medium"
            placeholder="Senha"
            value={accessPin}
            onChange={(e) => { setAccessPin(e.target.value); setPinError(''); }}
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
            style={{ textAlign: 'center', marginBottom: 12 }}
          />
          {pinError && <p style={{ fontSize: '0.8rem', color: '#D32F2F', margin: '0 0 12px' }}>{pinError}</p>}
          <button
            type="submit"
            className="button is-medium is-fullwidth"
            style={{ background: '#D40511', color: '#fff', border: 'none' }}
          >
            Acessar
          </button>
        </form>
      </div>
    );
  }

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
      const snapshot = await examService.getLatestByCpf(cpf);
      if (snapshot) {
        setExamData(snapshot);
        setResult(snapshot.status === 'approved' ? 'apto' : 'reprovado');
      } else {
        setResult('nao_encontrado');
      }
    } catch (err) {
      console.error('Erro ao consultar CPF:', err);
      setResult('erro');
    } finally {
      setChecking(false);
    }
  };

  const handleNewCheck = () => {
    setCpf('');
    setResult(null);
    setExamData(null);
    setCpfError('');
    cpfRef.current?.focus();
  };

  return (
    <>
      <style>{`
        .portaria-bg {
          background: url('/wallpaper-pc.jpg') center/cover no-repeat !important;
        }
        @media (max-width: 768px) {
          .portaria-bg {
            background: url('/wallpaper2.jpg') center/cover no-repeat !important;
          }
        }
      `}</style>
    <div className="portaria-bg" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        borderRadius: 20,
        padding: 32,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ textAlign: 'right', marginBottom: 8 }}>
            <button
              className="button is-small is-light"
              onClick={() => { sessionStorage.removeItem('portaria_auth'); setAuthorized(false); setResult(null); setExamData(null); }}
              style={{ fontSize: '0.75rem' }}
            >
              <i className="fas fa-sign-out-alt" style={{ marginRight: 4 }} /> Sair
            </button>
          </div>
          <img src="/dhl-logo.png" alt="DHL" style={{ width: '50%', height: 'auto' }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#D40511', margin: 0 }}>
            Consulta de Liberação
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#888', margin: '4px 0 0' }}>
            Portaria - DHL
          </p>
        </div>

        {!result && (
          <div className="field">
            <label className="label" style={{ fontSize: '0.85rem', color: '#555' }}>
              Digite o CPF do colaborador
            </label>
            <div className="control has-icons-left">
              <input
                ref={cpfRef}
                className="input is-medium"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCPFChange}
                maxLength={14}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCheck(); }}
              />
              <span className="icon is-left is-small">
                <i className="fas fa-id-card" />
              </span>
            </div>
            {cpfError && <p className="help is-danger">{cpfError}</p>}
          </div>
        )}

        {!result && (
          <button
            className={`button is-medium is-fullwidth ${checking ? 'is-loading' : ''}`}
            disabled={cpf.replace(/\D/g, '').length !== 11 || !!cpfError || checking}
            onClick={handleCheck}
            style={{ borderRadius: 8, marginTop: 8, background: '#D40511', color: '#fff', border: 'none' }}
          >
            Consultar
          </button>
        )}

        {result === 'apto' && examData && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#e8f5e9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <i className="fas fa-check-circle fa-3x" style={{ color: '#28A745' }} />
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#28A745', margin: 0 }}>
              APTO
            </p>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a1a2e', margin: '8px 0 4px' }}>
              {examData.name}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>
              {formatCPF(examData.cpf || cpf)}
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 24,
              marginTop: 16,
              padding: 12,
              background: '#f9f9fb',
              borderRadius: 12,
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.7rem', color: '#999', margin: 0 }}>Cidade</p>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: '2px 0 0' }}>{examData.city}</p>
              </div>
              <div style={{ width: 1, background: '#eee' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.7rem', color: '#999', margin: 0 }}>Empresa diarista</p>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: '2px 0 0' }}>{examData.operationType}</p>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#888', margin: '12px 0 0' }}>
              Liberado em {examData.createdAt ? new Date(examData.createdAt).toLocaleDateString('pt-BR') : '-'}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#888', margin: '4px 0 0' }}>
              Nota: {examData.score ?? '-'}
            </p>
            <button
              className="button is-medium is-fullwidth"
              onClick={handleNewCheck}
              style={{ borderRadius: 8, marginTop: 20, background: '#FFD700', color: '#1a1a2e', border: 'none' }}
            >
              Nova Consulta
            </button>
          </div>
        )}

        {result === 'reprovado' && examData && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#fef0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <i className="fas fa-times-circle fa-3x" style={{ color: '#D40511' }} />
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#D40511', margin: 0 }}>
              REPROVADO
            </p>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a1a2e', margin: '8px 0 4px' }}>
              {examData.name}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>
              {formatCPF(examData.cpf || cpf)}
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 24,
              marginTop: 16,
              padding: 12,
              background: '#f9f9fb',
              borderRadius: 12,
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.7rem', color: '#999', margin: 0 }}>Cidade</p>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: '2px 0 0' }}>{examData.city}</p>
              </div>
              <div style={{ width: 1, background: '#eee' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.7rem', color: '#999', margin: 0 }}>Empresa diarista</p>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: '2px 0 0' }}>{examData.operationType}</p>
              </div>
            </div>
            <button
              className="button is-medium is-fullwidth"
              onClick={handleNewCheck}
              style={{ borderRadius: 8, marginTop: 20, background: '#FFD700', color: '#1a1a2e', border: 'none' }}
            >
              Nova Consulta
            </button>
          </div>
        )}

        {result === 'nao_encontrado' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#fff8e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <i className="fas fa-user-slash fa-3x" style={{ color: '#ffd83d' }} />
            </div>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
              Não encontrado
            </p>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '8px 0 0' }}>
              CPF {formatCPF(cpf)} não possui registro de treinamento.
            </p>
            <button
              className="button is-medium is-fullwidth"
              onClick={handleNewCheck}
              style={{ borderRadius: 8, marginTop: 20, background: '#FFD700', color: '#1a1a2e', border: 'none' }}
            >
              Nova Consulta
            </button>
          </div>
        )}

        {result === 'erro' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#fef0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <i className="fas fa-exclamation-triangle fa-3x" style={{ color: '#f14668' }} />
            </div>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f14668', margin: 0 }}>
              Erro na consulta
            </p>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '8px 0 0' }}>
              Tente novamente em alguns instantes.
            </p>
            <button
              className="button is-light is-medium is-fullwidth"
              onClick={handleNewCheck}
              style={{ borderRadius: 8, marginTop: 20 }}
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
