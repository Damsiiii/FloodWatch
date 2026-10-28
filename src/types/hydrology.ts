export type StationStatus = 'NORMAL' | 'ALERT' | 'MINOR_FLOOD' | 'MAJOR_FLOOD' | 'STALE';

export interface Station {
  id: string;
  name: string;
  basin: string;
  lat: number;
  lng: number;
  alert_level: number;
  minor_flood_level: number;
  major_flood_level: number;
}

export interface Reading {
  id?: number;
  station_id: string;
  water_level: number | null;
  rate_of_change: number; // units/hour (e.g. m/hr)
  status: StationStatus;
  observed_at: string; // ISO-8601
}

export interface BasinRainfallSnapshot {
  basin_id: string;
  basin_name: string;
  lat: number;
  lng: number;
  precipitation_mm: number;
  observed_at: string;
}

export interface StationSnapshot extends Station {
  current_level: number | null;
  rate_of_change: number;
  status: StationStatus;
  last_updated: string;
  history_24h: Array<{
    timestamp: string;
    level: number | null;
  }>;
}

export interface HydrologySnapshotPayload {
  timestamp: string;
  stations: StationSnapshot[];
  rainfall?: BasinRainfallSnapshot[];
  summary: {
    total_stations: number;
    active_alerts: number;
    minor_floods: number;
    major_floods: number;
  };
  alerts: Array<{
    id: string;
    title: string;
    severity: 'WARNING' | 'CRITICAL' | 'ADVISORY';
    basin: string;
    issued_at: string;
    description: string;
  }>;
}
