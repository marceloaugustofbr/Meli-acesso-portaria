import { storage } from '../firebase';

export const storageService = {
  async uploadSignature(base64Data, examId) {
    const ref = storage.ref(`signatures/${examId}.png`);
    const snapshot = await ref.putString(base64Data, 'data_url');
    return snapshot.ref.getDownloadURL();
  },
};
