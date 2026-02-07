import React from 'react';
import clsx from 'clsx';

interface MetricCardProps {
    icon: any;
    label: string;
    value: string;
    color: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, color }) => (
    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] blur-xl rounded-full translate-x-1/2 -translate-y-1/2" />
        <Icon className={clsx("w-6 h-6 mb-6", color)} />
        <div className="text-xs font-bold text-slate-500 mb-2">{label}</div>
        <div className="text-4xl font-black text-white group-hover:scale-105 transition-transform origin-left">{value}</div>
    </div>
);
