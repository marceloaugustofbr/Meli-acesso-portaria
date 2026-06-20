import React, { useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import classNames from 'classnames';
import { useExamStore } from '../../../store';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';

export default function ExamSignature() {
  const history = useHistory();
  const sigRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const setSignature = useExamStore((s) => s.setSignature);
  const setStep = useExamStore((s) => s.setStep);

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

    const dataUrl = resized.toDataURL('image/png');
    setSignature(dataUrl);
    await new Promise((r) => setTimeout(r, 500));
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
            <button className="button is-light" onClick={handleClear} disabled={saving}>
              Limpar
            </button>
            <button
              className={classNames('button', { 'is-loading': saving })}
              onClick={handleConfirm}
              disabled={saving}
              style={{ background: '#D40511', color: '#fff', border: 'none' }}
            >
              Confirmar Assinatura
            </button>
          </div>
        </div>
      </div>
    </ExamLayout>
  );
}