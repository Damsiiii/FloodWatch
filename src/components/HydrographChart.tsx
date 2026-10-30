'use client';

import React, { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import { StationSnapshot } from '../types/hydrology';
import { Activity, AlertTriangle, Droplets, TrendingUp } from 'lucide-react';

interface HydrographChartProps {
  station: StationSnapshot;
}

export const HydrographChart: React.FC<HydrographChartProps> = ({ station }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const uplotInstance = useRef<uPlot | null>(null);
  const [activeTab, setActiveTab] = useState<'level' | 'glofas'>('level');

  const catchment = station.catchment;
  const glofasForecast = station.discharge_forecast || catchment?.glofas_forecast || [];

  // Threshold horizontal reference lines plugin
  const thresholdLinesPlugin = (alertLvl: number, minorLvl: number, majorLvl: number): uPlot.Plugin => {
    return {
      hooks: {
        drawAxes: (u: uPlot) => {
          const { ctx } = u;
          const { left, top, width, height } = u.bbox;

          const drawHorizontalLine = (val: number, stroke: string, label: string) => {
            const yPos = Math.round(u.valToPos(val, 'y', true));
            if (yPos >= top && yPos <= top + height) {
              ctx.save();
              ctx.beginPath();
              ctx.setLineDash([4, 4]);
              ctx.strokeStyle = stroke;
              ctx.lineWidth = 1.5;
              ctx.moveTo(left, yPos);
              ctx.lineTo(left + width, yPos);
              ctx.stroke();

              // Label
              ctx.fillStyle = stroke;
              ctx.font = '10px monospace';
              ctx.textAlign = 'right';
              ctx.fillText(`${label} (${val}m)`, left + width - 6, yPos - 4);
              ctx.restore();
            }
          };

          drawHorizontalLine(majorLvl, '#ef4444', 'MAJOR FLOOD');
          drawHorizontalLine(minorLvl, '#f97316', 'MINOR FLOOD');
          drawHorizontalLine(alertLvl, '#eab308', 'ALERT');
        }
      }
    };
  };

  useEffect(() => {
    if (!chartRef.current) return;

    if (uplotInstance.current) {
      uplotInstance.current.destroy();
      uplotInstance.current = null;
    }

    if (activeTab === 'level') {
      if (!station.history_24h || station.history_24h.length === 0) return;

      const xVals: number[] = [];
      const yVals: (number | null)[] = [];

      station.history_24h.forEach(item => {
        xVals.push(Math.floor(new Date(item.timestamp).getTime() / 1000));
        yVals.push(item.level);
      });

      const data: [number[], (number | null)[]] = [xVals, yVals];

      const opts: uPlot.Options = {
        title: `${station.name} - 24-Hour Observed Hydrograph`,
        width: chartRef.current.clientWidth || 500,
        height: 250,
        cursor: {
          drag: { x: true, y: false }
        },
        plugins: [
          thresholdLinesPlugin(station.alert_level, station.minor_flood_level, station.major_flood_level)
        ],
        scales: {
          x: { time: true },
          y: {
            auto: true,
            range: (u, min, max) => [0, Math.max(max || 0, station.major_flood_level + 1.5)]
          }
        },
        series: [
          { label: "Time" },
          {
            label: "Observed Level (m)",
            stroke: "#38bdf8",
            width: 2.5,
            fill: "rgba(56, 189, 248, 0.15)",
            points: { show: true, size: 4, fill: "#38bdf8" }
          }
        ],
        axes: [
          { stroke: "#94a3b8", grid: { stroke: "rgba(255,255,255,0.05)" } },
          {
            stroke: "#94a3b8",
            grid: { stroke: "rgba(255,255,255,0.05)" },
            values: (u, vals) => vals.map(v => v !== null ? v.toFixed(1) + "m" : "")
          }
        ]
      };

      uplotInstance.current = new uPlot(opts, data, chartRef.current);
    } else {
      // 7-Day GloFAS Predicted Discharge
      if (glofasForecast.length === 0) return;

      const xVals: number[] = [];
      const yVals: (number | null)[] = [];
      const yMaxVals: (number | null)[] = [];

      glofasForecast.forEach(pt => {
        xVals.push(pt.timestamp);
        yVals.push(pt.discharge);
        yMaxVals.push(pt.discharge_max);
      });

      const data: [number[], (number | null)[], (number | null)[]] = [xVals, yVals, yMaxVals];

      const opts: uPlot.Options = {
        title: `${station.basin} - GloFAS 7-Day River Discharge Forecast`,
        width: chartRef.current.clientWidth || 500,
        height: 250,
        cursor: { drag: { x: true, y: false } },
        scales: {
          x: { time: true },
          y: { auto: true }
        },
        series: [
          { label: "Date" },
          {
            label: "Mean Discharge (m³/s)",
            stroke: "#34d399",
            width: 2.5,
            fill: "rgba(52, 211, 153, 0.15)",
            points: { show: true, size: 5, fill: "#34d399" }
          },
          {
            label: "Max Peak Flow (m³/s)",
            stroke: "#f97316",
            width: 1.5,
            points: { show: true, size: 3, fill: "#f97316" }
          }
        ],
        axes: [
          { stroke: "#94a3b8", grid: { stroke: "rgba(255,255,255,0.05)" } },
          {
            stroke: "#94a3b8",
            grid: { stroke: "rgba(255,255,255,0.05)" },
            values: (u, vals) => vals.map(v => v !== null ? v.toFixed(0) + " m³/s" : "")
          }
        ]
      };

      uplotInstance.current = new uPlot(opts, data, chartRef.current);
    }

    const handleResize = () => {
      if (chartRef.current && uplotInstance.current) {
        uplotInstance.current.setSize({
          width: chartRef.current.clientWidth,
          height: 250
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
  }, [station, activeTab, glofasForecast]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
      {/* Catchment Runoff & Soil Moisture Indicator Bar */}
      {catchment && (
        <div className={`p-2.5 rounded-lg border text-xs font-mono flex flex-wrap items-center justify-between gap-3 ${
          catchment.is_flash_flood_risk
            ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
            : 'bg-slate-950/60 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center gap-2">
            {catchment.is_flash_flood_risk ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
            ) : (
              <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <div>
              <span className="font-semibold text-slate-200">{catchment.basin_name} Catchment: </span>
              {catchment.is_flash_flood_risk ? (
                <span className="text-rose-400 font-bold">HIGH FLASH-FLOOD RUNOFF VULNERABILITY</span>
              ) : (
                <span className="text-slate-400">Normal Runoff Absorption</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <div>
              <span className="text-slate-400">Soil Saturation: </span>
              <strong className={catchment.soil_moisture_0_to_7cm > 0.8 ? 'text-rose-400' : 'text-cyan-300'}>
                {(catchment.soil_moisture_0_to_7cm * 100).toFixed(0)}%
              </strong>
            </div>

            <div>
              <span className="text-slate-400">24h Rain: </span>
              <strong className={catchment.precipitation_24h_mm > 50 ? 'text-rose-400' : 'text-slate-200'}>
                {catchment.precipitation_24h_mm.toFixed(1)} mm
              </strong>
            </div>

            <div>
              <span className="text-slate-400">Runoff Index: </span>
              <strong className={catchment.surface_runoff_risk > 40 ? 'text-orange-400' : 'text-slate-200'}>
                {catchment.surface_runoff_risk.toFixed(1)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Threshold and Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
          <button
            onClick={() => setActiveTab('level')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition ${
              activeTab === 'level'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Water Level (24h)</span>
          </button>

          <button
            onClick={() => setActiveTab('glofas')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition ${
              activeTab === 'glofas'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>GloFAS Flow (7-Day Forecast)</span>
          </button>
        </div>

        {activeTab === 'level' ? (
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span>
              <span>Alert: </span>
              <strong className="text-amber-400">{station.alert_level.toFixed(1)}m</strong>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-orange-400 inline-block"></span>
              <span>Minor: </span>
              <strong className="text-orange-400">{station.minor_flood_level.toFixed(1)}m</strong>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-rose-400 inline-block"></span>
              <span>Major: </span>
              <strong className="text-rose-400">{station.major_flood_level.toFixed(1)}m</strong>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400">
            Global Flood Awareness System (ECMWF / Open-Meteo)
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div ref={chartRef} className="w-full flex justify-center overflow-x-auto min-h-[250px]" />
    </div>
  );
};
