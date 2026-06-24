import React, { useState, useRef, useEffect, useCallback } from 'react';
import { examService, apiService } from '../../services';
import { maskCPF, formatCPF, validateCPF } from '../../utils/cpf';
import './Portaria.css';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30000;

function loadJsQR() {
  return new Promise(function (resolve, reject) {
    if (window.jsQR) { resolve(window.jsQR); return; }
    const s = document.createElement('script');
    s.src = '/jsqr.js';
    s.onload = function () { resolve(window.jsQR); };
    s.onerror = function () { reject(new Error('Falha ao carregar jsQR')); };
    document.head.appendChild(s);
  });
}

export default function Portaria() {
  const cpfRef = useRef(null);
  const [cpf, setCpf] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [examData, setExamData] = useState(null);
  const [cpfError, setCpfError] = useState('');
  const [accessPin, setAccessPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [portariaToken, setPortariaToken] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraPermission, setCameraPermission] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const cameraActiveRef = useRef(false);

  const [attempts, setAttempts] = useState(() => {
    try {
      const saved = sessionStorage.getItem('portaria_attempts');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.lockUntil && Date.now() < data.lockUntil) {
          return { count: data.count, lockUntil: data.lockUntil };
        }
      }
    } catch {} // eslint-disable-line no-empty
    return { count: 0, lockUntil: 0 };
  });

  const [lockTimer, setLockTimer] = useState(0);
  const locked = attempts.lockUntil > Date.now();

  useEffect(() => {
    if (!locked) { setLockTimer(0); return undefined; }
    const tick = () => {
      const remaining = Math.ceil((attempts.lockUntil - Date.now()) / 1000);
      if (remaining <= 0) { setLockTimer(0); setAttempts({ count: 0, lockUntil: 0 }); return; }
      setLockTimer(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [locked, attempts.lockUntil]);

  const saveAttempts = useCallback((count, lockUntil) => {
    sessionStorage.setItem('portaria_attempts', JSON.stringify({ count, lockUntil }));
    setAttempts({ count, lockUntil });
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('portaria_token');
    const expiresAt = sessionStorage.getItem('portaria_expires_at');
    if (saved && expiresAt && Date.now() < Number(expiresAt)) {
      setPortariaToken(saved);
      setAuthorized(true);
    } else {
      sessionStorage.removeItem('portaria_token');
      sessionStorage.removeItem('portaria_expires_at');
    }
  }, []);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!accessPin.trim() || locked) return;
    setPinLoading(true);
    setPinError('');
    try {
      const res = await apiService.verifyPin(accessPin);
      const decoded = JSON.parse(atob(res.token.split('.')[1]));
      const expiresAt = decoded.exp * 1000;
      sessionStorage.setItem('portaria_token', res.token);
      sessionStorage.setItem('portaria_expires_at', String(expiresAt));
      sessionStorage.removeItem('portaria_attempts');
      setPortariaToken(res.token);
      setAuthorized(true);
      setPinError('');
    } catch (err) {
      const newCount = attempts.count + 1;
      if (newCount >= MAX_ATTEMPTS) {
        saveAttempts(0, Date.now() + LOCKOUT_MS);
        setPinError(`Muitas tentativas. Aguarde ${LOCKOUT_MS / 1000}s`);
      } else {
        saveAttempts(newCount, 0);
        setPinError(`Senha incorreta (${MAX_ATTEMPTS - newCount} tentativa(s) restante(s))`);
      }
    } finally {
      setPinLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) cpfRef.current?.focus();
  }, [authorized]);

  const handleCPFChange = (e) => {
    setCpf(maskCPF(e.target.value));
    setResult(null);
    setExamData(null);
    setCpfError('');
  };

  const doCheck = async (cpfValue) => {
    const digits = cpfValue.replace(/\D/g, '');
    if (digits.length !== 11) return;

    if (!validateCPF(cpfValue)) {
      setCpfError('CPF inválido');
      return;
    }

    setChecking(true);
    setResult(null);
    setExamData(null);
    try {
      const snapshot = await examService.getLatestByCpf(cpfValue, portariaToken);
      if (snapshot) {
        setExamData(snapshot);
        if (snapshot.status === 'blocked') {
          setResult('bloqueado');
        } else if (snapshot.status === 'approved') {
          setResult('liberado');
        } else {
          setResult('reprovado');
        }
      } else {
        setResult('nao_encontrado');
      }
    } catch (err) {
      if (err.message?.includes('Sessão')) {
        sessionStorage.removeItem('portaria_token');
        sessionStorage.removeItem('portaria_expires_at');
        setPortariaToken('');
        setAuthorized(false);
        setPinError('Sessão expirada, informe a senha novamente');
        return;
      }
      setResult('erro');
    } finally {
      setChecking(false);
      setScanLoading(false);
    }
  };

  const handleCheck = () => doCheck(cpf);

  const handleNewCheck = () => {
    setCpf('');
    setResult(null);
    setExamData(null);
    setCpfError('');
    setScanLoading(false);
    cpfRef.current?.focus();
  };

  const stopCamera = useCallback(() => {
    cameraActiveRef.current = false;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(function (t) { t.stop(); });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!showScanner) {
      stopCamera();
      return undefined;
    }

    cameraActiveRef.current = true;
    setCameraPermission(true);
    setTorchOn(false);

    const video = videoRef.current;
    if (!video) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return undefined;

    let jsqrLoaded = false;

    function handleScan() {
      if (!cameraActiveRef.current) return;
      if (!jsqrLoaded) return;

      if (video.readyState < 2) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        const digits = code.data.replace(/\D/g, '');
        if (digits.length === 11) {
          cameraActiveRef.current = false;
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(function (t) { t.stop(); });
            streamRef.current = null;
          }
          video.srcObject = null;
          const maskedCpf = maskCPF(digits);
          setCpf(maskedCpf);
          setShowScanner(false);
          setFacingMode('environment');
          setScanLoading(true);
          doCheck(maskedCpf);
        }
      }
    }

    loadJsQR().then(function () {
      jsqrLoaded = true;
      if (!cameraActiveRef.current) return;

      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
        },
      }).then(function (stream) {
        if (!cameraActiveRef.current) {
          stream.getTracks().forEach(function (t) { t.stop(); });
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        video.muted = true;
        video.play();
      }).then(function () {
        if (!cameraActiveRef.current) return;
        scanIntervalRef.current = setInterval(handleScan, 400);
      }).catch(function (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraPermission(false);
        }
      });
    }).catch(function () {
      setCameraPermission(false);
    });

    return function cleanup() {
      cameraActiveRef.current = false;
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(function (t) { t.stop(); });
        streamRef.current = null;
      }
      if (video) video.srcObject = null;
    };
  }, [showScanner, facingMode, stopCamera]);

  useEffect(function flashEffect() {
    if (!streamRef.current || !showScanner) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track || !track.applyConstraints) return;
    track.applyConstraints({ advanced: [{ torch: torchOn }] }).catch(function () {});
  }, [torchOn, showScanner]);

  if (!authorized) {
    return (
      <div className="portaria-wrapper" style={{ background: '#f5f5f5' }}>
        <form onSubmit={handlePinSubmit} className="portaria-card" style={{ textAlign: 'center' }}>
          <div className="portaria-pin-icon"><i className="fas fa-lock" /></div>
          <h1 className="portaria-pin-title">Acesso Restrito</h1>
          <p className="portaria-pin-subtitle">Informe a senha de acesso à portaria</p>
          <input
            type="password"
            className="input is-medium portaria-pin-input"
            placeholder={locked ? `Bloqueado por ${lockTimer}s` : 'Senha'}
            value={accessPin}
            onChange={(e) => { setAccessPin(e.target.value); setPinError(''); }}
            disabled={locked}
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
          />
          {pinError && <p className="portaria-pin-error">{pinError}</p>}
          <button
            type="submit"
            className={`btn-dhl is-fullwidth${pinLoading ? ' is-loading' : ''}`}
            disabled={pinLoading || locked}
          >
            Acessar
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .portaria-bg {
          background: url('/wallpaper-pc-opt.webp') center/cover no-repeat !important;
        }
        @media (max-width: 768px) {
          .portaria-bg {
            background: url('/wallpaper2-opt.webp') center/cover no-repeat !important;
          }
        }
        @keyframes portaria-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    <div className="portaria-bg portaria-wrapper">
      <div className="portaria-card">
        <div className="portaria-card-header">
          <div className="portaria-card-header-top">
            <button
              className="btn-dhl is-small is-ghost"
              onClick={() => { sessionStorage.removeItem('portaria_auth'); setAuthorized(false); setResult(null); setExamData(null); }}
            >
              <i className="fas fa-sign-out-alt" /> Sair
            </button>
          </div>
          <div className="portaria-logo-row">
            <img src="/dhl-logo.png" alt="DHL" loading="lazy" />
            <div className="portaria-logo-text">
              <h1 className="portaria-logo-title">Consulta de Liberação</h1>
              <p className="portaria-logo-sub">Portaria</p>
            </div>
          </div>
        </div>

        {!result && !showScanner && !scanLoading && (
          <div className="field">
            <label className="portaria-cpf-label">Digite o CPF do colaborador</label>
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

        {!result && !showScanner && !scanLoading && (
          <div className="portaria-btn-row">
            <button
              className={`btn-dhl is-fullwidth${checking ? ' is-loading' : ''}`}
              disabled={cpf.replace(/\D/g, '').length !== 11 || !!cpfError || checking}
              onClick={handleCheck}
            >
              Consultar
            </button>
            <button
              className="btn-dhl is-fullwidth is-outline"
              onClick={() => setShowScanner(true)}
            >
              <i className="fas fa-camera" />
              Ler QR Code
            </button>
          </div>
        )}

        {scanLoading && checking && (
          <div className="portaria-loading">
            <div className="portaria-spinner" />
            <p className="portaria-loading-text">Consultando...</p>
          </div>
        )}

        {!result && showScanner && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: '#000',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1,
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setFacingMode(function (f) { return f === 'environment' ? 'user' : 'environment'; })}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <i className="fas fa-sync-alt" />
                  {facingMode === 'environment' ? 'Frontal' : 'Traseira'}
                </button>
                <button
                  onClick={() => setTorchOn(function (t) { return !t; })}
                  style={{
                    background: torchOn ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <i className="fas fa-bolt" style={{ color: torchOn ? '#FFD700' : '#fff' }} />
                  Flash
                </button>
              </div>

              <button
                onClick={() => { setShowScanner(false); setFacingMode('environment'); setTorchOn(false); }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  color: '#fff',
                  width: 36,
                  height: 36,
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#111' }}>
              {!cameraPermission && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: '#111', color: '#fff', zIndex: 10,
                  padding: 24, textAlign: 'center',
                }}>
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.8 }} />
                  <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>Permissão necessária</p>
                  <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: 0 }}>
                    Acesse as configurações do seu dispositivo e permita o acesso à câmera.
                  </p>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div style={{
              textAlign: 'center',
              padding: '16px 16px 24px',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              fontSize: '0.85rem',
            }}>
              <i className="fas fa-qrcode" style={{ marginRight: 6, opacity: 0.7 }} />
              Aponte a câmera para o QR Code do colaborador
            </div>
          </div>
        )}

        {result === 'liberado' && examData && (
          <div className="portaria-result-card is-approved">
            <div className="portaria-result-icon approved">
              <i className="fas fa-check-circle" />
            </div>
            <p className="portaria-result-status approved">LIBERADO</p>
            <p className="portaria-result-name">{examData.name?.toUpperCase()}</p>
            <p className="portaria-result-cpf">{maskCPF(examData.cpf || cpf)}</p>
            <div className="portaria-result-details">
              <div>
                <p className="portaria-result-detail-label">Cidade</p>
                <p className="portaria-result-detail-value">{examData.city}</p>
              </div>
              <div>
                <p className="portaria-result-detail-label">Empresa</p>
                <p className="portaria-result-detail-value">{examData.operationType}</p>
              </div>
            </div>
            <div className="portaria-result-stats">
              <div>
                <p className="portaria-result-stat-label">Nota</p>
                <p className="portaria-result-stat-value approved">
                  {examData.percentage != null ? (examData.percentage / 10).toFixed(1) : '-'}
                </p>
              </div>
              <div>
                <p className="portaria-result-stat-label">Data da liberação</p>
                <p className="portaria-result-stat-value" style={{ color: '#555' }}>
                  {examData.createdAt ? new Date(examData.createdAt).toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>
            </div>
            <div className="portaria-result-btn">
              <button className="btn-dhl is-fullwidth" onClick={handleNewCheck}>
                Nova Consulta
              </button>
            </div>
          </div>
        )}

        {result === 'reprovado' && examData && (
          <div className="portaria-result-card is-reproved">
            <div className="portaria-result-icon reproved">
              <i className="fas fa-times-circle" />
            </div>
            <p className="portaria-result-status reproved">REPROVADO</p>
            <p className="portaria-result-name">{examData.name?.toUpperCase()}</p>
            <p className="portaria-result-cpf">{maskCPF(examData.cpf || cpf)}</p>
            <div className="portaria-result-details">
              <div>
                <p className="portaria-result-detail-label">Cidade</p>
                <p className="portaria-result-detail-value">{examData.city}</p>
              </div>
              <div>
                <p className="portaria-result-detail-label">Empresa</p>
                <p className="portaria-result-detail-value">{examData.operationType}</p>
              </div>
            </div>
            <div className="portaria-result-btn">
              <button className="btn-dhl is-fullwidth" onClick={handleNewCheck}>
                Nova Consulta
              </button>
            </div>
          </div>
        )}

        {result === 'bloqueado' && examData && (
          <div className="portaria-result-card is-blocked">
            <div className="portaria-result-icon blocked">
              <i className="fas fa-ban" />
            </div>
            <p className="portaria-result-status blocked">BLOQUEADO</p>
            <p className="portaria-result-name">{examData.name?.toUpperCase()}</p>
            <p className="portaria-result-cpf">{maskCPF(examData.cpf || cpf)}</p>
            <div className="portaria-block-reason">
              <p className="portaria-block-reason-header">
                <i className="fas fa-info-circle" />
                Motivo do bloqueio
              </p>
              <p className="portaria-block-reason-text">
                {examData.blockReason || 'Não informado'}
              </p>
              {examData.blockedAt && (
                <p className="portaria-block-date">
                  {new Date(examData.blockedAt).toLocaleString('pt-BR')}
                  {examData.blockedBy ? ` por ${examData.blockedBy}` : ''}
                </p>
              )}
            </div>
            <div className="portaria-result-btn">
              <button className="btn-dhl is-fullwidth" onClick={handleNewCheck}>
                Nova Consulta
              </button>
            </div>
          </div>
        )}

        {result === 'nao_encontrado' && (
          <div className="portaria-result-card is-notfound">
            <div className="portaria-result-icon notfound">
              <i className="fas fa-user-slash" />
            </div>
            <p className="portaria-result-status notfound">NÃO ENCONTRADO</p>
            <p className="portaria-result-message">
              CPF {formatCPF(cpf)} não possui registro de treinamento.
            </p>
            <div className="portaria-result-btn">
              <button className="btn-dhl is-fullwidth" onClick={handleNewCheck}>
                Nova Consulta
              </button>
            </div>
          </div>
        )}

        {result === 'erro' && (
          <div className="portaria-result-card is-error">
            <div className="portaria-result-icon errored">
              <i className="fas fa-exclamation-triangle" />
            </div>
            <p className="portaria-result-status error">Erro na consulta</p>
            <p className="portaria-result-message">
              Tente novamente em alguns instantes.
            </p>
            <div className="portaria-result-btn">
              <button className="btn-dhl is-fullwidth" onClick={handleNewCheck}>
                Tentar Novamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
