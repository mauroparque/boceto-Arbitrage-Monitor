import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: 'neutral' | 'up' | 'down';
  description: string;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subValue, 
  icon, 
  description, 
  highlight = false 
}) => {
  return (
    <div className={`
      relative overflow-hidden rounded-xl p-6 transition-all duration-300
      ${highlight 
        ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg shadow-emerald-900/50 border border-emerald-500/30' 
        : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
      }
    `}>
      <div className="flex justify-between items-start mb-4">
        <h3 className={`text-sm font-medium uppercase tracking-wider ${highlight ? 'text-emerald-100' : 'text-slate-400'}`}>
          {title}
        </h3>
        {icon && (
          <div className={`p-2 rounded-lg ${highlight ? 'bg-emerald-500/20 text-emerald-100' : 'bg-slate-700/50 text-slate-400'}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className={`text-3xl font-bold tracking-tight ${highlight ? 'text-white' : 'text-slate-100'}`}>
          {value}
        </span>
        {subValue && (
          <span className={`text-xs font-mono ${highlight ? 'text-emerald-200/80' : 'text-slate-500'}`}>
            {subValue}
          </span>
        )}
      </div>

      <div className={`mt-4 text-xs ${highlight ? 'text-emerald-200' : 'text-slate-400'}`}>
        {description}
      </div>
    </div>
  );
};