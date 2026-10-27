import { HydrologySnapshotPayload, StationSnapshot } from '../src/types/hydrology';

export const MOCK_STATIONS: StationSnapshot[] = [
  {
    id: 'kelani-nagatham',
    name: 'Nagatham Street (Kelani)',
    basin: 'Kelani Ganga',
    lat: 6.9535,
    lng: 79.8821,
    alert_level: 4.0,
    minor_flood_level: 5.0,
    major_flood_level: 7.0,
    current_level: 5.45,
    rate_of_change: 0.28,
    status: 'MINOR_FLOOD',
    last_updated: new Date().toISOString(),
    history_24h: Array.from({ length: 24 }).map((_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600 * 1000).toISOString(),
      level: Number((4.1 + (i * 0.06) + (Math.sin(i / 3) * 0.2)).toFixed(2))
    }))
  },
  {
    id: 'kelani-hanwella',
    name: 'Hanwella Gauge',
    basin: 'Kelani Ganga',
    lat: 6.9011,
    lng: 80.0833,
    alert_level: 7.0,
    minor_flood_level: 8.5,
    major_flood_level: 10.0,
    current_level: 8.85,
    rate_of_change: 0.42,
    status: 'MINOR_FLOOD',
    last_updated: new Date().toISOString(),
    history_24h: Array.from({ length: 24 }).map((_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600 * 1000).toISOString(),
      level: Number((6.5 + (i * 0.1) + (Math.cos(i / 2) * 0.15)).toFixed(2))
    }))
  },
  {
    id: 'kalu-ratnapura',
    name: 'Ratnapura Town (Kalu)',
    basin: 'Kalu Ganga',
    lat: 6.6828,
    lng: 80.3992,
    alert_level: 5.2,
    minor_flood_level: 7.5,
    major_flood_level: 9.5,
    current_level: 9.82,
    rate_of_change: 0.65,
    status: 'MAJOR_FLOOD',
    last_updated: new Date().toISOString(),
    history_24h: Array.from({ length: 24 }).map((_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600 * 1000).toISOString(),
      level: Number((5.8 + (i * 0.17)).toFixed(2))
    }))
  },
  {
    id: 'gin-baddegama',
    name: 'Baddegama Station',
    basin: 'Gin Ganga',
    lat: 6.1860,
    lng: 80.1812,
    alert_level: 3.5,
    minor_flood_level: 4.0,
    major_flood_level: 5.0,
    current_level: 3.75,
    rate_of_change: 0.05,
    status: 'ALERT',
    last_updated: new Date().toISOString(),
    history_24h: Array.from({ length: 24 }).map((_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600 * 1000).toISOString(),
      level: Number((3.1 + Math.sin(i / 4) * 0.4).toFixed(2))
    }))
  },
  {
    id: 'nilwala-pitabeddara',
    name: 'Pitabeddara Gauge',
    basin: 'Nilwala Ganga',
    lat: 6.2084,
    lng: 80.4578,
    alert_level: 4.0,
    minor_flood_level: 5.0,
    major_flood_level: 6.5,
    current_level: 2.10,
    rate_of_change: -0.02,
    status: 'NORMAL',
    last_updated: new Date().toISOString(),
    history_24h: Array.from({ length: 24 }).map((_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600 * 1000).toISOString(),
      level: Number((2.2 - (i * 0.005)).toFixed(2))
    }))
  },
  {
    id: 'mahaweli-peradeniya',
    name: 'Peradeniya Bridge',
    basin: 'Mahaweli Ganga',
    lat: 7.2662,
    lng: 80.5973,
    alert_level: 15.0,
    minor_flood_level: 18.0,
    major_flood_level: 21.0,
    current_level: 12.40,
    rate_of_change: 0.10,
    status: 'NORMAL',
    last_updated: new Date().toISOString(),
    history_24h: Array.from({ length: 24 }).map((_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600 * 1000).toISOString(),
      level: Number((11.8 + Math.sin(i / 5) * 0.5).toFixed(2))
    }))
  }
];

export const MOCK_SNAPSHOT: HydrologySnapshotPayload = {
  timestamp: new Date().toISOString(),
  stations: MOCK_STATIONS,
  summary: {
    total_stations: MOCK_STATIONS.length,
    active_alerts: 1,
    minor_floods: 2,
    major_floods: 1
  },
  alerts: [
    {
      id: 'alt-001',
      title: 'CRITICAL: Kalu Ganga Major Flood Warning',
      severity: 'CRITICAL',
      basin: 'Kalu Ganga',
      issued_at: new Date().toISOString(),
      description: 'Water level at Ratnapura exceeded Major Flood threshold (9.5m). Residents in downstream low-lying areas advised to evacuate immediately.'
    },
    {
      id: 'alt-002',
      title: 'WARNING: Kelani Ganga Minor Inundation Advisory',
      severity: 'WARNING',
      basin: 'Kelani Ganga',
      issued_at: new Date(Date.now() - 1800 * 1000).toISOString(),
      description: 'Rising water levels observed at Hanwella and Nagatham Street. Minor localized flooding expected in Kolonnawa and Kaduwela.'
    }
  ]
};
