export function downloadQRCode(canvasRef, cpf) {
  const canvas = canvasRef?.current;
  if (!canvas) return;
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `qr-code-${(cpf || '').replace(/\D/g, '')}.png`;
  a.click();
}
