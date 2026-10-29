import { HydrologySnapshotPayload, StationSnapshot, CatchmentTelemetry, BasinRainfallSnapshot, AlertItem, AlertSeverityLevel, BasinSummary } from '../src/types/hydrology';

const now = new Date();
const nowIso = now.toISOString();

export function getBasinIdFromName(basinName: string): string {
  const b = (basinName || '').toLowerCase();
  if (b.includes('kelani')) return 'basin_kelani';
  if (b.includes('kalu')) return 'basin_kalu';
  if (b.includes('gin')) return 'basin_gin';
  if (b.includes('nilwala')) return 'basin_nilwala';
  if (b.includes('attanagalu')) return 'basin_attanagalu';
  if (b.includes('maha')) return 'basin_maha';
  if (b.includes('deduru')) return 'basin_deduru';
  if (b.includes('mahaweli')) return 'basin_mahaweli';
  if (b.includes('walawe')) return 'basin_walawe';
  return 'basin_kelani';
}

const genHistory = (base: number, step = 0.05, amp = 0.2) =>
  Array.from({ length: 24 }).map((_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3600 * 1000).toISOString(),
    level: Number((base + i * step + Math.sin(i / 3) * amp).toFixed(2))
  }));

const genGlofasForecast = (baseDischarge: number, peakDay: number = 2) => {
  const points = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() + i * 86400 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const factor = Math.exp(-Math.pow(i - peakDay, 2) / 4);
    const discharge = Number((baseDischarge * (1 + factor * 1.4)).toFixed(1));
    const discharge_max = Number((discharge * 1.25).toFixed(1));
    points.push({
      date: dateStr,
      timestamp: Math.floor(d.getTime() / 1000),
      discharge,
      discharge_max
    });
  }
  return points;
};

export const MOCK_CATCHMENTS: Record<string, CatchmentTelemetry> = {
  basin_kelani: {
    basin_id: 'basin_kelani',
    basin_name: 'Kelani Ganga',
    lat: 6.90,
    lng: 80.08,
    soil_moisture_0_to_7cm: 0.85,
    precipitation_current_mm: 18.5,
    precipitation_24h_mm: 62.0,
    surface_runoff_risk: Number((0.85 * 62.0).toFixed(1)), // 52.7 -> Flash flood warning
    is_flash_flood_risk: true,
    glofas_forecast: genGlofasForecast(420, 2),
    observed_at: nowIso
  },
  basin_kalu: {
    basin_id: 'basin_kalu',
    basin_name: 'Kalu Ganga',
    lat: 6.68,
    lng: 80.40,
    soil_moisture_0_to_7cm: 0.88,
    precipitation_current_mm: 26.0,
    precipitation_24h_mm: 78.0,
    surface_runoff_risk: Number((0.88 * 78.0).toFixed(1)), // 68.6 -> Major Flash flood warning
    is_flash_flood_risk: true,
    glofas_forecast: genGlofasForecast(590, 1),
    observed_at: nowIso
  },
  basin_gin: {
    basin_id: 'basin_gin',
    basin_name: 'Gin Ganga',
    lat: 6.26,
    lng: 80.32,
    soil_moisture_0_to_7cm: 0.65,
    precipitation_current_mm: 12.0,
    precipitation_24h_mm: 32.0,
    surface_runoff_risk: Number((0.65 * 32.0).toFixed(1)),
    is_flash_flood_risk: false,
    glofas_forecast: genGlofasForecast(180, 3),
    observed_at: nowIso
  },
  basin_nilwala: {
    basin_id: 'basin_nilwala',
    basin_name: 'Nilwala Ganga',
    lat: 6.13,
    lng: 80.47,
    soil_moisture_0_to_7cm: 0.58,
    precipitation_current_mm: 5.5,
    precipitation_24h_mm: 16.0,
    surface_runoff_risk: Number((0.58 * 16.0).toFixed(1)),
    is_flash_flood_risk: false,
    glofas_forecast: genGlofasForecast(140, 4),
    observed_at: nowIso
  },
  basin_mahaweli: {
    basin_id: 'basin_mahaweli',
    basin_name: 'Mahaweli Ganga',
    lat: 7.26,
    lng: 80.59,
    soil_moisture_0_to_7cm: 0.62,
    precipitation_current_mm: 8.0,
    precipitation_24h_mm: 24.0,
    surface_runoff_risk: Number((0.62 * 24.0).toFixed(1)),
    is_flash_flood_risk: false,
    glofas_forecast: genGlofasForecast(650, 3),
    observed_at: nowIso
  },
  basin_attanagalu: {
    basin_id: 'basin_attanagalu',
    basin_name: 'Attanagalu Oya',
    lat: 7.12,
    lng: 80.08,
    soil_moisture_0_to_7cm: 0.76,
    precipitation_current_mm: 14.0,
    precipitation_24h_mm: 42.0,
    surface_runoff_risk: Number((0.76 * 42.0).toFixed(1)),
    is_flash_flood_risk: false,
    glofas_forecast: genGlofasForecast(85, 2),
    observed_at: nowIso
  },
  basin_maha: {
    basin_id: 'basin_maha',
    basin_name: 'Maha Oya',
    lat: 7.31,
    lng: 80.12,
    soil_moisture_0_to_7cm: 0.52,
    precipitation_current_mm: 8.4,
    precipitation_24h_mm: 22.0,
    surface_runoff_risk: Number((0.52 * 22.0).toFixed(1)),
    is_flash_flood_risk: false,
    glofas_forecast: genGlofasForecast(110, 4),
    observed_at: nowIso
  },
  basin_deduru: {
    basin_id: 'basin_deduru',
    basin_name: 'Deduru Oya',
    lat: 7.58,
    lng: 80.20,
    soil_moisture_0_to_7cm: 0.44,
    precipitation_current_mm: 2.1,
    precipitation_24h_mm: 8.0,
    surface_runoff_risk: Number((0.44 * 8.0).toFixed(1)),
    is_flash_flood_risk: false,
    glofas_forecast: genGlofasForecast(160, 5),
    observed_at: nowIso
  },
  basin_walawe: {
    basin_id: 'basin_walawe',
    basin_name: 'Walawe River',
    lat: 6.30,
    lng: 80.92,
    soil_moisture_0_to_7cm: 0.42,
    precipitation_current_mm: 1.5,
    precipitation_24h_mm: 6.0,
    surface_runoff_risk: Number((0.42 * 6.0).toFixed(1)),
    is_flash_flood_risk: false,
    glofas_forecast: genGlofasForecast(190, 5),
    observed_at: nowIso
  }
};

export const MOCK_STATIONS: StationSnapshot[] = [
  // 1. Kelani Ganga
  {
    id: 'kelani-nagatham',
    name: 'Nagatham Street (Kelani)',
    basin: 'Kelani Ganga',
    basin_id: 'basin_kelani',
    lat: 6.9535,
    lng: 79.8821,
    alert_level: 4.0,
    minor_flood_level: 5.0,
    major_flood_level: 7.0,
    current_level: 5.45,
    rate_of_change: 0.28,
    status: 'MINOR_FLOOD',
    last_updated: nowIso,
    history_24h: genHistory(4.1, 0.06, 0.2),
    discharge_forecast: MOCK_CATCHMENTS.basin_kelani.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_kelani
  },
  {
    id: 'kelani-hanwella',
    name: 'Hanwella Gauge',
    basin: 'Kelani Ganga',
    basin_id: 'basin_kelani',
    lat: 6.9011,
    lng: 80.0833,
    alert_level: 7.0,
    minor_flood_level: 8.5,
    major_flood_level: 10.0,
    current_level: 8.85,
    rate_of_change: 0.42,
    status: 'MINOR_FLOOD',
    last_updated: nowIso,
    history_24h: genHistory(6.5, 0.1, 0.15),
    discharge_forecast: MOCK_CATCHMENTS.basin_kelani.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_kelani
  },
  {
    id: 'kelani-glencorse',
    name: 'Glencorse (Avissawella)',
    basin: 'Kelani Ganga',
    basin_id: 'basin_kelani',
    lat: 6.9572,
    lng: 80.2014,
    alert_level: 15.0,
    minor_flood_level: 16.5,
    major_flood_level: 19.0,
    current_level: 14.80,
    rate_of_change: 0.18,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(13.2, 0.07, 0.25),
    discharge_forecast: MOCK_CATCHMENTS.basin_kelani.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_kelani
  },
  {
    id: 'kelani-kitulgala',
    name: 'Kitulgala Gauge',
    basin: 'Kelani Ganga',
    basin_id: 'basin_kelani',
    lat: 6.9934,
    lng: 80.4128,
    alert_level: 3.0,
    minor_flood_level: 4.0,
    major_flood_level: 5.0,
    current_level: 2.10,
    rate_of_change: -0.05,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(2.4, -0.01, 0.1),
    discharge_forecast: MOCK_CATCHMENTS.basin_kelani.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_kelani
  },
  {
    id: 'kelani-holombuwa',
    name: 'Holombuwa Station',
    basin: 'Kelani Ganga',
    basin_id: 'basin_kelani',
    lat: 7.1852,
    lng: 80.2583,
    alert_level: 3.0,
    minor_flood_level: 4.5,
    major_flood_level: 6.0,
    current_level: 2.45,
    rate_of_change: 0.08,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(2.1, 0.01, 0.1),
    discharge_forecast: MOCK_CATCHMENTS.basin_kelani.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_kelani
  },

  // 2. Kalu Ganga
  {
    id: 'kalu-ratnapura',
    name: 'Ratnapura Town Gauge',
    basin: 'Kalu Ganga',
    basin_id: 'basin_kalu',
    lat: 6.6828,
    lng: 80.4034,
    alert_level: 7.5,
    minor_flood_level: 8.5,
    major_flood_level: 9.5,
    current_level: 9.72,
    rate_of_change: 0.35,
    status: 'MAJOR_FLOOD',
    last_updated: nowIso,
    history_24h: genHistory(7.2, 0.11, 0.18),
    discharge_forecast: MOCK_CATCHMENTS.basin_kalu.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_kalu
  },
  {
    id: 'kalu-ellagawa',
    name: 'Ellagawa (Kiriella)',
    basin: 'Kalu Ganga',
    basin_id: 'basin_kalu',
    lat: 6.7025,
    lng: 80.2541,
    alert_level: 10.0,
    minor_flood_level: 11.5,
    major_flood_level: 13.0,
    current_level: 11.95,
    rate_of_change: 0.22,
    status: 'MINOR_FLOOD',
    last_updated: nowIso,
    history_24h: genHistory(9.5, 0.1, 0.2),
    discharge_forecast: MOCK_CATCHMENTS.basin_kalu.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_kalu
  },
  {
    id: 'kalu-millakanda',
    name: 'Millakanda (Bulathsinhala)',
    basin: 'Kalu Ganga',
    basin_id: 'basin_kalu',
    lat: 6.6412,
    lng: 80.1923,
    alert_level: 6.0,
    minor_flood_level: 8.0,
    major_flood_level: 9.5,
    current_level: 8.40,
    rate_of_change: 0.15,
    status: 'MINOR_FLOOD',
    last_updated: nowIso,
    history_24h: genHistory(6.8, 0.07, 0.15),
    discharge_forecast: MOCK_CATCHMENTS.basin_kalu.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_kalu
  },
  {
    id: 'kalu-putupaula',
    name: 'Putupaula (Horana)',
    basin: 'Kalu Ganga',
    basin_id: 'basin_kalu',
    lat: 6.6015,
    lng: 80.1124,
    alert_level: 3.0,
    minor_flood_level: 4.0,
    major_flood_level: 5.0,
    current_level: 4.15,
    rate_of_change: 0.12,
    status: 'MINOR_FLOOD',
    last_updated: nowIso,
    history_24h: genHistory(3.2, 0.04, 0.1),
    discharge_forecast: MOCK_CATCHMENTS.basin_kalu.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_kalu
  },
  {
    id: 'kalu-magura',
    name: 'Maguru Ganga Gauge',
    basin: 'Kalu Ganga',
    basin_id: 'basin_kalu',
    lat: 6.5742,
    lng: 80.2618,
    alert_level: 4.0,
    minor_flood_level: 6.0,
    major_flood_level: 7.5,
    current_level: 3.80,
    rate_of_change: 0.05,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(3.4, 0.02, 0.1),
    discharge_forecast: MOCK_CATCHMENTS.basin_kalu.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_kalu
  },

  // 3. Gin Ganga
  {
    id: 'gin-thawalama',
    name: 'Thawalama Station',
    basin: 'Gin Ganga',
    basin_id: 'basin_gin',
    lat: 6.3214,
    lng: 80.3645,
    alert_level: 4.0,
    minor_flood_level: 6.0,
    major_flood_level: 7.5,
    current_level: 4.85,
    rate_of_change: 0.18,
    status: 'ALERT',
    last_updated: nowIso,
    history_24h: genHistory(3.8, 0.04, 0.15),
    discharge_forecast: MOCK_CATCHMENTS.basin_gin.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_gin
  },
  {
    id: 'gin-baddegama',
    name: 'Baddegama Gauge',
    basin: 'Gin Ganga',
    basin_id: 'basin_gin',
    lat: 6.1245,
    lng: 80.2214,
    alert_level: 3.5,
    minor_flood_level: 4.0,
    major_flood_level: 5.0,
    current_level: 3.75,
    rate_of_change: 0.14,
    status: 'ALERT',
    last_updated: nowIso,
    history_24h: genHistory(2.8, 0.04, 0.15),
    discharge_forecast: MOCK_CATCHMENTS.basin_gin.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_gin
  },
  {
    id: 'gin-agaliya',
    name: 'Agaliya Gauge',
    basin: 'Gin Ganga',
    basin_id: 'basin_gin',
    lat: 6.1824,
    lng: 80.2612,
    alert_level: 3.0,
    minor_flood_level: 4.0,
    major_flood_level: 5.0,
    current_level: 2.70,
    rate_of_change: 0.05,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(2.3, 0.02, 0.1),
    discharge_forecast: MOCK_CATCHMENTS.basin_gin.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_gin
  },

  // 4. Nilwala Ganga
  {
    id: 'nilwala-pitabeddara',
    name: 'Pitabeddara Station',
    basin: 'Nilwala Ganga',
    basin_id: 'basin_nilwala',
    lat: 6.2612,
    lng: 80.5514,
    alert_level: 4.0,
    minor_flood_level: 5.0,
    major_flood_level: 6.5,
    current_level: 3.20,
    rate_of_change: 0.04,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(2.9, 0.01, 0.1),
    discharge_forecast: MOCK_CATCHMENTS.basin_nilwala.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_nilwala
  },
  {
    id: 'nilwala-akuressa',
    name: 'Akuressa (Urawa) Gauge',
    basin: 'Nilwala Ganga',
    basin_id: 'basin_nilwala',
    lat: 6.1845,
    lng: 80.4812,
    alert_level: 6.0,
    minor_flood_level: 7.5,
    major_flood_level: 8.5,
    current_level: 5.10,
    rate_of_change: 0.06,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(4.6, 0.02, 0.15),
    discharge_forecast: MOCK_CATCHMENTS.basin_nilwala.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_nilwala
  },
  {
    id: 'nilwala-panadugama',
    name: 'Panadugama Gauge',
    basin: 'Nilwala Ganga',
    basin_id: 'basin_nilwala',
    lat: 6.1124,
    lng: 80.4912,
    alert_level: 5.0,
    minor_flood_level: 6.0,
    major_flood_level: 7.5,
    current_level: 4.40,
    rate_of_change: 0.08,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(3.9, 0.02, 0.15),
    discharge_forecast: MOCK_CATCHMENTS.basin_nilwala.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_nilwala
  },

  // 5. Attanagalu Oya
  {
    id: 'attanagalu-dunamale',
    name: 'Dunamale Gauge',
    basin: 'Attanagalu Oya',
    basin_id: 'basin_attanagalu',
    lat: 7.1245,
    lng: 80.0812,
    alert_level: 3.3,
    minor_flood_level: 4.4,
    major_flood_level: 5.5,
    current_level: 3.65,
    rate_of_change: 0.15,
    status: 'ALERT',
    last_updated: nowIso,
    history_24h: genHistory(2.7, 0.04, 0.15),
    discharge_forecast: MOCK_CATCHMENTS.basin_attanagalu.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_attanagalu
  },

  // 6. Maha Oya
  {
    id: 'maha-giriulla',
    name: 'Giriulla Gauge',
    basin: 'Maha Oya',
    basin_id: 'basin_maha',
    lat: 7.3214,
    lng: 80.1512,
    alert_level: 5.5,
    minor_flood_level: 6.5,
    major_flood_level: 7.5,
    current_level: 4.20,
    rate_of_change: 0.08,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(3.7, 0.02, 0.1),
    discharge_forecast: MOCK_CATCHMENTS.basin_maha.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_maha
  },

  // 7. Deduru Oya
  {
    id: 'deduru-moragaswewa',
    name: 'Moragaswewa (Deduru Oya)',
    basin: 'Deduru Oya',
    basin_id: 'basin_deduru',
    lat: 7.5812,
    lng: 80.2014,
    alert_level: 4.0,
    minor_flood_level: 5.0,
    major_flood_level: 6.0,
    current_level: 2.80,
    rate_of_change: 0.02,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(2.6, 0.01, 0.1),
    discharge_forecast: MOCK_CATCHMENTS.basin_deduru.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_deduru
  },

  // 8. Mahaweli Ganga
  {
    id: 'mahaweli-peradeniya',
    name: 'Peradeniya Gauge',
    basin: 'Mahaweli Ganga',
    basin_id: 'basin_mahaweli',
    lat: 7.2612,
    lng: 80.5912,
    alert_level: 12.0,
    minor_flood_level: 15.0,
    major_flood_level: 18.0,
    current_level: 8.50,
    rate_of_change: 0.10,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(7.9, 0.02, 0.15),
    discharge_forecast: MOCK_CATCHMENTS.basin_mahaweli.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_mahaweli
  },
  {
    id: 'mahaweli-weragantota',
    name: 'Weragantota Gauge',
    basin: 'Mahaweli Ganga',
    basin_id: 'basin_mahaweli',
    lat: 7.6812,
    lng: 81.0214,
    alert_level: 11.0,
    minor_flood_level: 13.0,
    major_flood_level: 15.0,
    current_level: 9.10,
    rate_of_change: 0.05,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(8.6, 0.02, 0.1),
    discharge_forecast: MOCK_CATCHMENTS.basin_mahaweli.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_mahaweli
  },
  {
    id: 'mahaweli-manampitiya',
    name: 'Manampitiya Bridge',
    basin: 'Mahaweli Ganga',
    basin_id: 'basin_mahaweli',
    lat: 8.1012,
    lng: 81.1014,
    alert_level: 3.5,
    minor_flood_level: 4.5,
    major_flood_level: 5.5,
    current_level: 2.90,
    rate_of_change: 0.02,
    status: 'NORMAL',
    last_updated: nowIso,
    history_24h: genHistory(2.7, 0.01, 0.1),
    discharge_forecast: MOCK_CATCHMENTS.basin_mahaweli.glofas_forecast,
    catchment: MOCK_CATCHMENTS.basin_mahaweli
  }
];

export const MOCK_RAINFALL: BasinRainfallSnapshot[] = [
  { basin_id: 'basin_kelani', basin_name: 'Kelani Ganga', lat: 6.98, lng: 80.22, precipitation_mm: 18.5, observed_at: nowIso },
  { basin_id: 'basin_kalu', basin_name: 'Kalu Ganga', lat: 6.64, lng: 80.35, precipitation_mm: 26.0, observed_at: nowIso },
  { basin_id: 'basin_gin', basin_name: 'Gin Ganga', lat: 6.26, lng: 80.32, precipitation_mm: 12.0, observed_at: nowIso },
  { basin_id: 'basin_nilwala', basin_name: 'Nilwala Ganga', lat: 6.15, lng: 80.55, precipitation_mm: 5.5, observed_at: nowIso },
  { basin_id: 'basin_attanagalu', basin_name: 'Attanagalu Oya', lat: 7.12, lng: 80.08, precipitation_mm: 14.0, observed_at: nowIso },
  { basin_id: 'basin_maha', basin_name: 'Maha Oya', lat: 7.31, lng: 80.12, precipitation_mm: 8.4, observed_at: nowIso },
  { basin_id: 'basin_deduru', basin_name: 'Deduru Oya', lat: 7.58, lng: 80.20, precipitation_mm: 2.1, observed_at: nowIso },
  { basin_id: 'basin_mahaweli', basin_name: 'Mahaweli Ganga', lat: 7.55, lng: 80.85, precipitation_mm: 8.0, observed_at: nowIso },
  { basin_id: 'basin_walawe', basin_name: 'Walawe River', lat: 6.30, lng: 80.92, precipitation_mm: 1.5, observed_at: nowIso }
];

export const MOCK_ALERTS: AlertItem[] = [
  {
    id: 'alt-001',
    title: 'Major Flood Warning: Kalu Ganga Basin',
    severity: 'RED',
    basin: 'Kalu Ganga',
    basin_id: 'basin_kalu',
    districts: ['ratnapura', 'kalutara'],
    issued_at: nowIso,
    description: 'Water level at Ratnapura Town gauge exceeded Major Flood threshold (9.5m). Downstream low-lying areas in Ratnapura, Elapatha, Kiriella and Millakanda advised to evacuate immediately.',
    source: 'DMC / Dept. of Irrigation'
  },
  {
    id: 'alt-002',
    title: 'Minor Flood Advisory: Kelani Ganga Lower Reach',
    severity: 'AMBER',
    basin: 'Kelani Ganga',
    basin_id: 'basin_kelani',
    districts: ['colombo', 'gampaha'],
    issued_at: new Date(Date.now() - 1800 * 1000).toISOString(),
    description: 'Rising water levels at Hanwella (8.85m) and Nagatham Street (5.45m). Inundation in low-lying areas of Kolonnawa, Biyagama, Kaduwela, and Sedawatta.',
    source: 'DMC / Dept. of Irrigation'
  },
  {
    id: 'alt-003',
    title: 'Inundation Watch: Attanagalu Oya Basin',
    severity: 'YELLOW',
    basin: 'Attanagalu Oya',
    basin_id: 'basin_attanagalu',
    districts: ['gampaha'],
    issued_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    description: 'Water level at Dunamale reached Alert Level (3.65m). Low-lying areas of Gampaha, Minuwangoda, and Ja-Ela on active watch.',
    source: 'DMC'
  }
];

export const MOCK_BASIN_SUMMARIES: Record<string, BasinSummary> = {
  basin_kelani: {
    basin_id: 'basin_kelani',
    basin_name: 'Kelani Ganga',
    active_alert_severity: 'AMBER',
    worst_station_status: 'MINOR_FLOOD',
    catchment: MOCK_CATCHMENTS.basin_kelani
  },
  basin_kalu: {
    basin_id: 'basin_kalu',
    basin_name: 'Kalu Ganga',
    active_alert_severity: 'RED',
    worst_station_status: 'MAJOR_FLOOD',
    catchment: MOCK_CATCHMENTS.basin_kalu
  },
  basin_gin: {
    basin_id: 'basin_gin',
    basin_name: 'Gin Ganga',
    active_alert_severity: null,
    worst_station_status: 'ALERT',
    catchment: MOCK_CATCHMENTS.basin_gin
  },
  basin_nilwala: {
    basin_id: 'basin_nilwala',
    basin_name: 'Nilwala Ganga',
    active_alert_severity: null,
    worst_station_status: 'NORMAL',
    catchment: MOCK_CATCHMENTS.basin_nilwala
  },
  basin_attanagalu: {
    basin_id: 'basin_attanagalu',
    basin_name: 'Attanagalu Oya',
    active_alert_severity: 'YELLOW',
    worst_station_status: 'ALERT',
    catchment: MOCK_CATCHMENTS.basin_attanagalu
  },
  basin_maha: {
    basin_id: 'basin_maha',
    basin_name: 'Maha Oya',
    active_alert_severity: null,
    worst_station_status: 'NORMAL',
    catchment: MOCK_CATCHMENTS.basin_maha
  },
  basin_deduru: {
    basin_id: 'basin_deduru',
    basin_name: 'Deduru Oya',
    active_alert_severity: null,
    worst_station_status: 'NORMAL',
    catchment: MOCK_CATCHMENTS.basin_deduru
  },
  basin_mahaweli: {
    basin_id: 'basin_mahaweli',
    basin_name: 'Mahaweli Ganga',
    active_alert_severity: null,
    worst_station_status: 'NORMAL',
    catchment: MOCK_CATCHMENTS.basin_mahaweli
  },
  basin_walawe: {
    basin_id: 'basin_walawe',
    basin_name: 'Walawe River',
    active_alert_severity: null,
    worst_station_status: 'NORMAL',
    catchment: MOCK_CATCHMENTS.basin_walawe
  }
};

export const MOCK_SNAPSHOT: HydrologySnapshotPayload = {
  timestamp: nowIso,
  stations: MOCK_STATIONS,
  rainfall: MOCK_RAINFALL,
  catchments: MOCK_CATCHMENTS,
  basin_summaries: MOCK_BASIN_SUMMARIES,
  summary: {
    total_stations: MOCK_STATIONS.length,
    active_alerts: MOCK_STATIONS.filter(s => s.status === 'ALERT').length,
    minor_floods: MOCK_STATIONS.filter(s => s.status === 'MINOR_FLOOD').length,
    major_floods: MOCK_STATIONS.filter(s => s.status === 'MAJOR_FLOOD').length
  },
  alerts: MOCK_ALERTS
};
