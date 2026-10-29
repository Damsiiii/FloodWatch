'use client';

import React from 'react';
import { AlertTriangle, Bell } from 'lucide-react';
import { AlertItem } from '../types/hydrology';

interface AlertsTickerProps {
  alerts: AlertItem[];
}

export const AlertsTicker: React.FC<AlertsTickerProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs text-slate-400 flex items-center gap-2 font-mono shrink-0">
        <Bell className="w-4 h-4 text-emerald-400" />
        <span>No active flood alerts or river advisories issued by DMC / Irrigation Dept.</span>
      </div>
    );
  }

  // Duplicate list to achieve continuous infinite marquee loop
  const marqueeItems = [...alerts, ...alerts];

  const getBadgeStyle = (severity: string) => {
    if (severity === 'RED' || severity === 'CRITICAL') {
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    }
    if (severity === 'AMBER' || severity === 'WARNING') {
      return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    }
    return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-200 text-xs overflow-hidden py-2 px-4 flex items-center gap-3 shrink-0">
      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50 shrink-0 z-10">
        <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-rose-400" />
        <span>Advisories ({alerts.length})</span>
      </div>

      <div className="overflow-hidden whitespace-nowrap relative flex-1 mask-fade">
        <div className="inline-flex gap-10 animate-ticker hover:[animation-play-state:paused] cursor-default">
          {marqueeItems.map((alert, idx) => (
            <div key={`${alert.id}-${idx}`} className="inline-flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${getBadgeStyle(alert.severity)}`}>
                {alert.severity}
              </span>
              <strong className="text-slate-100">{alert.title}</strong>
              {alert.basin && (
                <span className="text-cyan-400 font-mono">[{alert.basin}]</span>
              )}
              {alert.districts && alert.districts.length > 0 && (
                <span className="text-slate-400 text-[11px] font-mono">
                  ({alert.districts.join(', ')})
                </span>
              )}
              <span className="text-slate-400">— {alert.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
