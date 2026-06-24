import React, { useRef, useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import classNames from 'classnames';
import { useExamStore } from '../../../store';
import { cloudinaryService } from '../../../services';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';

export default function ExamSignature() {
  const history = useHistory();
  const sigRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const setSignature = useExamStore((s) => s.setSignature);
  const setSignatureIp = useExamStore((s) => s.setSignatureIp);
  const setSignatureUserAgent = useExamStore((s) => s.setSignatureUserAgent);
  const setStep = useExamStore((s) => s.setStep);

  useEffect(() => {
    setSignatureUserAgent(navigator.userAgent);
    fetch('https://api.ipify.org?format=json')
      .then((r) => r.json())
      .then((data) => setSignatureIp(data.ip))
      .catch(() => setSignatureIp('não disponível'));
  }, []);

  const handleClear = () => {
    sigRef.current?.clear();
  };

  const handleConfirm = async () => {
    if (sigRef.current?.isEmpty()) return;
    setSaving(true);

    const trimmed = sigRef.current.getTrimmedCanvas();
    const maxWidth = 300;
    const scale = Math.min(1, maxWidth / trimmed.width);
    const resized = document.createElement('canvas');
    resized.width = Math.round(trimmed.width * scale);
    resized.height = Math.round(trimmed.height * scale);
    const ctx = resized.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(trimmed, 0, 0, resized.width, resized.height);

    const blob = await new Promise((resolve) => resized.toBlob(resolve, 'image/png'));
    try {
      const url = await cloudinaryService.uploadSignature(blob);
      setSignature(url);
    } catch (err) {
      setSignature(null);
    }
    setSaving(false);
    setStep('result');
    history.push(ROUTES.EXAM_RESULT);
  };

  return (
    <ExamLayout>
      <div className="card">
        <div className="card-content">
          <h2 className="title is-5 mb-4">Assinatura Digital</h2>
          <p className="has-text-grey is-size-7 mb-3">Desenhe sua assinatura abaixo:</p>

          <div
            style={{
              border: '2px dashed #ccc',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <SignatureCanvas
              ref={sigRef}
              penColor="#000"
              canvasProps={{
                width: 600,
                height: 200,
                className: 'sig-canvas',
                style: { width: '100%', height: 200, cursor: 'crosshair' },
              }}
            />
          </div>

          <div className="buttons is-centered mt-4">
            <button className="btn-dhl is-outline" onClick={handleClear} disabled={saving}>
              Limpar
            </button>
            <button
              className={classNames('btn-dhl', { 'is-loading': saving })}
              onClick={handleConfirm}
              disabled={saving}
            >
              Confirmar Assinatura
            </button>
          </div>
        </div>
      </div>
    </ExamLayout>
  );
}