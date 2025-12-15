import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
  change?: { text: string; color: string };
  description: string;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  icon,
  change,
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
      {/* Live indicator for highlighted card */}
      {highlight && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span className="text-[10px] text-white/80 font-mono uppercase">Live</span>
        </div>
      )}

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
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold tracking-tight ${highlight ? 'text-white' : 'text-slate-100'}`}>
            {value}
          </span>
          {change && change.text && (
            <span className={`text-xs font-mono ${change.color}`}>
              {change.text}
            </span>
          )}
        </div>
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