import { HydrologySnapshotPayload, StationSnapshot } from '../src/types/hydrology';

const now = new Date();
const nowIso = now.toISOString();

const genHistory = (base: number, step = 0.05, amp = 0.2) =>
  Array.from({ length: 24 }).map((_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3600 * 1000).toISOString(),
    level: Number((base + i * step + Math.sin(i / 3) * amp).toFixed(2))
  }));

export const MOCK_STATIONS: StationSnapshot[] = [
  // 1. Kelani Ganga
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
    last_updated: nowIso,
    history_24h: genHistory(4.1, 0.06, 0.2)
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
    last_updated: nowIso,
    history_24h: genHistory(6.5, 0.1, 0.15)
  },
  {
    id: 'kelani-glencorse',
    name: 'Glencorse (Avissawella)',
    basin: 'Kelani Ganga',
    lat: 6.9572,
    lng: 80.2014,
    alert_level: 15.0,
    minor_flood_level: 16.5,
    major_flood_level: 19.0,
    current_level: 14.80,
    rate_of_change: 0.18,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(13.2, 0.07, 0.25)
  },
  {
    id: 'kelani-kitulgala',
    name: 'Kitulgala Gauge',
    basin: 'Kelani Ganga',
    lat: 6.9934,
    lng: 80.4128,
    alert_level: 3.0,
    minor_flood_level: 4.0,
    major_flood_level: 5.0,
    current_level: 2.10,
    rate_of_change: -0.05,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(2.4, -0.01, 0.1)
  },
  {
    id: 'kelani-holombuwa',
    name: 'Holombuwa Station',
    basin: 'Kelani Ganga',
    lat: 7.1852,
    lng: 80.2583,
    alert_level: 3.0,
    minor_flood_level: 4.5,
    major_flood_level: 6.0,
    current_level: 2.45,
    rate_of_change: 0.08,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(2.0, 0.02, 0.1)
  },

  // 2. Kalu Ganga
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
    last_updated: nowIso,
    history_24h: genHistory(5.8, 0.17, 0.1)
  },
  {
    id: 'kalu-putupaula',
    name: 'Putupaula Gauge',
    basin: 'Kalu Ganga',
    lat: 6.6208,
    lng: 80.1250,
    alert_level: 3.0,
    minor_flood_level: 4.0,
    major_flood_level: 5.0,
    current_level: 3.45,
    rate_of_change: 0.15,
    status: 'ALERT',
    last_updated: nowIso,
    history_24h: genHistory(2.8, 0.03, 0.15)
  },
  {
    id: 'kalu-ellagawa',
    name: 'Ellagawa Station',
    basin: 'Kalu Ganga',
    lat: 6.7410,
    lng: 80.2235,
    alert_level: 10.0,
    minor_flood_level: 11.5,
    major_flood_level: 13.0,
    current_level: 9.80,
    rate_of_change: 0.12,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(9.0, 0.04, 0.2)
  },
  {
    id: 'kalu-millakanda',
    name: 'Millakanda Gauge',
    basin: 'Kalu Ganga',
    lat: 6.6275,
    lng: 80.2458,
    alert_level: 5.0,
    minor_flood_level: 6.5,
    major_flood_level: 8.0,
    current_level: 4.90,
    rate_of_change: 0.10,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(4.2, 0.03, 0.15)
  },

  // 3. Gin Ganga
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
    last_updated: nowIso,
    history_24h: genHistory(3.1, 0.02, 0.3)
  },
  {
    id: 'gin-thawalama',
    name: 'Thawalama Gauge',
    basin: 'Gin Ganga',
    lat: 6.3385,
    lng: 80.3340,
    alert_level: 6.0,
    minor_flood_level: 7.5,
    major_flood_level: 9.0,
    current_level: 5.20,
    rate_of_change: -0.04,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(5.5, -0.01, 0.15)
  },

  // 4. Nilwala Ganga
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
    last_updated: nowIso,
    history_24h: genHistory(2.2, -0.005, 0.1)
  },
  {
    id: 'nilwala-thalgahagoda',
    name: 'Thalgahagoda Station',
    basin: 'Nilwala Ganga',
    lat: 6.0125,
    lng: 80.5312,
    alert_level: 1.4,
    minor_flood_level: 1.7,
    major_flood_level: 2.8,
    current_level: 1.30,
    rate_of_change: 0.04,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(1.1, 0.01, 0.08)
  },
  {
    id: 'nilwala-panadugama',
    name: 'Panadugama Gauge',
    basin: 'Nilwala Ganga',
    lat: 6.1245,
    lng: 80.4912,
    alert_level: 5.0,
    minor_flood_level: 6.0,
    major_flood_level: 7.5,
    current_level: 4.10,
    rate_of_change: 0.02,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(3.8, 0.01, 0.12)
  },

  // 5. Attanagalu Oya
  {
    id: 'attanagalu-dunamale',
    name: 'Dunamale Gauge',
    basin: 'Attanagalu Oya',
    lat: 7.1214,
    lng: 80.0542,
    alert_level: 3.3,
    minor_flood_level: 4.4,
    major_flood_level: 5.5,
    current_level: 3.65,
    rate_of_change: 0.22,
    status: 'ALERT',
    last_updated: nowIso,
    history_24h: genHistory(2.9, 0.03, 0.2)
  },

  // 6. Mahaweli Ganga
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
    last_updated: nowIso,
    history_24h: genHistory(11.8, 0.02, 0.5)
  },
  {
    id: 'mahaweli-nawalapitiya',
    name: 'Nawalapitiya Gauge',
    basin: 'Mahaweli Ganga',
    lat: 7.0514,
    lng: 80.5342,
    alert_level: 3.5,
    minor_flood_level: 4.5,
    major_flood_level: 6.0,
    current_level: 2.80,
    rate_of_change: 0.05,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(2.4, 0.02, 0.15)
  },
  {
    id: 'mahaweli-weragantota',
    name: 'Weragantota Station',
    basin: 'Mahaweli Ganga',
    lat: 7.3214,
    lng: 80.9856,
    alert_level: 11.0,
    minor_flood_level: 12.5,
    major_flood_level: 14.0,
    current_level: 9.50,
    rate_of_change: -0.08,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(10.2, -0.03, 0.25)
  },
  {
    id: 'mahaweli-manampitiya',
    name: 'Manampitiya Bridge',
    basin: 'Mahaweli Ganga',
    lat: 7.9125,
    lng: 81.0854,
    alert_level: 3.5,
    minor_flood_level: 4.5,
    major_flood_level: 5.5,
    current_level: 3.10,
    rate_of_change: 0.02,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(2.8, 0.01, 0.15)
  },

  // 7. Deduru Oya
  {
    id: 'deduru-ridigama',
    name: 'Ridigama Gauge',
    basin: 'Deduru Oya',
    lat: 7.5342,
    lng: 80.4721,
    alert_level: 4.0,
    minor_flood_level: 5.0,
    major_flood_level: 6.5,
    current_level: 3.20,
    rate_of_change: 0.04,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(2.9, 0.01, 0.12)
  },
  {
    id: 'deduru-moragaswewa',
    name: 'Moragaswewa (Chilaw)',
    basin: 'Deduru Oya',
    lat: 7.5912,
    lng: 79.8512,
    alert_level: 4.5,
    minor_flood_level: 5.5,
    major_flood_level: 7.0,
    current_level: 3.80,
    rate_of_change: 0.06,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(3.4, 0.015, 0.15)
  },

  // 8. Maha Oya
  {
    id: 'maha-badalgama',
    name: 'Badalgama Station',
    basin: 'Maha Oya',
    lat: 7.2912,
    lng: 79.9812,
    alert_level: 5.0,
    minor_flood_level: 6.2,
    major_flood_level: 7.8,
    current_level: 4.80,
    rate_of_change: 0.14,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(4.1, 0.03, 0.18)
  },
  {
    id: 'maha-giriulla',
    name: 'Giriulla Gauge',
    basin: 'Maha Oya',
    lat: 7.3325,
    lng: 80.1142,
    alert_level: 5.5,
    minor_flood_level: 6.8,
    major_flood_level: 8.5,
    current_level: 5.10,
    rate_of_change: 0.11,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(4.5, 0.025, 0.2)
  }
];

export const MOCK_SNAPSHOT: HydrologySnapshotPayload = {
  timestamp: nowIso,
  stations: MOCK_STATIONS,
  summary: {
    total_stations: MOCK_STATIONS.length,
    active_alerts: MOCK_STATIONS.filter(s => s.status === 'ALERT').length,
    minor_floods: MOCK_STATIONS.filter(s => s.status === 'MINOR_FLOOD').length,
    major_floods: MOCK_STATIONS.filter(s => s.status === 'MAJOR_FLOOD').length
  },
  alerts: [
    {
      id: 'alt-001',
      title: 'CRITICAL: Kalu Ganga Major Flood Warning',
      severity: 'CRITICAL',
      basin: 'Kalu Ganga',
      issued_at: nowIso,
      description: 'Water level at Ratnapura exceeded Major Flood threshold (9.5m). Downstream low-lying areas in Ratnapura and Elapatha advised to evacuate immediately.'
    },
    {
      id: 'alt-002',
      title: 'WARNING: Kelani Ganga Minor Flood Advisory',
      severity: 'WARNING',
      basin: 'Kelani Ganga',
      issued_at: new Date(Date.now() - 1800 * 1000).toISOString(),
      description: 'Rising water levels at Hanwella (8.85m) and Nagatham Street (5.45m). Minor localized inundation in Kolonnawa and Kaduwela.'
    },
    {
      id: 'alt-003',
      title: 'ALERT: Attanagalu Oya Inundation Watch',
      severity: 'ADVISORY',
      basin: 'Attanagalu Oya',
      issued_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      description: 'Water level at Dunamale reached Alert Level (3.65m). Low-lying areas of Gampaha and Ja-Ela on watch.'
    }
  ]
};
