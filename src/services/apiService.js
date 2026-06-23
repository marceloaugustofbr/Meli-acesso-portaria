// API Service - Interface com o CloudFlare Worker
// Todas as chamadas que antes iam direto ao Firestore passam por aqui
// O Worker valida tudo server-side antes de acessar o Firestore

import { auth } from '../firebase';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8787';

async function request(path, options = {}) {
  const { body, method = 'GET', token } = options;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erro ${res.status}`);
  }

  return res.json();
}

function getIdToken() {
  const user = auth.currentUser;
  if (user) {
    return user.getIdToken().catch(() => null);
  }
  return Promise.resolve(null);
}

export const apiService = {
  // ─── Portaria ──────────────────────────
  async verifyPin(pin) {
    return request('/api/portaria/verify-pin', {
      method: 'POST',
      body: { pin },
    });
  },

  // ─── Questions ─────────────────────────
  async getQuestions() {
    return request('/api/questions');
  },

  async seedQuestions(token) {
    return request('/api/questions/seed', {
      method: 'POST',
      token,
    });
  },

  // ─── Exams ─────────────────────────────
  async checkStatus(cpf) {
    return request('/api/exams/check-status', {
      method: 'POST',
      body: { cpf },
    });
  },

  async createExam(examData) {
    return request('/api/exams', {
      method: 'POST',
      body: examData,
    });
  },

  async getExamByCpf(cpf, portariaToken) {
    const digits = cpf.replace(/\D/g, '');
    return request(`/api/exams/cpf/${digits}`, {
      method: 'GET',
      token: portariaToken,
    });
  },

  async getExamByUid(uid) {
    const token = await getIdToken();
    return request(`/api/exams/uid/${encodeURIComponent(uid)}`, {
      method: 'GET',
      token,
    });
  },

  async exportExams(filters = {}) {
    const token = await getIdToken();
    const params = new URLSearchParams();
    if (filters.name) params.set('name', filters.name);
    if (filters.status) params.set('status', filters.status);
    if (filters.city) params.set('city', filters.city);
    if (filters.operationType) params.set('operationType', filters.operationType);
    return request(`/api/exams/export?${params.toString()}`, {
      method: 'GET',
      token,
    });
  },

  async listExams(filters = {}, page = 0) {
    const token = await getIdToken();
    const params = new URLSearchParams();
    if (filters.name) params.set('name', filters.name);
    if (filters.status) params.set('status', filters.status);
    if (filters.city) params.set('city', filters.city);
    if (filters.operationType) params.set('operationType', filters.operationType);
    params.set('page', String(page ?? 0));
    return request(`/api/exams?${params.toString()}`, {
      method: 'GET',
      token,
    });
  },

  async blockUser(cpf, blockData) {
    const token = await getIdToken();
    const digits = cpf.replace(/\D/g, '');
    return request(`/api/exams/${digits}/block`, {
      method: 'POST',
      body: blockData,
      token,
    });
  },

  async unblockUser(cpf) {
    const token = await getIdToken();
    const digits = cpf.replace(/\D/g, '');
    return request(`/api/exams/${digits}/unblock`, {
      method: 'POST',
      body: {},
      token,
    });
  },

  // ─── Aggregation ───────────────────────
  async getAggregation() {
    const token = await getIdToken();
    return request('/api/aggregation', { method: 'GET', token });
  },

  async recalculateAggregation() {
    const token = await getIdToken();
    return request('/api/recalculate', {
      method: 'POST',
      token,
    });
  },

  // ─── Cloudinary ────────────────────────
  async getCloudinarySignature(examId) {
    return request('/api/cloudinary/sign', {
      method: 'POST',
      body: { examId },
    });
  },

  // ─── Admin / Users ────────────────────
  async listUsers() {
    const token = await getIdToken();
    return request('/api/admin/users', {
      method: 'GET',
      token,
    });
  },

  async createUser(userData) {
    const token = await getIdToken();
    return request('/api/admin/users', {
      method: 'POST',
      body: userData,
      token,
    });
  },

  async deleteUser(uid) {
    const token = await getIdToken();
    return request(`/api/admin/users/${uid}`, {
      method: 'DELETE',
      token,
    });
  },

  async updateUser(uid, data) {
    const token = await getIdToken();
    return request(`/api/admin/users/${uid}`, {
      method: 'PUT',
      body: data,
      token,
    });
  },
};
