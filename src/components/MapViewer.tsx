'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { StationSnapshot, BasinRainfallSnapshot } from '../types/hydrology';
import { CloudRain, Waves, Satellite } from 'lucide-react';

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
  MAJOR_FLOOD: '#ef4444',
  MINOR_FLOOD: '#f97316',
  ALERT: '#eab308',
  NORMAL: '#0ea5e9',
  STALE: '#0284c7'
};

function getRainfallColor(mm: number): string {
  if (mm >= 30) return '#ef4444';
  if (mm >= 15) return '#f97316';
  if (mm >= 5)  return '#06b6d4';
  if (mm > 0.5) return '#3b82f6';
  return '#64748b';
}

function getRainfallLabel(mm: number): string {
  if (mm >= 30) return 'Extreme (>30mm)';
  if (mm >= 15) return 'Heavy (15-30mm)';
  if (mm >= 5)  return 'Moderate (5-15mm)';
  if (mm > 0.5) return 'Light (0.5-5mm)';
  return 'Dry / Minimal';
}

function normalizeBasinId(rawId: string): string {
  if (!rawId) return 'basin_kelani';
  const clean = rawId.toLowerCase().trim();
  if (clean.startsWith('basin_')) return clean;
  if (clean.includes('kelani')) return 'basin_kelani';
  if (clean.includes('kalu')) return 'basin_kalu';
  if (clean.includes('gin')) return 'basin_gin';
  if (clean.includes('nilwala')) return 'basin_nilwala';
  if (clean.includes('attanagalu') || clean.includes('ja-ela') || clean.includes('ja ela')) return 'basin_attanagalu';
  if (clean.includes('maha')) return 'basin_maha';
  if (clean.includes('deduru')) return 'basin_deduru';
  if (clean.includes('mahaweli')) return 'basin_mahaweli';
  if (clean.includes('walawe')) return 'basin_walawe';
  return `basin_${clean}`;
}

function computeBasinWorstStatus(basinId: string, currentStations: StationSnapshot[]): string {
  const normTarget = normalizeBasinId(basinId);
  const basinStations = currentStations.filter((s) => {
    const sBasinId = s.basin_id || normalizeBasinId(s.basin);
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
    const basinId = normalizeBasinId(f.properties.id || f.properties.name);

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
    const riverId = normalizeBasinId(f.properties.river_id || f.properties.basin_name || f.properties.id || f.properties.name);
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
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const basinsGeoJsonRef = useRef<any>(null);
  const riversGeoJsonRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<'stations' | 'rainfall'>('stations');
  const [showSatellite, setShowSatellite] = useState(false);

  // Dynamic state refs for event listeners
  const stationsRef = useRef(stations);
  const rainfallRef = useRef(rainfall);
  const viewModeRef = useRef(viewMode);

  useEffect(() => {
    stationsRef.current = stations;
    rainfallRef.current = rainfall;
    viewModeRef.current = viewMode;
  }, [stations, rainfall, viewMode]);

  // Callback to select the primary station of a given basin
  const handleBasinSelection = useCallback((basinId: string) => {
    const norm = normalizeBasinId(basinId);
    const matching = stationsRef.current.filter(s => (s.basin_id || normalizeBasinId(s.basin)) === norm);
    if (matching.length === 0) return;

    const sorted = [...matching].sort((a, b) => (SEVERITY_WEIGHT[b.status] || 0) - (SEVERITY_WEIGHT[a.status] || 0));
    onSelectStation(sorted[0]);
  }, [onSelectStation]);

  // Render HTML tooltip card for a hovered region/river
  const buildHoverPopupHtml = useCallback((basinId: string, basinNameFallback: string) => {
    const norm = normalizeBasinId(basinId);
    const currentStations = stationsRef.current;
    const currentRainfall = rainfallRef.current;
    const currentMode = viewModeRef.current;

    const basinStations = currentStations.filter(s => (s.basin_id || normalizeBasinId(s.basin)) === norm);
    const rain = currentRainfall?.find(r => normalizeBasinId(r.basin_id) === norm);
    const basinName = basinStations[0]?.basin || rain?.basin_name || basinNameFallback || 'River Basin';
    const worstStatus = computeBasinWorstStatus(norm, currentStations);

    let statusBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (worstStatus === 'MAJOR_FLOOD') statusBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/50';
    else if (worstStatus === 'MINOR_FLOOD') statusBadgeColor = 'bg-orange-500/20 text-orange-300 border-orange-500/50';
    else if (worstStatus === 'ALERT') statusBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/50';

    if (currentMode === 'rainfall') {
      const mm = rain?.precipitation_mm ?? 0;
      return `
        <div class="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg p-2.5 shadow-2xl font-mono text-[11px] text-slate-200 min-w-[210px] pointer-events-none">
          <div class="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
            <strong class="text-slate-100 text-xs">${basinName}</strong>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border bg-blue-500/20 text-blue-300 border-blue-500/40">
              Rainfall
            </span>
          </div>
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Precipitation:</span>
              <strong class="text-cyan-300 text-xs">${mm.toFixed(1)} mm/h</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Classification:</span>
              <span class="text-slate-300">${getRainfallLabel(mm)}</span>
            </div>
            ${rain?.observed_at ? `
              <div class="text-[9px] text-slate-500 pt-1 border-t border-slate-800/80">
                Synced: ${new Date(rain.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            ` : ''}
          </div>
          <div class="mt-2 text-[9px] text-cyan-400/80 text-center bg-cyan-950/40 py-0.5 rounded border border-cyan-800/30">
            🖱 Click to inspect hydrograph
          </div>
        </div>
      `;
    }

    return `
      <div class="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg p-2.5 shadow-2xl font-mono text-[11px] text-slate-200 min-w-[240px] max-w-[290px] pointer-events-none">
        <div class="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
          <strong class="text-slate-100 text-xs truncate">${basinName}</strong>
          <span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${statusBadgeColor} shrink-0">
            ${worstStatus.replace('_', ' ')}
          </span>
        </div>

        <div class="space-y-1.5 max-h-[140px] overflow-hidden">
          ${basinStations.length === 0 ? `
            <div class="text-slate-400 text-[10px] italic">No active gauges in basin</div>
          ` : basinStations.slice(0, 3).map(st => {
            let lvlColor = 'text-emerald-400';
            if (st.status === 'MAJOR_FLOOD') lvlColor = 'text-rose-400 font-bold';
            else if (st.status === 'MINOR_FLOOD') lvlColor = 'text-orange-400 font-bold';
            else if (st.status === 'ALERT') lvlColor = 'text-amber-400 font-bold';

            const rocArrow = st.rate_of_change > 0 ? '▲' : st.rate_of_change < 0 ? '▼' : '─';
            const rocColor = st.rate_of_change > 0 ? 'text-rose-400' : st.rate_of_change < 0 ? 'text-emerald-400' : 'text-slate-400';

            return `
              <div class="flex items-center justify-between gap-2 text-[10px] border-b border-slate-800/60 pb-1">
                <span class="text-slate-300 truncate max-w-[130px]">${st.name.replace(/\(.*?\)/g, '')}</span>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="${lvlColor}">${st.current_level !== null ? st.current_level.toFixed(2) + 'm' : 'N/A'}</span>
                  <span class="${rocColor} text-[9px]">${rocArrow} ${Math.abs(st.rate_of_change).toFixed(2)}</span>
                </div>
              </div>
            `;
          }).join('')}
          ${basinStations.length > 3 ? `
            <div class="text-[9px] text-slate-400 text-right">+${basinStations.length - 3} more stations</div>
          ` : ''}
        </div>

        ${basinStations[0]?.catchment ? `
          <div class="mt-1.5 pt-1 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
            <span>Soil Saturation: <strong class="text-slate-200">${(basinStations[0].catchment.soil_moisture_0_to_7cm * 100).toFixed(0)}%</strong></span>
            <span>Runoff: <strong class="text-slate-200">${basinStations[0].catchment.surface_runoff_risk.toFixed(1)}</strong></span>
          </div>
        ` : ''}

        <div class="mt-2 text-[9px] text-cyan-400/90 text-center bg-cyan-950/40 py-0.5 rounded border border-cyan-800/40">
          🖱 Click to open station telemetry
        </div>
      </div>
    `;
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const newMap = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [80.7718, 7.6000],
      zoom: 7.3,
      attributionControl: false
    });
    map.current = newMap;

    newMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: 'floodwatch-hover-popup'
    });
    popupRef.current = popup;

    newMap.on('load', async () => {
      try {
        const [basinsRes, riversRes] = await Promise.all([
          fetch('/geo/sl-basins.json'),
          fetch('/geo/sl-rivers.geojson')
        ]);

        const basinsData = await basinsRes.json();
        const riversData = await riversRes.json();

        basinsGeoJsonRef.current = basinsData;
        riversGeoJsonRef.current = riversData;

        const styledBasins = applyBasinStyling(basinsData, stationsRef.current, rainfallRef.current, viewModeRef.current);
        const styledRivers = applyRiverStyling(riversData, stationsRef.current);

        // 0. SATELLITE BASEMAP (ESRI World Imagery)
        newMap.addSource('esri-satellite', {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          maxzoom: 19
        });

        newMap.addLayer({
          id: 'satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          layout: {
            visibility: 'none'
          },
          paint: {
            'raster-opacity': 0.92
          }
        });

        // 1. BASINS SOURCE & LAYERS
        newMap.addSource('sl-basins', {
          type: 'geojson',
          data: styledBasins
        });

        newMap.addLayer({
          id: 'basins-fill',
          type: 'fill',
          source: 'sl-basins',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': ['case', ['==', ['get', 'status'], 'MAJOR_FLOOD'], 0.22, 0.10]
          }
        });

        newMap.addLayer({
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
        newMap.addSource('sl-rivers', {
          type: 'geojson',
          data: styledRivers
        });

        newMap.addLayer({
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

        newMap.addLayer({
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

        // 3. INTERACTIVE CLICKS
        const handleFeatureClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (!e.features || e.features.length === 0) return;
          const feat = e.features[0];
          const bId = feat.properties?.river_id || feat.properties?.id || feat.properties?.basin_name || feat.properties?.name;
          if (bId) handleBasinSelection(bId);
        };

        newMap.on('click', 'rivers-core', handleFeatureClick);
        newMap.on('click', 'rivers-glow', handleFeatureClick);
        newMap.on('click', 'basins-fill', handleFeatureClick);

        // 4. GENERAL MOUSEMOVE FOR INSTANT HOVER RESPONSE
        newMap.on('mousemove', (e) => {
          if (!map.current || !popupRef.current) return;

          // Query interactive features under cursor
          const features = newMap.queryRenderedFeatures(e.point, {
            layers: ['rivers-core', 'rivers-glow', 'basins-fill']
          });

          if (features && features.length > 0) {
            newMap.getCanvas().style.cursor = 'pointer';
            const feat = features[0];
            const basinId = feat.properties?.river_id || feat.properties?.id || feat.properties?.basin_name || feat.properties?.name || '';
            const basinName = feat.properties?.basin_name || feat.properties?.name || '';
            const html = buildHoverPopupHtml(basinId, basinName);

            popupRef.current
              .setLngLat(e.lngLat)
              .setHTML(html)
              .addTo(newMap);
          } else {
            newMap.getCanvas().style.cursor = '';
            popupRef.current.remove();
          }
        });

        newMap.on('mouseleave', () => {
          if (popupRef.current) popupRef.current.remove();
        });

      } catch (err) {
        console.warn('Failed initializing map layers:', err);
      }
    });

    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [handleBasinSelection, buildHoverPopupHtml]);

  // Update dynamic colors and data when stations, rainfall, or viewMode update
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

  // Toggle satellite imagery visibility
  useEffect(() => {
    if (!map.current) return;
    try {
      if (map.current.getLayer('satellite-layer')) {
        map.current.setLayoutProperty(
          'satellite-layer',
          'visibility',
          showSatellite ? 'visible' : 'none'
        );
      }
    } catch (e) {}
  }, [showSatellite]);

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

        <div className="h-3.5 w-px bg-slate-800 mx-0.5" />

        <button
          onClick={() => setShowSatellite(prev => !prev)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            showSatellite
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle High-Resolution Satellite Map"
        >
          <Satellite className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-400" />
          <span>Satellite</span>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-2.5 left-2.5 md:top-3 md:left-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2 md:p-2.5 text-[10px] md:text-xs text-slate-300 space-y-1 z-10 font-mono shadow-xl max-w-[130px] md:max-w-none pointer-events-none">
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
