import { useQuery } from '@tanstack/react-query';

export const USER_PROGRESS_QUERY_KEY = 'user-progress';

export interface ProgressStats {
    total: number;
    solved: number;
    failed: number;
    remaining: number;
}

export const fetchUserProgress = async (userId?: string): Promise<Record<string, ProgressStats>> => {
    if (!userId) return {};
    const t = Date.now();
    const res = await fetch(`/api/user-progress/${userId}?t=${t}`);

    if (!res.ok) {
        throw new Error('Failed to fetch user progress');
    }

    return await res.json();
};

export const useUserProgress = (userId?: string) => {
    return useQuery({
        queryKey: [USER_PROGRESS_QUERY_KEY, userId],
        queryFn: () => fetchUserProgress(userId),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};
