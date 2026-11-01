'use client';

import React, { useEffect, useState } from 'react';
import { HydrologySnapshotPayload, StationSnapshot, StationStatus } from '../types/hydrology';
import { MOCK_SNAPSHOT } from '../../worker/mockData';
import { AlertsTicker } from '../components/AlertsTicker';
import { StationStatusCard } from '../components/StationStatusCard';
import { MapViewer } from '../components/MapViewer';
import { HydrographChart } from '../components/HydrographChart';
import { Waves, ShieldAlert, Activity, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';

function matchGaugeForStation(st: StationSnapshot, g: any): boolean {
  if (!g?.gauge) return false;
  const normSt = st.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normId = st.id.toLowerCase();
  const normG = g.gauge.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normId.includes('nagatham') || normSt.includes('nagatham') || normSt.includes('nagalagam')) {
    return normG.includes('nagalagam');
  }
  if (normId.includes('hanwella') || normSt.includes('hanwella')) {
    return normG.includes('hanwella');
  }
  if (normId.includes('glencorse') || normSt.includes('glencorse')) {
    return normG.includes('glencourse') || normG.includes('glencorse');
  }
  if (normId.includes('kitulgala') || normSt.includes('kitulgala')) {
    return normG.includes('kithulgala') || normG.includes('kitulgala');
  }
  if (normId.includes('holombuwa') || normSt.includes('holombuwa')) {
    return normG.includes('holombuwa');
  }
  if (normId.includes('ratnapura') || normSt.includes('ratnapura')) {
    return normG.includes('rathnapura') || normG.includes('ratnapura');
  }
  if (normId.includes('ellagawa') || normSt.includes('ellagawa')) {
    return normG.includes('ellagawa');
  }
  if (normId.includes('millakanda') || normSt.includes('millakanda')) {
    return normG.includes('millakanda') || normG.includes('kalawellawa');
  }
  if (normId.includes('putupaula') || normSt.includes('putupaula')) {
    return normG.includes('putupaula');
  }
  if (normId.includes('magura') || normSt.includes('maguru') || normSt.includes('magura')) {
    return normG.includes('magura');
  }
  if (normId.includes('thawalama') || normSt.includes('thawalama')) {
    return normG.includes('thawalama');
  }
  if (normId.includes('baddegama') || normSt.includes('baddegama')) {
    return normG.includes('baddegama');
  }
  if (normId.includes('pitabeddara') || normSt.includes('pitabeddara')) {
    return normG.includes('pitabeddara');
  }
  if (normId.includes('akuressa') || normSt.includes('akuressa') || normId.includes('urawa')) {
    return normG.includes('urawa') || normG.includes('akuressa');
  }
  if (normId.includes('panadugama') || normSt.includes('panadugama')) {
    return normG.includes('panadugama');
  }
  if (normId.includes('dunamale') || normSt.includes('dunamale')) {
    return normG.includes('dunamale');
  }
  if (normId.includes('giriulla') || normSt.includes('giriulla')) {
    return normG.includes('giriulla');
  }
  if (normId.includes('moragaswewa') || normSt.includes('moragaswewa')) {
    return normG.includes('moragaswewa');
  }
  if (normId.includes('peradeniya') || normSt.includes('peradeniya')) {
    return normG.includes('peradeniya');
  }
  if (normId.includes('weragantota') || normSt.includes('weragantota')) {
    return normG.includes('weraganthota') || normG.includes('weragantota');
  }
  if (normId.includes('manampitiya') || normSt.includes('manampitiya')) {
    return normG.includes('manampitiya');
  }

  return normSt.includes(normG) || normG.includes(normSt);
}

function applyLiveGaugeReadings(prevData: HydrologySnapshotPayload, liveRecords: any[]): HydrologySnapshotPayload {
  let totalAlerts = 0;
  let minorFloods = 0;
  let majorFloods = 0;

  const updatedStations = prevData.stations.map((st) => {
    const matchingRecords = liveRecords
      .filter((g: any) => matchGaugeForStation(st, g) && typeof g.water_level === 'number' && g.CreationDate)
      .sort((a: any, b: any) => new Date(a.CreationDate).getTime() - new Date(b.CreationDate).getTime());

    if (matchingRecords.length === 0) {
      if (st.status === 'MAJOR_FLOOD') majorFloods++;
      else if (st.status === 'MINOR_FLOOD') minorFloods++;
      else if (st.status === 'ALERT') totalAlerts++;
      return st;
    }

    const latest = matchingRecords[matchingRecords.length - 1];
    const liveLevel = Number(latest.water_level.toFixed(2));
    const alertLevel = typeof latest.alertpull === 'number' ? latest.alertpull : st.alert_level;
    const minorLevel = typeof latest.minorpull === 'number' ? latest.minorpull : st.minor_flood_level;
    const majorLevel = typeof latest.majorpull === 'number' ? latest.majorpull : st.major_flood_level;

    let newStatus: StationStatus = 'NORMAL';
    if (liveLevel >= majorLevel) {
      newStatus = 'MAJOR_FLOOD';
      majorFloods++;
    } else if (liveLevel >= minorLevel) {
      newStatus = 'MINOR_FLOOD';
      minorFloods++;
    } else if (liveLevel >= alertLevel) {
      newStatus = 'ALERT';
      totalAlerts++;
    }

    // Rate of change over previous reading
    let rateOfChange = 0;
    if (matchingRecords.length >= 2) {
      const prev = matchingRecords[matchingRecords.length - 2];
      rateOfChange = Number((latest.water_level - prev.water_level).toFixed(2));
    }

    // Build real 24h hydrograph from actual historical readings
    const historyPoints: { timestamp: string; level: number }[] = [];
    let lastSec = -1;

    matchingRecords.slice(-24).forEach((rec: any) => {
      const sec = Math.floor(new Date(rec.CreationDate).getTime() / 1000);
      if (sec > lastSec) {
        lastSec = sec;
        historyPoints.push({
          timestamp: rec.CreationDate,
          level: Number(rec.water_level.toFixed(2))
        });
      }
    });

    return {
      ...st,
      current_level: liveLevel,
      alert_level: alertLevel,
      minor_flood_level: minorLevel,
      major_flood_level: majorLevel,
      status: newStatus,
      rate_of_change: rateOfChange,
      last_updated: latest.CreationDate || new Date().toISOString(),
      history_24h: historyPoints.length > 0 ? historyPoints : st.history_24h,
    };
  });

  return {
    ...prevData,
    timestamp: new Date().toISOString(),
    stations: updatedStations,
    summary: {
      ...prevData.summary,
      active_alerts: totalAlerts,
      minor_floods: minorFloods,
      major_floods: majorFloods,
    },
    alerts: (majorFloods === 0 && minorFloods === 0 && totalAlerts === 0) ? [] : prevData.alerts
  };
}

export default function Dashboard() {
  const [data, setData] = useState<HydrologySnapshotPayload>(MOCK_SNAPSHOT);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [isMobileListExpanded, setIsMobileListExpanded] = useState<boolean>(false);

  const selectedStation = selectedStationId
    ? data.stations.find((s) => s.id === selectedStationId) || null
    : null;

  const fetchSnapshot = async () => {
    setIsLoading(true);
    try {
      // 1. Try local or configured worker API
      const res = await fetch('/api/snapshot').catch(() => null);
      if (res && res.ok) {
        const payload: HydrologySnapshotPayload = await res.json();
        setData(payload);
        setLastSync(new Date(payload.timestamp).toLocaleTimeString());
        return;
      }

      // 2. Direct Live Fallback: Fetch official live government telemetry
      const liveGaugesRes = await fetch('https://risesrilanka.org/api/gauges').catch(() => null);
      if (liveGaugesRes && liveGaugesRes.ok) {
        const json: any = await liveGaugesRes.json();
        const records = Array.isArray(json) ? json : (json?.records || []);
        if (records.length > 0) {
          setData(prev => applyLiveGaugeReadings(prev, records));
          setLastSync(new Date().toLocaleTimeString());
          return;
        }
      }

      console.warn('Live gauge fallback unavailable, retaining current snapshot');
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn('Snapshot fetch fallback error:', e);
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
      <header className="bg-slate-900 border-b border-slate-800 px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between gap-2 shrink-0 z-20">
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
        {/* Desktop Sidebar / Mobile Pull-Up Sheet */}
        <aside
          className={`
            bg-slate-950/95 md:bg-slate-950/90 border-slate-800 backdrop-blur-md transition-all duration-300 ease-in-out
            fixed md:static inset-x-0 bottom-0 z-30 md:z-10
            flex flex-col md:w-80 lg:w-96 md:border-r
            ${isMobileListExpanded ? 'h-[75vh]' : 'h-14 md:h-full'}
            rounded-t-2xl md:rounded-none border-t md:border-t-0 shadow-2xl md:shadow-none
          `}
        >
          {/* Header & Mobile Drag/Touch Handle */}
          <div
            onClick={() => setIsMobileListExpanded(prev => !prev)}
            className="p-3 md:p-3.5 border-b border-slate-800/80 flex items-center justify-between cursor-pointer md:cursor-default select-none shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse md:hidden"></span>
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                River Stations ({data.stations.length})
              </span>
            </div>

            {/* Mobile Expand / Collapse Chevron */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono md:hidden">
              <span className="text-[11px] text-cyan-400 font-semibold">
                {isMobileListExpanded ? 'Hide List' : 'Swipe Up for Stations'}
              </span>
              {isMobileListExpanded ? (
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-cyan-400" />
              )}
            </div>
          </div>

          {/* Scrollable Stations List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 overscroll-contain">
            {data.stations.map((st) => (
              <StationStatusCard
                key={st.id}
                station={st}
                isSelected={selectedStation?.id === st.id}
                onSelect={(station) => {
                  setSelectedStationId(station.id);
                  setIsMobileListExpanded(false); // Collapse sheet to reveal station on map
                }}
              />
            ))}
          </div>
        </aside>

        {/* Map View */}
        <main className="flex-1 p-2 md:p-3 flex flex-col relative overflow-hidden pb-16 md:pb-3">
          <MapViewer
            stations={data.stations}
            rainfall={data.rainfall}
            selectedStation={selectedStation}
            onSelectStation={(st) => setSelectedStationId(st.id)}
          />

          {/* Station Details Drawer */}
          {selectedStation && (
            <div className="absolute bottom-16 md:bottom-4 left-2 right-2 md:left-6 md:right-6 max-h-[55vh] overflow-y-auto bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-3 md:p-4 shadow-2xl z-20 transition-all">
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
                  onClick={() => setSelectedStationId(null)}
                  className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition"
                  title="Close station details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <HydrographChart station={selectedStation} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
