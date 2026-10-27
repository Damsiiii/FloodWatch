'use client';

import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import { StationSnapshot } from '../types/hydrology';

interface HydrographChartProps {
  station: StationSnapshot;
}

export const HydrographChart: React.FC<HydrographChartProps> = ({ station }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const uplotInstance = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!chartRef.current || !station.history_24h || station.history_24h.length === 0) return;

    const xVals: number[] = [];
    const yVals: (number | null)[] = [];

    station.history_24h.forEach(item => {
      xVals.push(Math.floor(new Date(item.timestamp).getTime() / 1000));
      yVals.push(item.level);
    });

    const data: [number[], (number | null)[]] = [xVals, yVals];

    const opts: uPlot.Options = {
      title: `${station.name} - 24-Hour Hydrograph`,
      width: chartRef.current.clientWidth || 500,
      height: 260,
      cursor: {
        drag: { x: true, y: false }
      },
      scales: {
        x: {
          time: true
        },
        y: {
          auto: true,
          range: (u, min, max) => {
            const topLimit = Math.max(max || 0, station.major_flood_level + 1);
            return [0, topLimit];
          }
        }
      },
      series: [
        {
          label: "Time"
        },
        {
          label: "Water Level (m)",
          stroke: "#38bdf8",
          width: 2,
          fill: "rgba(56, 189, 248, 0.15)",
          points: { show: true, size: 4, fill: "#38bdf8" }
        }
      ],
      axes: [
        {
          stroke: "#94a3b8",
          grid: { stroke: "rgba(255,255,255,0.05)" }
        },
        {
          stroke: "#94a3b8",
          grid: { stroke: "rgba(255,255,255,0.05)" },
          values: (u, vals) => vals.map(v => v !== null ? v.toFixed(1) + "m" : "")
        }
      ]
    };

    if (uplotInstance.current) {
      uplotInstance.current.destroy();
    }

    uplotInstance.current = new uPlot(opts, data, chartRef.current);

    const handleResize = () => {
      if (chartRef.current && uplotInstance.current) {
        uplotInstance.current.setSize({
          width: chartRef.current.clientWidth,
          height: 260
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (uplotInstance.current) {
        uplotInstance.current.destroy();
        uplotInstance.current = null;
      }
    };
  }, [station]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono mb-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          <span className="text-slate-400">Alert: <strong className="text-slate-200">{station.alert_level} m</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
          <span className="text-slate-400">Minor Flood: <strong className="text-slate-200">{station.minor_flood_level} m</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
          <span className="text-slate-400">Major Flood: <strong className="text-slate-200">{station.major_flood_level} m</strong></span>
        </div>
      </div>
      <div ref={chartRef} className="w-full overflow-hidden" />
    </div>
  );
};
