import { useQuery } from '@tanstack/react-query';
import { examService } from '../services';

export function useExam(uid) {
  return useQuery({
    queryKey: ['latestExam', uid],
    queryFn: () => examService.getByUid(uid),
    enabled: !!uid,
    staleTime: 1000 * 60 * 5,
  });
}

export function useExamStats() {
  return useQuery({
    queryKey: ['examAggregation'],
    queryFn: examService.getAggregation,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLatestExams(filters, cursor) {
  return useQuery({
    queryKey: ['latestExams', JSON.stringify(filters), cursor],
    queryFn: () => examService.getLatestPage(filters, 20, cursor),
    staleTime: 1000 * 60 * 2,
  });
}
