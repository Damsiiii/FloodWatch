'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Info, ChevronRight, ChevronLeft } from 'lucide-react';

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
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!alerts || alerts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % alerts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [alerts]);

  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 text-xs text-slate-400 flex items-center gap-2 font-mono shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>No active flood alerts or river advisories across monitored basins.</span>
      </div>
    );
  }

  const current = alerts[currentIndex] || alerts[0];

  const getSeverityStyle = (severity: AlertItem['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          icon: <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />,
          container: 'bg-rose-950/70 border-rose-800/80 text-rose-200',
          badge: 'bg-rose-900/80 text-rose-300 border-rose-700/80',
          pulse: 'bg-rose-500'
        };
      case 'WARNING':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />,
          container: 'bg-orange-950/70 border-orange-800/80 text-orange-200',
          badge: 'bg-orange-900/80 text-orange-300 border-orange-700/80',
          pulse: 'bg-orange-500'
        };
      case 'ADVISORY':
      default:
        return {
          icon: <Info className="w-4 h-4 text-amber-400 shrink-0" />,
          container: 'bg-amber-950/70 border-amber-800/80 text-amber-200',
          badge: 'bg-amber-900/80 text-amber-300 border-amber-700/80',
          pulse: 'bg-amber-500'
        };
    }
  };

  const style = getSeverityStyle(current.severity);

  return (
    <div className={`border-b px-4 py-2.5 text-xs flex items-center justify-between gap-3 shrink-0 transition-colors ${style.container}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.pulse}`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${style.pulse}`}></span>
        </span>
        
        {style.icon}
        
        <span className={`font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded border font-mono shrink-0 ${style.badge}`}>
          {current.severity}
        </span>

        <span className="font-semibold text-slate-100 font-mono shrink-0">
          [{current.basin}]
        </span>

        <div className="truncate text-slate-200">
          <strong className="text-white mr-1.5">{current.title}</strong>
          <span className="text-slate-300">— {current.description}</span>
        </div>
      </div>

      {alerts.length > 1 && (
        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-slate-300 bg-slate-900/60 px-2 py-1 rounded border border-slate-700/50">
          <span className="text-slate-400">Advisories {currentIndex + 1}/{alerts.length}</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + alerts.length) % alerts.length)}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
              title="Previous Advisory"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % alerts.length)}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
              title="Next Advisory"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
