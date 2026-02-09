import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SubscriptionStatus = 'free' | 'basic' | 'premium';

interface SubscriptionState {
    status: SubscriptionStatus;
    isPremium: boolean;
    features: string[];

    // Actions
    upgrade: (plan: SubscriptionStatus) => void;
    checkStatus: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>()(
    persist(
        (set, get) => ({
            status: 'free',
            isPremium: false,
            features: ['daily_limit_10'],

            upgrade: (plan) => {
                // In real app, this would redirect to checkout
                // For now, we simulate an upgrade
                console.log(`[Subscription] Upgrading to ${plan}...`);
                set({
                    status: plan,
                    isPremium: plan !== 'free',
                    features: plan === 'premium' ? ['unlimited', 'ai_analysis'] : ['unlimited']
                });
            },

            checkStatus: async () => {
                // TODO: Call Nexus Prime API
                // const res = await fetch('http://localhost:3000/api/subscription/status');
                // const data = await res.json();
                // set({ status: data.status, isPremium: data.status !== 'free' });
            }
        }),
        {
            name: 'subscription-storage',
        }
    )
);
