'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { StationSnapshot } from '../types/hydrology';

interface MapViewerProps {
  stations: StationSnapshot[];
  selectedStation: StationSnapshot | null;
  onSelectStation: (station: StationSnapshot) => void;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  stations,
  selectedStation,
  onSelectStation
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: maplibregl.Marker }>({});

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

          map.current.addSource('sl-basins', {
            type: 'geojson',
            data: geojson as any
          });

          map.current.addLayer({
            id: 'basins-fill',
            type: 'fill',
            source: 'sl-basins',
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.12
            }
          });

          map.current.addLayer({
            id: 'basins-outline',
            type: 'line',
            source: 'sl-basins',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 1.5,
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

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    stations.forEach((station) => {
      const el = document.createElement('div');
      el.className = 'group relative flex items-center justify-center cursor-pointer';

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
        <div className="relative">
          <div class="w-6 h-6 rounded-full border-2 ${colorClass} shadow-lg transition-transform ${isSelected ? 'scale-125 ring-4 ring-cyan-400' : 'hover:scale-110'} flex items-center justify-center">
            <span class="w-2 h-2 rounded-full bg-white"></span>
          </div>
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900/95 border border-slate-700 text-slate-100 text-[11px] font-mono px-2.5 py-1 rounded shadow-xl whitespace-nowrap z-50">
            <strong>${station.name}</strong> (${station.current_level !== null ? station.current_level.toFixed(2) + 'm' : 'N/A'})
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
  }, [stations, selectedStation, onSelectStation]);

  useEffect(() => {
    if (selectedStation && map.current) {
      map.current.flyTo({
        center: [selectedStation.lng, selectedStation.lat],
        zoom: 9.5,
        duration: 1200
      });
    }
  }, [selectedStation]);

  return (
    <div className="relative w-full h-full min-h-[450px]">
      <div ref={mapContainer} className="w-full h-full absolute inset-0 rounded-xl overflow-hidden border border-slate-800" />
      <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 space-y-1 z-10 font-mono shadow-xl">
        <div className="font-bold text-slate-100 uppercase tracking-wider text-[10px] mb-1">Station Status</div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Normal</div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Alert Level</div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Minor Flood</div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Major Flood</div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> Offline / Stale</div>
      </div>
    </div>
  );
};
