import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CreditCard, Loader2, ShieldCheck, Sparkles, Lock } from 'lucide-react';
import { useSubscriptionStore } from '../store/useSubscriptionStore';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type PlanType = 'basic' | 'premium';
type StepType = 'select' | 'checkout' | 'success';

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
    const { upgrade } = useSubscriptionStore();

    const [step, setStep] = useState<StepType>('select');
    const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Dummy CC State
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');

    const handleSelectPlan = (plan: PlanType) => {
        setSelectedPlan(plan);
        setStep('checkout');
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();

        // Simulating Payment API Delay
        setIsProcessing(true);
        setTimeout(async () => {
            if (selectedPlan) {
                await upgrade(selectedPlan);
            }
            setIsProcessing(false);
            setStep('success'); // Move to success step

            // Auto close after 3 seconds
            setTimeout(() => {
                resetModal();
            }, 3000);
        }, 1500);
    };

    const resetModal = () => {
        setStep('select');
        setSelectedPlan(null);
        setCardName('');
        setCardNumber('');
        setExpiry('');
        setCvc('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={resetModal}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 relative overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {step !== 'success' && (
                        <button
                            onClick={resetModal}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    )}

                    <AnimatePresence mode="wait">
                        {/* STEP 1: SELECT PLAN */}
                        {step === 'select' && (
                            <motion.div
                                key="select"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
                                        <Sparkles className="w-6 h-6 text-cyan-400" />
                                        Access <span className="text-cyan-400">Premium Features</span>
                                    </h2>
                                    <p className="text-slate-400 text-sm">Unlock unlimited quizzes, AI analysis, and more.</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Basic Plan */}
                                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-cyan-500/50 transition-colors flex flex-col h-full">
                                        <h3 className="text-lg font-bold text-white mb-2">Pro Plan</h3>
                                        <div className="text-3xl font-black text-white mb-4">¥980<span className="text-sm text-slate-500 font-normal">/mo</span></div>
                                        <ul className="space-y-2 mb-6 text-sm text-slate-300 flex-1">
                                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Unlimited Quizzes</li>
                                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Detailed Analytics</li>
                                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Ad-free Experience</li>
                                        </ul>
                                        <button
                                            onClick={() => handleSelectPlan('basic')}
                                            className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors mt-auto"
                                        >
                                            Select Plan
                                        </button>
                                    </div>

                                    {/* Premium Plan */}
                                    <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 rounded-xl p-6 border border-indigo-500/50 relative flex flex-col h-full">
                                        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg">Recommended</div>
                                        <h3 className="text-lg font-bold text-white mb-2">AI Premium</h3>
                                        <div className="text-3xl font-black text-white mb-4">¥1,980<span className="text-sm text-slate-500 font-normal">/mo</span></div>
                                        <ul className="space-y-2 mb-6 text-sm text-slate-300 flex-1">
                                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Everything in Pro</li>
                                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> AI Weakness Analysis</li>
                                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Mock Exams</li>
                                        </ul>
                                        <button
                                            onClick={() => handleSelectPlan('premium')}
                                            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors shadow-lg shadow-indigo-500/20 mt-auto"
                                        >
                                            Upgrade Now
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: CHECKOUT (DUMMY UI) */}
                        {step === 'checkout' && (
                            <motion.div
                                key="checkout"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <button
                                    onClick={() => setStep('select')}
                                    className="text-sm text-cyan-400 hover:text-cyan-300 mb-4 inline-block"
                                >
                                    &larr; Back to plans
                                </button>
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-black text-white mb-2 flex items-center justify-center gap-2">
                                        <Lock className="w-5 h-5 text-slate-400" />
                                        Secure Checkout
                                    </h2>
                                    <p className="text-slate-400 text-sm">
                                        You selected the <span className="font-bold text-white capitalize">{selectedPlan === 'premium' ? 'AI Premium' : 'Pro'} Plan</span>.
                                        Total: <span className="font-bold text-white">{selectedPlan === 'premium' ? '¥1,980' : '¥980'}</span>/mo
                                    </p>
                                </div>

                                <form onSubmit={handlePayment} className="space-y-4 max-w-sm mx-auto">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Name on card</label>
                                        <input
                                            type="text"
                                            required
                                            value={cardName}
                                            onChange={(e) => setCardName(e.target.value)}
                                            placeholder="Taro Yamada"
                                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500 transition-colors"
                                            disabled={isProcessing}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Card number</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <input
                                                type="text"
                                                required
                                                value={cardNumber}
                                                onChange={(e) => setCardNumber(e.target.value)}
                                                placeholder="0000 0000 0000 0000"
                                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-cyan-500 transition-colors"
                                                maxLength={19}
                                                disabled={isProcessing}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Expiry (MM/YY)</label>
                                            <input
                                                type="text"
                                                required
                                                value={expiry}
                                                onChange={(e) => setExpiry(e.target.value)}
                                                placeholder="MM/YY"
                                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500 transition-colors"
                                                maxLength={5}
                                                disabled={isProcessing}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">CVC</label>
                                            <input
                                                type="text"
                                                required
                                                value={cvc}
                                                onChange={(e) => setCvc(e.target.value)}
                                                placeholder="123"
                                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500 transition-colors"
                                                maxLength={4}
                                                disabled={isProcessing}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isProcessing}
                                            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                `Pay ${selectedPlan === 'premium' ? '¥1,980' : '¥980'}`
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-center text-slate-500 mt-2 flex items-center justify-center gap-1">
                                        <ShieldCheck className="w-3 h-3" /> Payments are secure and encrypted. (Demo Mode)
                                    </p>
                                </form>
                            </motion.div>
                        )}

                        {/* STEP 3: SUCCESS */}
                        {step === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-8"
                            >
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8 text-green-400" />
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2 tracking-wide">
                                    Payment Successful!
                                </h2>
                                <p className="text-slate-400">
                                    Thank you. Your account has been upgraded.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
