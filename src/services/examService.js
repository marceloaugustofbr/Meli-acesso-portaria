import firebase from 'firebase/app';
import { firestore } from '../firebase';

const FIELD_VALUE = firebase.firestore.FieldValue;
const LATEST_COLLECTION = 'latest_exams';
const AGGREGATION_DOC = 'aggregations/examStats';

const cpfDigits = (cpf) => (cpf || '').replace(/\D/g, '');

const sanitizeText = (str) => (str || '').replace(/<[^>]*>/g, '').replace(/[<>"']/g, '').trim();

let questionsMapCache = null;

async function getQuestionsMap() {
  if (questionsMapCache) return questionsMapCache;
  const snap = await firestore.collection('questions').get();
  const map = {};
  snap.docs.forEach((doc) => {
    map[doc.id] = doc.data();
  });
  questionsMapCache = map;
  return map;
}

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

    const questionsMap = await getQuestionsMap();

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
      name: sanitizeText(examData.name),
      cpf: examData.cpf || '',
      city: sanitizeText(examData.city),
      operationType: sanitizeText(examData.operationType),
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
    const peopleUpdates = {
      totalPeople: FIELD_VALUE.increment(existing.exists ? 0 : 1),
      approvedPeople: FIELD_VALUE.increment(0),
      reprovedPeople: FIELD_VALUE.increment(0),
    };

    if (previousStatus !== computedStatus) {
      if (previousStatus === 'approved') peopleUpdates.approvedPeople = FIELD_VALUE.increment(-1);
      else if (previousStatus === 'reproved') peopleUpdates.reprovedPeople = FIELD_VALUE.increment(-1);

      if (computedStatus === 'approved') peopleUpdates.approvedPeople = FIELD_VALUE.increment(1);
      else if (computedStatus === 'reproved') peopleUpdates.reprovedPeople = FIELD_VALUE.increment(1);
    }

    const month = new Date().toISOString().substring(0, 7);

    await ref.set({
      ...peopleUpdates,
      total: FIELD_VALUE.increment(1),
      approved: computedStatus === 'approved' ? FIELD_VALUE.increment(1) : FIELD_VALUE.increment(0),
      reproved: computedStatus === 'reproved' ? FIELD_VALUE.increment(1) : FIELD_VALUE.increment(0),
      [`monthlyCounts.${month}`]: FIELD_VALUE.increment(1),
      [`typeCounts.${examData.operationType || 'unknown'}`]: FIELD_VALUE.increment(1),
    }, { merge: true });

    return key;
  },

  async getAggregation() {
    const snap = await firestore.doc(AGGREGATION_DOC).get();

    const kpis = snap.exists ? snap.data() : {};

    const allDocs = [];
    let lastDoc = null;
    const PAGE_SIZE = 300;

    const fetchPage = async () => {
      let query = firestore.collection(LATEST_COLLECTION).orderBy('createdAt', 'desc').limit(PAGE_SIZE);
      if (lastDoc) query = query.startAfter(lastDoc);
      const snapshot = await query.get();
      if (snapshot.empty) return;
      snapshot.docs.forEach((d) => allDocs.push(d));
      if (snapshot.docs.length < PAGE_SIZE) return;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      await fetchPage();
    };

    await fetchPage();

    const monthlyCounts = {};
    const typeCounts = {};

    allDocs.forEach((doc) => {
      const d = doc.data();
      const month = d.createdAt ? d.createdAt.substring(0, 7) : 'unknown';
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;

      const type = d.operationType || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const aggregation = {
      total: kpis.total ?? allDocs.length,
      totalPeople: kpis.totalPeople ?? new Set(allDocs.map((d) => d.id)).size,
      approvedPeople: kpis.approvedPeople ?? 0,
      reprovedPeople: kpis.reprovedPeople ?? 0,
      monthlyCounts,
      typeCounts,
    };

    await firestore.doc(AGGREGATION_DOC).set(aggregation, { merge: true });

    return {
      ...aggregation,
      approvalRate: aggregation.totalPeople > 0
        ? Math.round((aggregation.approvedPeople / aggregation.totalPeople) * 100)
        : 0,
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
    return this.getById(cpfDigits(lookup.data().cpf));
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
