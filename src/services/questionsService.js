import { apiService } from './apiService';

export const questionsService = {
  async getAll() {
    return apiService.getQuestions();
  },
};
