import { useQuery } from '@tanstack/react-query';

export const WEAK_POINTS_QUERY_KEY = 'weak-points';

interface WeakPointStats {
    questionId: number;
    incorrectCount: number;
    totalAttempts: number;
    accuracy: number;
}

export const fetchWeakPoints = async (userId: string): Promise<WeakPointStats[]> => {
    // Determine weak points by analyzing past attempts
    const res = await fetch(`/api/user-progress/${userId}/weak-points`);
    if (!res.ok) throw new Error('Failed to fetch weak points');
    return await res.json();
};

export const useWeakPoints = (userId?: string) => {
    return useQuery({
        queryKey: [WEAK_POINTS_QUERY_KEY, userId],
        queryFn: () => fetchWeakPoints(userId!),
        enabled: !!userId,
    });
};
