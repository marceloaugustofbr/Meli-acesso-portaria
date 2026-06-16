import { firestore } from '../firebase';
import { questions } from '../data/questions';

const COLLECTION = 'questions';

async function seedQuestions() {
  const existing = await firestore.collection(COLLECTION).get();
  if (existing.docs.length > 0) return;

  const batch = firestore.batch();
  questions.forEach((q) => {
    const ref = firestore.collection(COLLECTION).doc();
    batch.set(ref, q);
  });
  await batch.commit();
}

export const questionsService = {
  seedQuestions,

  async getAll() {
    const snapshot = await firestore.collection(COLLECTION).get();
    if (snapshot.docs.length === 0) {
      await seedQuestions();
      const retry = await firestore.collection(COLLECTION).get();
      return retry.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
};
