const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

export const cloudinaryService = {
  async uploadSignature(blob) {
    const form = new FormData();
    form.append('file', blob);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', 'signatures');

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: form }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao enviar assinatura para Cloudinary');
    }
    const data = await res.json();
    return data.secure_url;
  },
};
