import { https } from 'firebase-functions';
import { firestore } from 'firebase-admin';

export default https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'auth/unauthenticated');
  }

  if (!context.auth.token.isAdmin) {
    throw new https.HttpsError('permission-denied', 'auth/forbidden');
  }

  const db = firestore();
  const snapshot = await db.collection('latest_exams').get();
  let migrated = 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    const docData = doc.data();
    if (!docData.uid) {
      const uid = db.collection('_dummy').doc().id;
      batch.set(db.collection('exam_uids').doc(uid), { cpf: doc.id });
      batch.update(db.collection('latest_exams').doc(doc.id), { uid });
      migrated++;
    }
  });

  if (migrated > 0) {
    await batch.commit();
  }

  console.log(`[migrateUids] ${migrated} documents migrated`);
  return { migrated };
});
