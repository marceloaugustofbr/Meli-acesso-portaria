import firebase from 'firebase/app';
import { firestore } from '../firebase';

const FIELD_VALUE = firebase.firestore.FieldValue;
const LATEST_COLLECTION = 'latest_exams';
const AGGREGATION_DOC = 'aggregations/examStats';

const cpfDigits = (cpf) => (cpf || '').replace(/\D/g, '');

export const examService = {
  async create(examData) {
    const now = new Date().toISOString();
    const key = cpfDigits(examData.cpf);
    if (!key) return null;

    const existing = await firestore.collection(LATEST_COLLECTION).doc(key).get();
    const previousStatus = existing.exists ? existing.data().status : null;

    if (previousStatus === 'blocked') {
      throw new Error('Colaborador bloqueado não pode realizar a prova.');
    }

    let uid = existing.exists ? existing.data().uid : null;
    if (!uid) {
      uid = crypto.randomUUID();
      await firestore.collection('exam_uids').doc(uid).set({ cpf: examData.cpf });
    }

    const questionsSnap = await firestore.collection('questions').get();
    const questionsMap = {};
    questionsSnap.docs.forEach((doc) => {
      questionsMap[doc.id] = doc.data();
    });

    const validatedAnswers = (examData.answers || []).map((a) => {
      const q = questionsMap[a.questionId];
      const isCorrect = q ? a.selectedAnswer === q.correctAnswer : false;
      return {
        ...a,
        isCorrect,
      };
    });

    const correctCount = validatedAnswers.filter((a) => a.isCorrect).length;
    const wrongCount = validatedAnswers.length - correctCount;
    const total = validatedAnswers.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const computedStatus = percentage >= 70 ? 'approved' : 'reproved';

    await firestore.collection(LATEST_COLLECTION).doc(key).set({
      uid,
      name: examData.name || '',
      cpf: examData.cpf || '',
      city: examData.city || '',
      operationType: examData.operationType || '',
      startTime: examData.startTime || null,
      endTime: examData.endTime || null,
      duration: examData.duration || 0,
      score: correctCount,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      percentage,
      status: computedStatus,
      signature: examData.signature || null,
      answers: validatedAnswers,
      createdAt: now,
      attempts: FIELD_VALUE.increment(1),
    }, { merge: true });

    const ref = firestore.doc(AGGREGATION_DOC);
    const peopleUpdates = {};

    if (!existing.exists) {
      peopleUpdates.totalPeople = FIELD_VALUE.increment(1);
    }

    if (previousStatus !== computedStatus) {
      if (previousStatus === 'approved') peopleUpdates.approvedPeople = FIELD_VALUE.increment(-1);
      else if (previousStatus === 'reproved') peopleUpdates.reprovedPeople = FIELD_VALUE.increment(-1);

      if (computedStatus === 'approved') peopleUpdates.approvedPeople = FIELD_VALUE.increment(1);
      else if (computedStatus === 'reproved') peopleUpdates.reprovedPeople = FIELD_VALUE.increment(1);
    }

    if (Object.keys(peopleUpdates).length > 0) {
      await ref.set(peopleUpdates, { merge: true });
    }

    return key;
  },

  async updateAggregation(examData) {
    const ref = firestore.doc(AGGREGATION_DOC);
    const month = new Date().toISOString().substring(0, 7);
    const { operationType = 'unknown', status } = examData;

    await ref.set({
      total: FIELD_VALUE.increment(1),
      approved: status === 'approved' ? FIELD_VALUE.increment(1) : FIELD_VALUE.increment(0),
      reproved: status === 'reproved' ? FIELD_VALUE.increment(1) : FIELD_VALUE.increment(0),
      [`monthlyCounts.${month}`]: FIELD_VALUE.increment(1),
      [`typeCounts.${operationType}`]: FIELD_VALUE.increment(1),
    }, { merge: true });
  },

  async getAggregation() {
    const snap = await firestore.doc(AGGREGATION_DOC).get();
    if (snap.exists && snap.data().total > 0 && snap.data().approvedPeople !== undefined) {
      const data = snap.data();
      return {
        ...data,
        approvalRate: data.totalPeople > 0 ? Math.round((data.approvedPeople / data.totalPeople) * 100) : 0,
      };
    }

    const all = await firestore.collection(LATEST_COLLECTION).orderBy('createdAt', 'desc').limit(500).get();
    if (all.empty) {
      return { total: 0, totalPeople: 0, approvedPeople: 0, reprovedPeople: 0, approvalRate: 0, monthlyCounts: {}, typeCounts: {} };
    }

    const monthlyCounts = {};
    const typeCounts = {};
    let approvedPeople = 0;
    let reprovedPeople = 0;

    all.docs.forEach((doc) => {
      const d = doc.data();
      if (d.status === 'approved') approvedPeople++;
      else if (d.status === 'reproved') reprovedPeople++;

      const month = d.createdAt ? d.createdAt.substring(0, 7) : 'unknown';
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;

      const type = d.operationType || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const totalPeople = all.size;
    const aggregation = { total: totalPeople, totalPeople, approvedPeople, reprovedPeople, monthlyCounts, typeCounts };

    await firestore.doc(AGGREGATION_DOC).set(aggregation, { merge: true });

    return {
      ...aggregation,
      approvalRate: totalPeople > 0 ? Math.round((approvedPeople / totalPeople) * 100) : 0,
    };
  },

  async getLatestPage(filters = {}, pageSize = 15, cursor = null) {
    let query = firestore.collection(LATEST_COLLECTION);

    if (filters.name) {
      const name = filters.name.toUpperCase();
      query = query.where('name', '>=', name).where('name', '<', `${name}\uf8ff`);
    }
    if (filters.status) query = query.where('status', '==', filters.status);
    if (filters.city) query = query.where('city', '==', filters.city);
    if (filters.operationType) query = query.where('operationType', '==', filters.operationType);

    query = query.orderBy('createdAt', 'desc').limit(pageSize + 1);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const hasMore = docs.length > pageSize;
    if (hasMore) docs.pop();

    return {
      data: docs,
      hasMore,
      lastCursor: docs.length > 0
        ? snapshot.docs[hasMore ? pageSize - 1 : docs.length - 1]
        : null,
    };
  },

  async getById(id) {
    const doc = await firestore.collection(LATEST_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async getByUid(uid) {
    if (!uid) return null;
    const lookup = await firestore.collection('exam_uids').doc(uid).get();
    if (!lookup.exists) return null;
    return this.getById(lookup.data().cpf);
  },

  async getLatestByCpf(cpf) {
    const key = cpfDigits(cpf);
    if (!key) return null;
    const doc = await firestore.collection(LATEST_COLLECTION).doc(key).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async countByCpf(cpf) {
    const key = cpfDigits(cpf);
    if (!key) return 0;
    const doc = await firestore.collection(LATEST_COLLECTION).doc(key).get();
    return doc.exists ? 1 : 0;
  },

  async blockUser(cpf, blockData) {
    const key = cpfDigits(cpf);
    if (!key) return null;
    const now = new Date().toISOString();
    await firestore.collection(LATEST_COLLECTION).doc(key).set({
      status: 'blocked',
      blockedAt: now,
      blockedBy: blockData.blockedBy || '',
      blockReason: blockData.blockReason || '',
      blockSignature: blockData.blockSignature || null,
    }, { merge: true });
    return key;
  },
};
