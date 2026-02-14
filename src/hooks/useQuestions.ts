import { useQuery } from '@tanstack/react-query';
import { normalizeKeys } from '../utils/normalize';
import { type Question } from '../types';

export const QUESTIONS_QUERY_KEY = 'questions';

export const fetchQuestions = async (userId?: string): Promise<Question[]> => {
    const query = userId ? `?userId=${userId}` : '';
    const res = await fetch(`/api/questions${query}`);

    if (res.status === 403) {
        throw new Error('DAILY_LIMIT_REACHED');
    }

    if (!res.ok) {
        throw new Error('Failed to fetch questions');
    }

    const data = await res.json();
    const questionsArr = Array.isArray(data) ? data : (data.data || []);
    return normalizeKeys(questionsArr);
};

export const useQuestions = (userId?: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: [QUESTIONS_QUERY_KEY, userId],
        queryFn: () => fetchQuestions(userId),
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};
