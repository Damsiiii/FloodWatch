export type StationStatus = 'NORMAL' | 'ALERT' | 'MINOR_FLOOD' | 'MAJOR_FLOOD' | 'STALE';
export type AlertSeverityLevel = 'RED' | 'AMBER' | 'YELLOW';

export interface Station {
  id: string;
  name: string;
  basin: string;
  basin_id?: string;
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

export interface GloFasForecastPoint {
  date: string;
  timestamp: number; // unix timestamp in seconds
  discharge: number | null;
  discharge_max: number | null;
}

export interface CatchmentTelemetry {
  basin_id: string;
  basin_name: string;
  lat: number;
  lng: number;
  soil_moisture_0_to_7cm: number;
  precipitation_current_mm: number;
  precipitation_24h_mm: number;
  surface_runoff_risk: number; // soil_moisture * precipitation_24h
  is_flash_flood_risk: boolean;
  glofas_forecast: GloFasForecastPoint[];
  observed_at: string;
}

export interface AlertItem {
  id: string;
  title: string;
  severity: AlertSeverityLevel | 'CRITICAL' | 'WARNING' | 'ADVISORY';
  basin?: string;
  basin_id?: string;
  districts?: string[];
  issued_at: string;
  description: string;
  source?: string;
}

export interface BasinSummary {
  basin_id: string;
  basin_name: string;
  active_alert_severity: AlertSeverityLevel | null;
  worst_station_status: StationStatus;
  catchment?: CatchmentTelemetry;
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
  discharge_forecast?: GloFasForecastPoint[];
  catchment?: CatchmentTelemetry;
}

export interface HydrologySnapshotPayload {
  timestamp: string;
  stations: StationSnapshot[];
  rainfall?: BasinRainfallSnapshot[];
  catchments?: Record<string, CatchmentTelemetry>;
  basin_summaries?: Record<string, BasinSummary>;
  summary: {
    total_stations: number;
    active_alerts: number;
    minor_floods: number;
    major_floods: number;
  };
  alerts: AlertItem[];
}
