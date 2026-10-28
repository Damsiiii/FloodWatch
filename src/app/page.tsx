'use client';

import React, { useEffect, useState } from 'react';
import { HydrologySnapshotPayload, StationSnapshot } from '../types/hydrology';
import { MOCK_SNAPSHOT } from '../../worker/mockData';
import { AlertsTicker } from '../components/AlertsTicker';
import { StationStatusCard } from '../components/StationStatusCard';
import { MapViewer } from '../components/MapViewer';
import { HydrographChart } from '../components/HydrographChart';
import { Waves, ShieldAlert, Activity, RefreshCw, X, Map, List } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<HydrologySnapshotPayload>(MOCK_SNAPSHOT);
  const [selectedStation, setSelectedStation] = useState<StationSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'map' | 'stations'>('map');

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
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 md:p-2 bg-cyan-950 border border-cyan-800 rounded-lg text-cyan-400">
            <Waves className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg text-slate-100 leading-tight">LankaFlood Watch</h1>
            <p className="text-[10px] md:text-xs text-slate-400 hidden sm:block">Sri Lanka Hydrology & River Telemetry Radar</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6 font-mono text-xs">
          <div className="hidden lg:flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-slate-400">Monitored: </span>
              <strong className="text-slate-200">{data.summary.total_stations} Stations</strong>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-800/40 px-2 py-1 rounded">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <strong className="text-rose-400 text-xs">
              {data.summary.minor_floods + data.summary.major_floods} Floods
            </strong>
          </div>

          <button
            onClick={fetchSnapshot}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 md:py-1.5 rounded-md border border-slate-700 text-slate-300 transition text-[11px] md:text-xs"
            title="Refresh telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span suppressHydrationWarning className="hidden sm:inline">
              {lastSync ? `Synced ${lastSync}` : 'Syncing...'}
            </span>
          </button>
        </div>
      </header>

      {/* Advisories Ticker */}
      <AlertsTicker alerts={data.alerts} />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Sidebar (List View) */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-800 bg-slate-950/90 p-3 overflow-y-auto space-y-2 shrink-0 ${
          mobileTab === 'stations' ? 'flex flex-col flex-1 z-10' : 'hidden md:block'
        }`}>
          <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>River Stations ({data.stations.length})</span>
            <span className="text-[10px] text-slate-500 md:hidden font-normal">Tap a station to inspect</span>
          </div>

          <div className="space-y-2 pb-14 md:pb-0">
            {data.stations.map((st) => (
              <StationStatusCard
                key={st.id}
                station={st}
                isSelected={selectedStation?.id === st.id}
                onSelect={(station) => {
                  setSelectedStation(station);
                  setMobileTab('map'); // Switch to map when user picks a station on mobile
                }}
              />
            ))}
          </div>
        </div>

        {/* Map View */}
        <div className={`flex-1 p-2 md:p-3 flex flex-col relative overflow-hidden ${
          mobileTab === 'map' ? 'flex flex-1' : 'hidden md:flex'
        }`}>
          <MapViewer
            stations={data.stations}
            rainfall={data.rainfall}
            selectedStation={selectedStation}
            onSelectStation={(st) => setSelectedStation(st)}
          />

          {/* Station Details Drawer */}
          {selectedStation && (
            <div className="absolute bottom-16 md:bottom-4 left-2 right-2 md:left-6 md:right-6 max-h-[60vh] overflow-y-auto bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-3 md:p-4 shadow-2xl z-20 transition-all">
              <div className="flex items-start justify-between mb-2 md:mb-3 border-b border-slate-800/80 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm md:text-base text-slate-100">{selectedStation.name}</h2>
                    <span className="text-[10px] md:text-xs text-cyan-400 font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                      {selectedStation.basin}
                    </span>
                  </div>
                  <p className="text-[10px] md:text-xs text-slate-400 font-mono mt-0.5" suppressHydrationWarning>
                    Lat: {selectedStation.lat.toFixed(4)} | Lng: {selectedStation.lng.toFixed(4)} | Last Updated: {new Date(selectedStation.last_updated).toLocaleTimeString()}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedStation(null)}
                  className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition"
                  title="Close station details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <HydrographChart station={selectedStation} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-6 py-2 flex items-center justify-around z-30 shrink-0">
        <button
          onClick={() => setMobileTab('map')}
          className={`flex flex-col items-center gap-1 text-xs font-mono transition ${
            mobileTab === 'map' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Map className="w-5 h-5" />
          <span>Live Radar</span>
        </button>

        <button
          onClick={() => setMobileTab('stations')}
          className={`flex flex-col items-center gap-1 text-xs font-mono transition ${
            mobileTab === 'stations' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <List className="w-5 h-5" />
          <span>Stations ({data.stations.length})</span>
        </button>
      </div>
    </div>
  );
}
