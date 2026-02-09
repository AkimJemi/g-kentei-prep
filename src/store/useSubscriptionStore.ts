import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SubscriptionStatus = 'free' | 'basic' | 'premium';

interface SubscriptionState {
    status: SubscriptionStatus;
    isPremium: boolean;
    features: string[];
    currentUser: any | null;

    // Actions
    setup: (user: any) => void;
    upgrade: (planId: string) => Promise<void>;
    checkStatus: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>()(
    persist(
        (set, get) => ({
            status: 'free',
            isPremium: false,
            features: ['daily_limit_10'],
            currentUser: null,

            setup: (user) => {
                set({ currentUser: user });
                get().checkStatus();
            },

            upgrade: async (planId) => {
                const { currentUser } = get();

                // --- Development / Mock Mode ---
                const apiUrl = import.meta.env.VITE_NEXUS_API_URL;
                if (!apiUrl && !currentUser?.userid) {
                    console.log(`[DEV] Simulating upgrade to ${planId}`);
                    const newStatus = planId.includes('premium') ? 'premium' : 'basic';
                    set({
                        status: newStatus,
                        isPremium: true,
                        features: newStatus === 'premium' ? ['unlimited', 'ai_analysis'] : ['unlimited']
                    });
                    return;
                }

                try {
                    // Call Nexus Prime Checkout API
                    const API_BASE = 'http://localhost:3000'; // Should be env var
                    const res = await fetch(`${API_BASE}/api/subscription/checkout`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: currentUser?.userid || 'guest',
                            priceId: planId,
                            returnUrl: window.location.href
                        })
                    });

                    const data = await res.json();
                    if (data.url) {
                        console.log(`[Subscription] Redirecting to Checkout: ${data.url}`);
                        window.location.href = data.url;
                    } else {
                        console.error("Checkout failed", data);
                        if (data.error) alert(`Checkout Error: ${data.error}`);
                    }
                } catch (e: any) {
                    console.error("Upgrade error", e);
                    // Fallback for demo
                    alert("Network error. Falling back to demo mode.");
                    const newStatus = planId.includes('premium') ? 'premium' : 'basic';
                    set({ status: newStatus, isPremium: true });
                }
            },

            checkStatus: async () => {
                const { currentUser } = get();
                if (!currentUser?.userid) return;

                try {
                    // Call Nexus Prime Status API
                    const API_BASE = 'http://localhost:3000';
                    const res = await fetch(`${API_BASE}/api/subscription/status?userId=${currentUser.userid}`);

                    if (res.ok) {
                        const data = await res.json();
                        console.log(`[Subscription] Status Synced: ${data.status} (Plan: ${data.planId})`);

                        const isPremium = data.status === 'active' || data.status === 'trialing';
                        const mappedStatus = isPremium ? (data.planId?.includes('premium') ? 'premium' : 'basic') : 'free';

                        set({
                            status: mappedStatus,
                            isPremium: isPremium,
                            features: data.features || ['daily_limit_10']
                        });
                    } else {
                        console.warn("[Subscription] Failed to sync status. API Error.");
                    }
                } catch (e) {
                    console.error("Status check failed", e);
                }
            }
        }),
        {
            name: 'subscription-storage',
        }
    )
);
