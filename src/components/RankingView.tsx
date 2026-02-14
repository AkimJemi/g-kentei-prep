import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface RankingUser {
    userId: string;
    nickname: string;
    role: string;
    totalscore: string;
    missioncount: string;
}

export const RankingView: React.FC = () => {
    const [rankings, setRankings] = useState<RankingUser[]>([]);

    useEffect(() => {
        fetch('/api/rankings')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setRankings(data);
                } else {
                    console.error("Invalid rankings data:", data);
                    setRankings([]);
                }
            })
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="w-full glass-panel p-4 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-cyan-400">
                <Trophy className="w-5 h-5" />
                <h3 className="font-brand text-lg tracking-wider">LEADERBOARD</h3>
            </div>
            
            <div className="space-y-2">
                {rankings.length === 0 ? (
                    <div className="text-center text-slate-500 py-4 text-xs font-mono uppercase tracking-widest">NO DATA DETECTED</div>
                ) : (
                    rankings.map((user, idx) => (
                        <motion.div 
                            key={user.userId}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 flex items-center justify-center rounded font-bold text-xs
                                    ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                                      idx === 1 ? 'bg-slate-400/20 text-slate-400' : 
                                      idx === 2 ? 'bg-amber-700/20 text-amber-700' : 'text-slate-600'}`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{user.nickname || 'Unknown Agent'}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">Missions: {user.missioncount}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-cyan-400 font-mono text-sm font-bold">{parseInt(user.totalscore).toLocaleString()}</div>
                                <div className="text-[9px] text-slate-600 uppercase tracking-widest">Score</div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};
