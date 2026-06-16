import { useQuery } from '@tanstack/react-query';
import { examService } from '../services';

export function useExam(id) {
  return useQuery({
    queryKey: ['latestExam', id],
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

export function useLatestExams(filters, cursor) {
  return useQuery({
    queryKey: ['latestExams', filters, cursor],
    queryFn: () => examService.getLatestPage(filters, 15, cursor),
    staleTime: 1000 * 60,
  });
}
