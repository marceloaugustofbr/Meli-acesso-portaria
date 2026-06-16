import firebase from 'firebase/app';
import { firestore } from '../firebase';

const FIELD_VALUE = firebase.firestore.FieldValue;
const COLLECTION = 'security_exams';
const AGGREGATION_DOC = 'aggregations/examStats';

export const examService = {
  async create(examData) {
    const docRef = await firestore.collection(COLLECTION).add({
      ...examData,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
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
    if (snap.exists && snap.data().total > 0) {
      const data = snap.data();
      return {
        ...data,
        approvalRate: data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0,
      };
    }

    const all = await firestore.collection(COLLECTION).get();
    if (all.empty) {
      return { total: 0, approved: 0, reproved: 0, approvalRate: 0, monthlyCounts: {}, typeCounts: {} };
    }

    const monthlyCounts = {};
    const typeCounts = {};
    let approved = 0;
    let reproved = 0;

    all.docs.forEach((doc) => {
      const d = doc.data();
      if (d.status === 'approved') approved++;
      else if (d.status === 'reproved') reproved++;

      const month = d.createdAt ? d.createdAt.substring(0, 7) : 'unknown';
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;

      const type = d.operationType || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const total = all.size;
    const aggregation = { total, approved, reproved, monthlyCounts, typeCounts };

    await firestore.doc(AGGREGATION_DOC).set(aggregation, { merge: true });

    return {
      ...aggregation,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  },

  async getRecent(limit = 20) {
    const snapshot = await firestore
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  async getPage(filters = {}, pageSize = 15, cursor = null) {
    let query = firestore.collection(COLLECTION);

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
    const doc = await firestore.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async getLatestByCpf(cpf) {
    const snapshot = await firestore
      .collection(COLLECTION)
      .where('cpf', '==', cpf)
      .get();
    if (snapshot.docs.length === 0) return null;
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return docs[0];
  },

  async countByCpf(cpf) {
    const snapshot = await firestore
      .collection(COLLECTION)
      .where('cpf', '==', cpf)
      .get();
    return snapshot.size;
  },
};
