import { useQuery } from '@tanstack/react-query';
import { normalizeKeys } from '../utils/normalize';
import { type Category } from '../db/db';

export const CATEGORIES_QUERY_KEY = 'categories';

export const fetchCategories = async (): Promise<Category[]> => {
    const t = Date.now();
    const res = await fetch(`/api/categories?t=${t}`);

    if (!res.ok) {
        throw new Error('Failed to fetch categories');
    }

    const data = await res.json();
    const categoriesRaw = Array.isArray(data) ? data : (data.data || []);
    return normalizeKeys(categoriesRaw);
};

export const useCategories = () => {
    return useQuery({
        queryKey: [CATEGORIES_QUERY_KEY],
        queryFn: fetchCategories,
        staleTime: 60 * 60 * 1000, // 1 hour (Categories rarely change)
    });
};
