import firebase from 'firebase/app';
import { firestore } from '../firebase';

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
      signatureIp: examData.signatureIp || null,
      signatureDate: examData.signatureDate || now,
      signatureUserAgent: examData.signatureUserAgent || null,
      answers: validatedAnswers,
      createdAt: now,
      attempts: (existing.exists ? (existing.data().attempts || 0) : 0) + 1,
    }, { merge: true });

    const ref = firestore.doc(AGGREGATION_DOC);
    const snap = await ref.get();
    const current = snap.exists ? snap.data() : {};

    const month = new Date().toISOString().substring(0, 7);
    const type = examData.operationType || 'unknown';

    const newMonthlyCounts = { ...(current.monthlyCounts || {}) };
    newMonthlyCounts[month] = (newMonthlyCounts[month] || 0) + 1;

    const newTypeCounts = { ...(current.typeCounts || {}) };
    newTypeCounts[type] = (newTypeCounts[type] || 0) + 1;

    let approvedDelta = 0;
    let reprovedDelta = 0;

    if (previousStatus !== computedStatus) {
      if (previousStatus === 'approved') approvedDelta -= 1;
      else if (previousStatus === 'reproved') reprovedDelta -= 1;

      if (computedStatus === 'approved') approvedDelta += 1;
      else if (computedStatus === 'reproved') reprovedDelta += 1;
    }

    await ref.set({
      totalPeople: (current.totalPeople || 0) + (existing.exists ? 0 : 1),
      approvedPeople: (current.approvedPeople || 0) + approvedDelta,
      reprovedPeople: (current.reprovedPeople || 0) + reprovedDelta,
      total: (current.total || 0) + 1,
      monthlyCounts: newMonthlyCounts,
      typeCounts: newTypeCounts,
    }, { merge: true });

    return key;
  },

  async getAggregation() {
    const snap = await firestore.doc(AGGREGATION_DOC).get();
    const kpis = snap.exists ? snap.data() : {};

    const aggregation = {
      total: kpis.total ?? 0,
      totalPeople: kpis.totalPeople ?? 0,
      approvedPeople: kpis.approvedPeople ?? 0,
      reprovedPeople: kpis.reprovedPeople ?? 0,
      monthlyCounts: kpis.monthlyCounts ?? {},
      typeCounts: kpis.typeCounts ?? {},
    };

    return {
      ...aggregation,
      approvalRate: aggregation.totalPeople > 0
        ? Math.round((aggregation.approvedPeople / aggregation.totalPeople) * 100)
        : 0,
    };
  },

  async recalculateAggregation() {
    const snapshot = await firestore.collection(LATEST_COLLECTION).get();
    const allDocs = snapshot.docs;

    const monthlyCounts = {};
    const typeCounts = {};
    const cpfSet = new Set();
    let approvedCount = 0;
    let reprovedCount = 0;

    allDocs.forEach((doc) => {
      const d = doc.data();
      const month = d.createdAt ? d.createdAt.substring(0, 7) : 'unknown';
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;

      const type = d.operationType || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      cpfSet.add(d.cpf);
      if (d.status === 'approved') approvedCount += 1;
      else if (d.status === 'reproved') reprovedCount += 1;
    });

    const ref = firestore.doc(AGGREGATION_DOC);
    await ref.set({
      total: allDocs.length,
      totalPeople: cpfSet.size,
      approvedPeople: approvedCount,
      reprovedPeople: reprovedCount,
      monthlyCounts,
      typeCounts,
    }, { merge: true });

    return { total: allDocs.length, totalPeople: cpfSet.size, monthlyCounts, typeCounts };
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
