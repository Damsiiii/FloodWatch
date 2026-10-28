'use client';

import React from 'react';
import { StationSnapshot } from '../types/hydrology';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StationStatusCardProps {
  station: StationSnapshot;
  isSelected: boolean;
  onSelect: (station: StationSnapshot) => void;
}

export const StationStatusCard: React.FC<StationStatusCardProps> = ({
  station,
  isSelected,
  onSelect
}) => {
  const getStatusBadge = (status: StationSnapshot['status']) => {
    switch (status) {
      case 'MAJOR_FLOOD':
        return { label: 'Major Flood', bg: 'bg-red-500/20 text-red-400 border-red-500/30' };
      case 'MINOR_FLOOD':
        return { label: 'Minor Flood', bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
      case 'ALERT':
        return { label: 'Alert Level', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'STALE':
        return { label: 'Offline', bg: 'bg-slate-700/40 text-slate-400 border-slate-600/30' };
      case 'NORMAL':
      default:
        return { label: 'Normal', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    }
  };

  const badge = getStatusBadge(station.status);

  return (
    <div
      onClick={() => onSelect(station)}
      className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-slate-800/90 border-cyan-500/80 shadow-lg shadow-cyan-950/40'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-semibold text-sm text-slate-100 line-clamp-1">{station.name}</h3>
          <p className="text-xs text-slate-400">{station.basin}</p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badge.bg}`}>
          {badge.label}
        </span>
      </div>

      <div className="flex items-baseline justify-between mt-3">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">Water Level</div>
          <div className="text-lg font-bold font-mono text-slate-100">
            {station.current_level !== null ? `${station.current_level.toFixed(2)} m` : 'N/A'}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Rate of Rise</div>
          <div className="flex items-center justify-end gap-1 text-xs font-mono font-medium">
            {station.rate_of_change > 0 ? (
              <span className="text-amber-400 flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{station.rate_of_change.toFixed(2)} m/h
              </span>
            ) : station.rate_of_change < 0 ? (
              <span className="text-emerald-400 flex items-center">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {station.rate_of_change.toFixed(2)} m/h
              </span>
            ) : (
              <span className="text-slate-400 flex items-center">
                <Minus className="w-3.5 h-3.5 mr-0.5" /> 0.00 m/h
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>Last Synced</span>
        <span className="text-slate-400" suppressHydrationWarning>
          {new Date(station.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
