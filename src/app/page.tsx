'use client';

import React, { useEffect, useState } from 'react';
import { HydrologySnapshotPayload, StationSnapshot } from '../types/hydrology';
import { MOCK_SNAPSHOT } from '../../worker/mockData';
import { AlertsTicker } from '../components/AlertsTicker';
import { StationStatusCard } from '../components/StationStatusCard';
import { MapViewer } from '../components/MapViewer';
import { HydrographChart } from '../components/HydrographChart';
import { Waves, ShieldAlert, Activity, RefreshCw, X } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<HydrologySnapshotPayload>(MOCK_SNAPSHOT);
  const [selectedStation, setSelectedStation] = useState<StationSnapshot | null>(MOCK_SNAPSHOT.stations[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string>('');

  const fetchSnapshot = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/snapshot');
      if (res.ok) {
        const payload: HydrologySnapshotPayload = await res.json();
        setData(payload);
        setLastSync(new Date(payload.timestamp).toLocaleTimeString());
      } else {
        console.warn('API non-200 response, using static snapshot state');
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.warn('Snapshot fetch fallback to mock state:', e);
      setLastSync(new Date().toLocaleTimeString());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setLastSync(new Date(data.timestamp).toLocaleTimeString());
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950 border border-cyan-800 rounded-lg text-cyan-400">
            <Waves className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-100 leading-tight">LankaFlood Watch</h1>
            <p className="text-xs text-slate-400">Sri Lanka Hydrology & River Telemetry Radar</p>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-slate-400">Monitored: </span>
              <strong className="text-slate-200">{data.summary.total_stations} Stations</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <div>
              <span className="text-slate-400">Floods: </span>
              <strong className="text-rose-400">{data.summary.minor_floods + data.summary.major_floods} Active</strong>
            </div>
          </div>

          <button
            onClick={fetchSnapshot}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span suppressHydrationWarning>{lastSync ? `Synced ${lastSync}` : 'Syncing...'}</span>
          </button>
        </div>
      </header>

      <AlertsTicker alerts={data.alerts} />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-800 bg-slate-950/80 p-3 overflow-y-auto space-y-2 shrink-0">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
            River Stations ({data.stations.length})
          </div>
          {data.stations.map((st) => (
            <StationStatusCard
              key={st.id}
              station={st}
              isSelected={selectedStation?.id === st.id}
              onSelect={(station) => setSelectedStation(station)}
            />
          ))}
        </div>

        <div className="flex-1 p-3 flex flex-col relative overflow-hidden">
          <MapViewer
            stations={data.stations}
            rainfall={data.rainfall}
            selectedStation={selectedStation}
            onSelectStation={(st) => setSelectedStation(st)}
          />

          {selectedStation && (
            <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-6 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-2xl z-20 transition-all">
              <div className="flex items-start justify-between mb-3 border-b border-slate-800/80 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-slate-100">{selectedStation.name}</h2>
                    <span className="text-xs text-cyan-400 font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                      {selectedStation.basin}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5" suppressHydrationWarning>
                    Lat: {selectedStation.lat.toFixed(4)} | Lng: {selectedStation.lng.toFixed(4)} | Last Updated: {new Date(selectedStation.last_updated).toLocaleTimeString()}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedStation(null)}
                  className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <HydrographChart station={selectedStation} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
