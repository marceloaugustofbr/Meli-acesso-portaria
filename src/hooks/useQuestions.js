import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { questionsService } from '../services';
import { fisherYatesShuffle } from '../utils/shuffle';

export function useQuestions() {
  return useQuery({
    queryKey: ['questions'],
    queryFn: questionsService.getAll,
    staleTime: 1000 * 60 * 5,
  });
}

export function useShuffledQuestions() {
  const { data: questions, ...rest } = useQuestions();

  const shuffled = useMemo(
    () =>
      questions
        ? fisherYatesShuffle(questions).map((q) => ({
            ...q,
            options: fisherYatesShuffle(q.options),
          }))
        : [],
    [questions]
  );

  return { questions: shuffled, ...rest };
}
