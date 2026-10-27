'use client';

import React from 'react';
import { AlertTriangle, Bell } from 'lucide-react';

interface AlertItem {
  id: string;
  title: string;
  severity: 'WARNING' | 'CRITICAL' | 'ADVISORY';
  basin: string;
  issued_at: string;
  description: string;
}

interface AlertsTickerProps {
  alerts: AlertItem[];
}

export const AlertsTicker: React.FC<AlertsTickerProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs text-slate-400 flex items-center gap-2">
        <Bell className="w-4 h-4 text-emerald-400" />
        <span>No active flood alerts or river advisories issued by DMC / Irrigation Dept.</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-200 text-xs overflow-hidden py-2 px-4 flex items-center gap-3">
      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50 shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-rose-400" />
        <span>Advisories ({alerts.length})</span>
      </div>

      <div className="overflow-hidden whitespace-nowrap relative flex-1">
        <div className="inline-flex gap-8 animate-[marquee_25s_linear_infinite] hover:[animation-play-state:paused]">
          {alerts.map((alert) => (
            <div key={alert.id} className="inline-flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                alert.severity === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : alert.severity === 'WARNING'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {alert.severity}
              </span>
              <span className="font-medium text-slate-100">{alert.title}</span>
              <span className="text-slate-400 font-mono">[{alert.basin}]</span>
              <span className="text-slate-400">— {alert.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
