import { apiService } from './apiService';

export const examService = {
  async create(examData) {
    return apiService.createExam(examData);
  },

  async getAggregation() {
    return apiService.getAggregation();
  },

  async recalculateAggregation() {
    return apiService.recalculateAggregation();
  },

  async getLatestPage(filters = {}, pageSize = 20, page = 0) {
    const result = await apiService.listExams(filters, page);
    return {
      data: result.data || [],
      hasMore: result.hasMore || false,
      lastCursor: result.hasMore ? result.page + 1 : null,
    };
  },

  async getById(id) {
    return apiService.getExamByCpf(id);
  },

  async getByUid(uid) {
    if (!uid) return null;
    return apiService.getExamByUid(uid);
  },

  async getLatestByCpf(cpf, portariaToken) {
    return apiService.getExamByCpf(cpf, portariaToken);
  },

  async countByCpf(cpf, portariaToken) {
    const exam = await apiService.getExamByCpf(cpf, portariaToken);
    return exam ? 1 : 0;
  },

  async blockUser(cpf, blockData) {
    return apiService.blockUser(cpf, blockData);
  },

  async unblockUser(cpf) {
    return apiService.unblockUser(cpf);
  },
};
