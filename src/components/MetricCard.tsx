/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import clsx from 'clsx';

interface MetricCardProps {
    icon: any;
    label: string;
    value: string;
    color: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, color }) => (
    <div className="bg-slate-900 border border-slate-800 p-4 md:p-8 rounded-2xl md:rounded-3xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] blur-xl rounded-full translate-x-1/2 -translate-y-1/2" />
        <Icon className={clsx("w-5 h-5 md:w-6 md:h-6 mb-3 md:mb-6", color)} />
        <div className="text-[10px] md:text-xs font-bold text-slate-500 mb-1 md:mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{label}</div>
        <div className="text-xl md:text-4xl font-black text-white group-hover:scale-105 transition-transform origin-left">{value}</div>
    </div>
);
