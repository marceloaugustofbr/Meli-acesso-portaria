const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = 'meli_preset';

export const storageService = {
  async uploadSignature(base64Data, examId) {
    const formData = new FormData();
    formData.append('file', base64Data);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('public_id', `signatures/${examId}`);
    formData.append('folder', 'signatures');

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
