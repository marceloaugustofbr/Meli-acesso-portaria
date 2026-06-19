import { firestore } from '../firebase';
import { questions } from '../data/questions';

const COLLECTION = 'questions';

async function seedQuestions(force = false) {
  const existing = await firestore.collection(COLLECTION).get();
  if (existing.docs.length > 0 && !force) return;

  if (force) {
    const batch = firestore.batch();
    existing.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

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
    if (snapshot.docs.length !== questions.length) {
      await seedQuestions(true);
      const retry = await firestore.collection(COLLECTION).get();
      return retry.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
};
