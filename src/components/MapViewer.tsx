'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { StationSnapshot, BasinRainfallSnapshot } from '../types/hydrology';
import { CloudRain, Waves } from 'lucide-react';

interface MapViewerProps {
  stations: StationSnapshot[];
  rainfall?: BasinRainfallSnapshot[];
  selectedStation: StationSnapshot | null;
  onSelectStation: (station: StationSnapshot) => void;
}

const SEVERITY_WEIGHT: Record<string, number> = {
  MAJOR_FLOOD: 4,
  MINOR_FLOOD: 3,
  ALERT: 2,
  NORMAL: 1,
  STALE: 0
};

const STATUS_COLORS: Record<string, string> = {
  MAJOR_FLOOD: '#ef4444',
  MINOR_FLOOD: '#f97316',
  ALERT: '#f59e0b',
  NORMAL: '#10b981',
  STALE: '#64748b'
};

function getRainfallColor(mm: number): string {
  if (mm >= 30) return '#ef4444'; // Extreme / Flash-flood risk
  if (mm >= 15) return '#f97316'; // Heavy rain
  if (mm >= 5)  return '#06b6d4'; // Moderate rain
  if (mm > 0.5) return '#3b82f6'; // Light rain
  return '#64748b';               // Dry / Negligible
}

function getRainfallLabel(mm: number): string {
  if (mm >= 30) return 'Extreme (>30mm)';
  if (mm >= 15) return 'Heavy (15-30mm)';
  if (mm >= 5)  return 'Moderate (5-15mm)';
  if (mm > 0.5) return 'Light (0.5-5mm)';
  return 'Dry / Minimal';
}

function applyBasinStyling(geojson: any, currentStations: StationSnapshot[], rainfallList: BasinRainfallSnapshot[] | undefined, mode: 'stations' | 'rainfall') {
  if (!geojson?.features) return geojson;

  geojson.features.forEach((f: any) => {
    const basinId = f.properties.id;

    if (mode === 'rainfall') {
      const rain = rainfallList?.find(r => r.basin_id === basinId);
      const mm = rain?.precipitation_mm ?? 0;
      f.properties.color = getRainfallColor(mm);
      f.properties.status = mm >= 30 ? 'CRITICAL_RAIN' : 'NORMAL';
      f.properties.rain_mm = mm;
    } else {
      const basinStations = currentStations.filter((s) => {
        const bLower = s.basin.toLowerCase();
        if (basinId === 'maha') return bLower === 'maha oya';
        return bLower.includes(basinId);
      });

      let worstStatus = 'NORMAL';
      let maxWeight = 1;

      basinStations.forEach((s) => {
        const weight = SEVERITY_WEIGHT[s.status] || 0;
        if (weight > maxWeight) {
          maxWeight = weight;
          worstStatus = s.status;
        }
      });

      f.properties.color = STATUS_COLORS[worstStatus];
      f.properties.status = worstStatus;
    }
  });

  return geojson;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  stations,
  rainfall,
  selectedStation,
  onSelectStation
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: maplibregl.Marker }>({});
  const rainMarkersRef = useRef<maplibregl.Marker[]>([]);
  const basinsGeoJsonRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<'stations' | 'rainfall'>('stations');

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [80.7718, 7.8731],
      zoom: 7.2,
      attributionControl: false
    });

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', () => {
      const currentMap = map.current;
      if (!currentMap) return;

      fetch('/geo/sl-basins.json')
        .then((res) => res.json())
        .then((geojson) => {
          if (!map.current) return;
          basinsGeoJsonRef.current = geojson;
          const styledGeoJson = applyBasinStyling(geojson, stations, rainfall, viewMode);

          map.current.addSource('sl-basins', {
            type: 'geojson',
            data: styledGeoJson
          });

          map.current.addLayer({
            id: 'basins-fill',
            type: 'fill',
            source: 'sl-basins',
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': ['case', ['==', ['get', 'status'], 'MAJOR_FLOOD'], 0.22, 0.12]
            }
          });

          map.current.addLayer({
            id: 'basins-outline',
            type: 'line',
            source: 'sl-basins',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': ['case', ['==', ['get', 'status'], 'MAJOR_FLOOD'], 2.5, 1.5],
              'line-dasharray': [2, 2]
            }
          });
        })
        .catch((err) => console.warn('Failed loading basin geojson:', err));
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update polygon colors and markers on state or mode changes
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    if (basinsGeoJsonRef.current && currentMap.getSource('sl-basins')) {
      const updated = applyBasinStyling(basinsGeoJsonRef.current, stations, rainfall, viewMode);
      (currentMap.getSource('sl-basins') as maplibregl.GeoJSONSource).setData(updated);
    }

    // Clear previous markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    rainMarkersRef.current.forEach(m => m.remove());
    rainMarkersRef.current = [];

    if (viewMode === 'stations') {
      stations.forEach((station) => {
        const el = document.createElement('div');
        el.className = 'group cursor-pointer';

        let colorClass = 'bg-emerald-500 border-emerald-300 shadow-emerald-500/50';
        if (station.status === 'MAJOR_FLOOD') {
          colorClass = 'bg-rose-500 border-rose-300 shadow-rose-500/50 animate-bounce';
        } else if (station.status === 'MINOR_FLOOD') {
          colorClass = 'bg-orange-500 border-orange-300 shadow-orange-500/50';
        } else if (station.status === 'ALERT') {
          colorClass = 'bg-amber-500 border-amber-300 shadow-amber-500/50';
        } else if (station.status === 'STALE') {
          colorClass = 'bg-slate-500 border-slate-400 border-dashed';
        }

        const isSelected = selectedStation?.id === station.id;

        el.innerHTML = `
          <div class="relative">
            <div class="w-6 h-6 rounded-full border-2 ${colorClass} shadow-lg transition-transform ${isSelected ? 'scale-125 ring-4 ring-cyan-400' : 'hover:scale-110'} flex items-center justify-center">
              <span class="w-2 h-2 rounded-full bg-white"></span>
            </div>
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900/95 border border-slate-700 text-slate-100 text-[11px] font-mono px-2.5 py-1 rounded shadow-xl whitespace-nowrap z-50">
              <strong>${station.name}</strong> (${station.current_level !== null ? station.current_level.toFixed(2) + 'm' : 'N/A'})
              <div class="text-[9px] text-slate-400 mt-0.5">Synced: ${new Date(station.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        `;

        el.addEventListener('click', () => {
          onSelectStation(station);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([station.lng, station.lat])
          .addTo(currentMap);

        markersRef.current[station.id] = marker;
      });
    } else {
      // Render Rainfall centroid badges
      (rainfall || []).forEach((rain) => {
        const el = document.createElement('div');
        el.className = 'group cursor-pointer';

        const color = getRainfallColor(rain.precipitation_mm);

        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="px-2.5 py-1 rounded-full border border-slate-700/80 bg-slate-900/90 shadow-2xl backdrop-blur flex items-center gap-1.5 font-mono text-xs hover:scale-110 transition-transform">
              <span class="w-2 h-2 rounded-full" style="background-color: ${color}"></span>
              <strong class="text-slate-200">${rain.precipitation_mm.toFixed(1)}</strong>
              <span class="text-[10px] text-slate-400">mm/h</span>
            </div>
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900/95 border border-slate-700 text-slate-100 text-[11px] font-mono px-2.5 py-1 rounded shadow-xl whitespace-nowrap z-50">
              <strong>${rain.basin_name} Basin</strong>
              <div class="text-[10px] text-cyan-400 mt-0.5">Rain: ${rain.precipitation_mm.toFixed(2)} mm/hr (${getRainfallLabel(rain.precipitation_mm)})</div>
            </div>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([rain.lng, rain.lat])
          .addTo(currentMap);

        rainMarkersRef.current.push(marker);
      });
    }
  }, [stations, rainfall, viewMode, selectedStation, onSelectStation]);

  useEffect(() => {
    if (selectedStation && map.current && viewMode === 'stations') {
      map.current.flyTo({
        center: [selectedStation.lng, selectedStation.lat],
        zoom: 9.5,
        duration: 1200
      });
    }
  }, [selectedStation, viewMode]);

  return (
    <div className="relative w-full h-full min-h-[450px]">
      <div ref={mapContainer} className="w-full h-full absolute inset-0 rounded-xl overflow-hidden border border-slate-800" />
      
      {/* Layer Toggle Switch */}
      <div className="absolute top-3 right-14 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-1 flex items-center gap-1 shadow-2xl font-mono text-xs">
        <button
          onClick={() => setViewMode('stations')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
            viewMode === 'stations'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          <span>Rivers ({stations.length})</span>
        </button>

        <button
          onClick={() => setViewMode('rainfall')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
            viewMode === 'rainfall'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CloudRain className="w-3.5 h-3.5" />
          <span>Rainfall Radar</span>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 space-y-1 z-10 font-mono shadow-xl">
        {viewMode === 'stations' ? (
          <>
            <div className="font-bold text-slate-100 uppercase tracking-wider text-[10px] mb-1">Critical Level</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Major Flood</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Minor Flood</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Alert Level</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Normal</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> Offline / Stale</div>
          </>
        ) : (
          <>
            <div className="font-bold text-slate-100 uppercase tracking-wider text-[10px] mb-1">Precipitation (mm/h)</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> &ge; 30 (Extreme)</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> 15 - 30 (Heavy)</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> 5 - 15 (Moderate)</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> 0.5 - 5 (Light)</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> &lt; 0.5 (Dry)</div>
          </>
        )}
      </div>
    </div>
  );
};
