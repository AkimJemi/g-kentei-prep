import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, type User } from '../db/db';

interface AuthState {
    currentUser: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (userId: string) => Promise<boolean>;
    signup: (userId: string, nickname: string, role?: 'user' | 'admin') => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            currentUser: null,
            isAuthenticated: false,
            isAdmin: false,

            login: async (userId: string) => {
                try {
                    const user = await db.users.where('userId').equalsIgnoreCase(userId).first();
                    if (user) {
                        if (user.status === 'suspended') {
                            throw new Error('USER_SUSPENDED');
                        }
                        set({
                            currentUser: user,
                            isAuthenticated: true,
                            isAdmin: user.role === 'admin'
                        });
                        return true;
                    }
                    console.warn(`Neural Diagnostic: Profile not found for [${userId}]`);
                    return false;
                } catch (error) {
                    console.error("CRITICAL: Downlink failure during login protocol:", error);
                    throw error;
                }
            },

            signup: async (userId: string, nickname: string, role: 'user' | 'admin' = 'user') => {
                try {
                    // Ensure DB is open
                    if (!db.isOpen()) {
                        await db.open();
                    }

                    const exists = await db.users.where('userId').equalsIgnoreCase(userId).first();
                    if (exists) return { success: false, error: 'exists' };

                    const newUserId = await db.users.add({
                        userId,
                        nickname,
                        role,
                        joinedAt: new Date()
                    });

                    const user = await db.users.get(newUserId);
                    if (user) {
                        set({
                            currentUser: user,
                            isAuthenticated: true,
                            isAdmin: user.role === 'admin'
                        });
                        return { success: true };
                    }
                    return { success: false, error: 'verification_failed' };
                } catch (error: any) {
                    console.error("CRITICAL: Signup protocol failed. Diagnostic data:", error);
                    return { success: false, error: error.message || 'connection_failure' };
                }
            },

            logout: () => {
                set({ currentUser: null, isAuthenticated: false, isAdmin: false });
            }
        }),
        {
            name: 'g-kentei-auth'
        }
    )
);
