import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, type User } from '../db/db';

interface AuthState {
    currentUser: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (username: string) => Promise<boolean>;
    signup: (username: string, role?: 'user' | 'admin') => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            currentUser: null,
            isAuthenticated: false,
            isAdmin: false,

            login: async (username: string) => {
                try {
                    const user = await db.users.where('username').equalsIgnoreCase(username).first();
                    if (user) {
                        set({
                            currentUser: user,
                            isAuthenticated: true,
                            isAdmin: user.role === 'admin'
                        });
                        return true;
                    }
                    console.warn(`Neural Diagnostic: Profile not found for [${username}]`);
                    return false;
                } catch (error) {
                    console.error("CRITICAL: Downlink failure during login protocol:", error);
                    throw error;
                }
            },

            signup: async (username: string, role: 'user' | 'admin' = 'user') => {
                try {
                    // Ensure DB is open
                    if (!db.isOpen()) {
                        await db.open();
                    }

                    const exists = await db.users.where('username').equalsIgnoreCase(username).first();
                    if (exists) return { success: false, error: 'exists' };

                    const userId = await db.users.add({
                        username,
                        role,
                        joinedAt: new Date()
                    });

                    const user = await db.users.get(userId);
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
