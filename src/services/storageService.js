import { apiService } from './apiService';

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;

export const storageService = {
  async uploadSignature(base64Data, examId) {
    // 1. Pega assinatura do Worker
    const signData = await apiService.getCloudinarySignature(examId);

    // 2. Faz upload ASSINADO
    const formData = new FormData();
    formData.append('file', base64Data);
    formData.append('upload_preset', signData.upload_preset);
    formData.append('public_id', signData.public_id);
    formData.append('folder', signData.folder);
    formData.append('timestamp', String(signData.timestamp));
    formData.append('api_key', signData.apiKey);
    formData.append('signature', signData.signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cloudinary upload failed: ${err}`);
    }
    const data = await res.json();
    return data.secure_url;
  },
};
