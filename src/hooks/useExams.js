import { useQuery } from '@tanstack/react-query';
import { examService } from '../services';

export function useExams(filters, cursor) {
  return useQuery({
    queryKey: ['exams', filters, cursor],
    queryFn: () => examService.getPage(filters, 15, cursor),
    staleTime: 1000 * 60,
  });
}

export function useExam(id) {
  return useQuery({
    queryKey: ['exam', id],
    queryFn: () => examService.getById(id),
    enabled: !!id,
  });
}

export function useExamStats() {
  return useQuery({
    queryKey: ['examAggregation'],
    queryFn: examService.getAggregation,
    staleTime: 1000 * 60,
  });
}

export function useRecentExams(limit = 20) {
  return useQuery({
    queryKey: ['recentExams', limit],
    queryFn: () => examService.getRecent(limit),
    staleTime: 1000 * 60,
  });
}
