'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { StationSnapshot, BasinRainfallSnapshot, AlertSeverityLevel } from '../types/hydrology';
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

const RIVER_STATUS_COLORS: Record<string, string> = {
  MAJOR_FLOOD: '#ef4444', // Red glow
  MINOR_FLOOD: '#f97316', // Orange glow
  ALERT: '#eab308',       // Amber glow
  NORMAL: '#0ea5e9',      // Cyan neon glow
  STALE: '#0284c7'
};

function getRainfallColor(mm: number): string {
  if (mm >= 30) return '#ef4444';
  if (mm >= 15) return '#f97316';
  if (mm >= 5)  return '#06b6d4';
  if (mm > 0.5) return '#3b82f6';
  return '#64748b';
}

function normalizeBasinId(rawId: string): string {
  if (!rawId) return 'basin_kelani';
  if (rawId.startsWith('basin_')) return rawId;
  return `basin_${rawId.toLowerCase()}`;
}

function computeBasinWorstStatus(basinId: string, currentStations: StationSnapshot[]): string {
  const normTarget = normalizeBasinId(basinId);
  const basinStations = currentStations.filter((s) => {
    const sBasinId = s.basin_id || normalizeBasinId(s.basin.split(' ')[0]);
    return sBasinId === normTarget;
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

  return worstStatus;
}

function applyBasinStyling(geojson: any, currentStations: StationSnapshot[], rainfallList: BasinRainfallSnapshot[] | undefined, mode: 'stations' | 'rainfall') {
  if (!geojson?.features) return geojson;

  geojson.features.forEach((f: any) => {
    const basinId = normalizeBasinId(f.properties.id);

    if (mode === 'rainfall') {
      const rain = rainfallList?.find(r => normalizeBasinId(r.basin_id) === basinId);
      const mm = rain?.precipitation_mm ?? 0;
      f.properties.color = getRainfallColor(mm);
      f.properties.status = mm >= 30 ? 'CRITICAL_RAIN' : 'NORMAL';
      f.properties.rain_mm = mm;
    } else {
      const worstStatus = computeBasinWorstStatus(basinId, currentStations);
      f.properties.color = RIVER_STATUS_COLORS[worstStatus] || '#0ea5e9';
      f.properties.status = worstStatus;
    }
  });

  return geojson;
}

function applyRiverStyling(geojson: any, currentStations: StationSnapshot[]) {
  if (!geojson?.features) return geojson;

  geojson.features.forEach((f: any) => {
    const riverId = normalizeBasinId(f.properties.river_id || f.properties.id);
    const worstStatus = computeBasinWorstStatus(riverId, currentStations);

    f.properties.color = RIVER_STATUS_COLORS[worstStatus] || '#0ea5e9';
    f.properties.status = worstStatus;
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
  const basinsGeoJsonRef = useRef<any>(null);
  const riversGeoJsonRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<'stations' | 'rainfall'>('stations');

  // Callback to select the primary station of a given basin
  const handleBasinSelection = useCallback((basinId: string) => {
    const norm = normalizeBasinId(basinId);
    const matching = stations.filter(s => (s.basin_id || normalizeBasinId(s.basin)) === norm);
    if (matching.length === 0) return;

    // Pick station with highest severity or first
    const sorted = [...matching].sort((a, b) => (SEVERITY_WEIGHT[b.status] || 0) - (SEVERITY_WEIGHT[a.status] || 0));
    onSelectStation(sorted[0]);
  }, [stations, onSelectStation]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [80.7718, 7.6000],
      zoom: 7.3,
      attributionControl: false
    });

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', async () => {
      const currentMap = map.current;
      if (!currentMap) return;

      try {
        const [basinsRes, riversRes] = await Promise.all([
          fetch('/geo/sl-basins.json'),
          fetch('/geo/sl-rivers.geojson')
        ]);

        const basinsData = await basinsRes.json();
        const riversData = await riversRes.json();

        basinsGeoJsonRef.current = basinsData;
        riversGeoJsonRef.current = riversData;

        const styledBasins = applyBasinStyling(basinsData, stations, rainfall, viewMode);
        const styledRivers = applyRiverStyling(riversData, stations);

        // 1. BASINS SOURCE & LAYERS
        currentMap.addSource('sl-basins', {
          type: 'geojson',
          data: styledBasins
        });

        currentMap.addLayer({
          id: 'basins-fill',
          type: 'fill',
          source: 'sl-basins',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': ['case', ['==', ['get', 'status'], 'MAJOR_FLOOD'], 0.22, 0.10]
          }
        });

        currentMap.addLayer({
          id: 'basins-outline',
          type: 'line',
          source: 'sl-basins',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['case', ['==', ['get', 'status'], 'MAJOR_FLOOD'], 2.5, 1.2],
            'line-dasharray': [3, 2],
            'line-opacity': 0.7
          }
        });

        // 2. RIVERS SOURCE & DUAL-LAYER NEON STYLING
        currentMap.addSource('sl-rivers', {
          type: 'geojson',
          data: styledRivers
        });

        // Layer 1: Rivers Glow (Wide blurred line)
        currentMap.addLayer({
          id: 'rivers-glow',
          type: 'line',
          source: 'sl-rivers',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              6, 6,
              9, 12,
              12, 18
            ],
            'line-blur': 6,
            'line-opacity': 0.65
          }
        });

        // Layer 2: Rivers Core (Crisp inner line, clickable)
        currentMap.addLayer({
          id: 'rivers-core',
          type: 'line',
          source: 'sl-rivers',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': ['case', ['==', ['get', 'status'], 'NORMAL'], '#38bdf8', ['get', 'color']],
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              6, 2.0,
              9, 3.5,
              12, 5.0
            ],
            'line-opacity': 0.95
          }
        });

        // 3. INTERACTION: CLICK & HOVER
        currentMap.on('click', 'rivers-core', (e) => {
          if (!e.features || e.features.length === 0) return;
          const feat = e.features[0];
          const rId = feat.properties?.river_id || feat.properties?.id;
          if (rId) handleBasinSelection(rId);
        });

        currentMap.on('click', 'rivers-glow', (e) => {
          if (!e.features || e.features.length === 0) return;
          const feat = e.features[0];
          const rId = feat.properties?.river_id || feat.properties?.id;
          if (rId) handleBasinSelection(rId);
        });

        currentMap.on('click', 'basins-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          const feat = e.features[0];
          const bId = feat.properties?.id;
          if (bId) handleBasinSelection(bId);
        });

        const setPointer = () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        };
        const resetPointer = () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        };

        currentMap.on('mouseenter', 'rivers-core', setPointer);
        currentMap.on('mouseleave', 'rivers-core', resetPointer);
        currentMap.on('mouseenter', 'basins-fill', setPointer);
        currentMap.on('mouseleave', 'basins-fill', resetPointer);

      } catch (err) {
        console.warn('Failed initializing map layers:', err);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [handleBasinSelection]);

  // Update dynamic colors and data when stations or rainfall update
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    if (basinsGeoJsonRef.current && currentMap.getSource('sl-basins')) {
      const updatedBasins = applyBasinStyling(basinsGeoJsonRef.current, stations, rainfall, viewMode);
      (currentMap.getSource('sl-basins') as maplibregl.GeoJSONSource).setData(updatedBasins);
    }

    if (riversGeoJsonRef.current && currentMap.getSource('sl-rivers')) {
      const updatedRivers = applyRiverStyling(riversGeoJsonRef.current, stations);
      (currentMap.getSource('sl-rivers') as maplibregl.GeoJSONSource).setData(updatedRivers);
    }
  }, [stations, rainfall, viewMode]);

  // Smooth camera fly-to when station is selected
  useEffect(() => {
    if (selectedStation && map.current) {
      map.current.flyTo({
        center: [selectedStation.lng, selectedStation.lat],
        zoom: 9.0,
        duration: 1200
      });
    }
  }, [selectedStation]);

  return (
    <div className="relative w-full h-full min-h-[350px]">
      <div ref={mapContainer} className="w-full h-full absolute inset-0 rounded-xl overflow-hidden border border-slate-800" />
      
      {/* Layer Toggle Switch */}
      <div className="absolute top-2.5 right-12 md:top-3 md:right-14 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-0.5 md:p-1 flex items-center gap-1 shadow-2xl font-mono text-[11px] md:text-xs">
        <button
          onClick={() => setViewMode('stations')}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            viewMode === 'stations'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Waves className="w-3 h-3 md:w-3.5 md:h-3.5 text-cyan-400" />
          <span>Vector Rivers</span>
        </button>

        <button
          onClick={() => setViewMode('rainfall')}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            viewMode === 'rainfall'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CloudRain className="w-3 h-3 md:w-3.5 md:h-3.5" />
          <span>Rainfall Radar</span>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-2.5 left-2.5 md:top-3 md:left-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2 md:p-2.5 text-[10px] md:text-xs text-slate-300 space-y-1 z-10 font-mono shadow-xl max-w-[130px] md:max-w-none">
        {viewMode === 'stations' ? (
          <>
            <div className="font-bold text-slate-100 uppercase tracking-wider text-[9px] md:text-[10px] mb-0.5">River Glow Telemetry</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-1 md:w-3 md:h-1 rounded-full bg-rose-500 shrink-0 shadow-[0_0_8px_#ef4444]"></span> Major Flood</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-1 md:w-3 md:h-1 rounded-full bg-orange-500 shrink-0 shadow-[0_0_8px_#f97316]"></span> Minor Flood</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-1 md:w-3 md:h-1 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_#eab308]"></span> Alert Level</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-1 md:w-3 md:h-1 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_#0ea5e9]"></span> Normal Flow</div>
          </>
        ) : (
          <>
            <div className="font-bold text-slate-100 uppercase tracking-wider text-[9px] md:text-[10px] mb-0.5">Precipitation</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-rose-500 shrink-0"></span> &ge;30 mm (Extreme)</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-orange-500 shrink-0"></span> 15-30 mm (Heavy)</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-cyan-500 shrink-0"></span> 5-15 mm (Mod)</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-blue-500 shrink-0"></span> &lt;5 mm (Light)</div>
          </>
        )}
      </div>
    </div>
  );
};
