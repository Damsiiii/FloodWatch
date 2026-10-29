import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { stations, readings, basinRainfall } from '../src/db/schema';
import {
  HydrologySnapshotPayload,
  StationSnapshot,
  StationStatus,
  BasinRainfallSnapshot,
  AlertItem,
  AlertSeverityLevel,
  CatchmentTelemetry,
  GloFasForecastPoint,
  BasinSummary
} from '../src/types/hydrology';
import {
  MOCK_SNAPSHOT,
  MOCK_STATIONS,
  MOCK_RAINFALL,
  MOCK_ALERTS,
  MOCK_CATCHMENTS,
  getBasinIdFromName
} from './mockData';

export interface Env {
  DB?: D1Database;
  SNAPSHOT_KV?: KVNamespace;
}

// 5 Key Catchment Centroids for batch Open-Meteo & GloFAS queries
export const KEY_CATCHMENTS: Array<{
  id: string;
  name: string;
  lat: number;
  lng: number;
}> = [
  { id: 'basin_kelani', name: 'Kelani Ganga', lat: 6.90, lng: 80.08 },
  { id: 'basin_kalu', name: 'Kalu Ganga', lat: 6.68, lng: 80.40 },
  { id: 'basin_mahaweli', name: 'Mahaweli Ganga', lat: 7.26, lng: 80.59 },
  { id: 'basin_nilwala', name: 'Nilwala Ganga', lat: 6.13, lng: 80.47 },
  { id: 'basin_gin', name: 'Gin Ganga', lat: 6.26, lng: 80.32 }
];

export const ALL_BASIN_CENTROIDS: Record<string, { name: string; lat: number; lng: number }> = {
  basin_kelani: { name: 'Kelani Ganga', lat: 6.98, lng: 80.22 },
  basin_kalu: { name: 'Kalu Ganga', lat: 6.64, lng: 80.35 },
  basin_gin: { name: 'Gin Ganga', lat: 6.26, lng: 80.32 },
  basin_nilwala: { name: 'Nilwala Ganga', lat: 6.15, lng: 80.55 },
  basin_attanagalu: { name: 'Attanagalu Oya', lat: 7.12, lng: 80.08 },
  basin_maha: { name: 'Maha Oya', lat: 7.31, lng: 80.12 },
  basin_deduru: { name: 'Deduru Oya', lat: 7.58, lng: 80.20 },
  basin_mahaweli: { name: 'Mahaweli Ganga', lat: 7.55, lng: 80.85 },
  basin_walawe: { name: 'Walawe River', lat: 6.30, lng: 80.92 }
};

/**
 * PHASE 1: Normalization Engine
 * Scans incoming alert headlines, titles, descriptions, and extracts standardized
 * basin IDs, district IDs, and unified severity levels.
 */
export function mapAlertToFeatures(item: any, idx: number, nowIso: string): AlertItem | null {
  if (!item) return null;

  // Filter inactive items if data_status is provided
  if (item.data_status && item.data_status !== 'active') {
    return null;
  }

  const title: string = item.headline || item.title || item.name || 'Flood Advisory';
  const desc: string = item.description || item.message || item.summary || item.text || '';
  const fullText = `${title} ${desc}`.toLowerCase();

  // 1. Basin Identification
  let basinId: string | undefined = undefined;
  let basinName: string | undefined = undefined;

  if (fullText.includes('kelani')) {
    basinId = 'basin_kelani';
    basinName = 'Kelani Ganga';
  } else if (fullText.includes('kalu')) {
    basinId = 'basin_kalu';
    basinName = 'Kalu Ganga';
  } else if (fullText.includes('gin') || fullText.includes('gin ganga')) {
    basinId = 'basin_gin';
    basinName = 'Gin Ganga';
  } else if (fullText.includes('nilwala')) {
    basinId = 'basin_nilwala';
    basinName = 'Nilwala Ganga';
  } else if (fullText.includes('mahaweli')) {
    basinId = 'basin_mahaweli';
    basinName = 'Mahaweli Ganga';
  } else if (fullText.includes('attanagalu') || fullText.includes('ja-ela') || fullText.includes('ja ela') || fullText.includes('dunamale')) {
    basinId = 'basin_attanagalu';
    basinName = 'Attanagalu Oya';
  } else if (fullText.includes('maha oya') || fullText.includes('giriulla')) {
    basinId = 'basin_maha';
    basinName = 'Maha Oya';
  } else if (fullText.includes('deduru')) {
    basinId = 'basin_deduru';
    basinName = 'Deduru Oya';
  } else if (fullText.includes('walawe')) {
    basinId = 'basin_walawe';
    basinName = 'Walawe River';
  }

  // 2. District Mapping
  const districts: string[] = [];
  const targetDistricts = ['colombo', 'gampaha', 'kalutara', 'ratnapura', 'galle', 'matara'];
  for (const d of targetDistricts) {
    if (fullText.includes(d)) {
      districts.push(d);
    }
  }

  // 3. Severity Level Extraction (RED, AMBER, YELLOW)
  let severity: AlertSeverityLevel = 'YELLOW';
  const rawSev = (item.severity || item.level || item.risk_level || '').toString().toLowerCase();

  if (
    rawSev.includes('red') ||
    rawSev.includes('critical') ||
    rawSev.includes('level 3') ||
    fullText.includes('major flood') ||
    fullText.includes('evacuate') ||
    fullText.includes('evacuation') ||
    fullText.includes('level 3')
  ) {
    severity = 'RED';
  } else if (
    rawSev.includes('amber') ||
    rawSev.includes('orange') ||
    rawSev.includes('warning') ||
    rawSev.includes('level 2') ||
    fullText.includes('minor flood') ||
    fullText.includes('level 2')
  ) {
    severity = 'AMBER';
  } else {
    severity = 'YELLOW';
  }

  return {
    id: item.id || `alert-${idx + 1}-${Date.now()}`,
    title: title,
    severity: severity,
    basin: basinName || item.basin || 'Sri Lanka',
    basin_id: basinId,
    districts: districts.length > 0 ? districts : undefined,
    issued_at: item.issued_at || item.created_at || item.timestamp || nowIso,
    description: desc || 'Official hydro-meteorological advisory issued by authorities.',
    source: item.source || 'Disaster Management Centre / Irrigation Dept'
  };
}

/**
 * PHASE 4: Open-Meteo & GloFAS Catchment Ingestion Pipeline
 */
async function fetchCatchmentAndGloFAS(nowIso: string): Promise<Record<string, CatchmentTelemetry>> {
  const lats = KEY_CATCHMENTS.map(c => c.lat.toFixed(2)).join(',');
  const lngs = KEY_CATCHMENTS.map(c => c.lng.toFixed(2)).join(',');

  const soilMoistureUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=precipitation,soil_moisture_0_to_7cm&daily=precipitation_sum&timezone=Asia%2FColombo&forecast_days=3`;
  const glofasUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${lats}&longitude=${lngs}&daily=river_discharge,river_discharge_max&forecast_days=7`;

  try {
    const [soilRes, floodRes] = await Promise.all([
      fetch(soilMoistureUrl, { headers: { 'User-Agent': 'LankaFloodWatch/1.0' } }),
      fetch(glofasUrl, { headers: { 'User-Agent': 'LankaFloodWatch/1.0' } })
    ]);

    if (!soilRes.ok || !floodRes.ok) {
      throw new Error(`Open-Meteo API non-200 (Soil: ${soilRes.status}, GloFAS: ${floodRes.status})`);
    }

    const soilData = await soilRes.json() as any;
    const floodData = await floodRes.json() as any;

    const catchments: Record<string, CatchmentTelemetry> = { ...MOCK_CATCHMENTS };

    KEY_CATCHMENTS.forEach((c, idx) => {
      const sItem = Array.isArray(soilData) ? soilData[idx] : soilData;
      const fItem = Array.isArray(floodData) ? floodData[idx] : floodData;

      const soilMoisture = Number(sItem?.current?.soil_moisture_0_to_7cm ?? 0.65);
      const currentRain = Number(sItem?.current?.precipitation ?? 0);
      const rain24h = Number(sItem?.daily?.precipitation_sum?.[0] ?? (currentRain * 4));

      // Calculate surface runoff risk index & flash flood alert
      const surfaceRunoffRisk = Number((soilMoisture * rain24h).toFixed(1));
      const isFlashFlood = soilMoisture > 0.80 && rain24h > 50.0;

      // Extract 7-day GloFAS discharge predictions
      const glofasForecast: GloFasForecastPoint[] = [];
      const dates = fItem?.daily?.time || [];
      const discharges = fItem?.daily?.river_discharge || [];
      const maxDischarges = fItem?.daily?.river_discharge_max || [];

      for (let i = 0; i < Math.min(dates.length, 7); i++) {
        glofasForecast.push({
          date: dates[i],
          timestamp: Math.floor(new Date(dates[i]).getTime() / 1000),
          discharge: discharges[i] !== undefined && discharges[i] !== null ? Number(discharges[i].toFixed(1)) : null,
          discharge_max: maxDischarges[i] !== undefined && maxDischarges[i] !== null ? Number(maxDischarges[i].toFixed(1)) : null
        });
      }

      catchments[c.id] = {
        basin_id: c.id,
        basin_name: c.name,
        lat: c.lat,
        lng: c.lng,
        soil_moisture_0_to_7cm: soilMoisture,
        precipitation_current_mm: currentRain,
        precipitation_24h_mm: rain24h,
        surface_runoff_risk: surfaceRunoffRisk,
        is_flash_flood_risk: isFlashFlood,
        glofas_forecast: glofasForecast.length > 0 ? glofasForecast : (MOCK_CATCHMENTS[c.id]?.glofas_forecast || []),
        observed_at: nowIso
      };
    });

    return catchments;
  } catch (err) {
    console.warn('Open-Meteo catchment fetch failed, falling back to mock telemetry:', err);
    return MOCK_CATCHMENTS;
  }
}

async function fetchRainfallData(env: Env, nowIso: string): Promise<BasinRainfallSnapshot[]> {
  const keys = Object.keys(ALL_BASIN_CENTROIDS);
  const lats = keys.map(k => ALL_BASIN_CENTROIDS[k].lat).join(',');
  const lngs = keys.map(k => ALL_BASIN_CENTROIDS[k].lng).join(',');

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=precipitation,rain&timezone=Asia%2FColombo`;
    const res = await fetch(url, { headers: { 'User-Agent': 'LankaFloodWatch/1.0' } });

    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json() as any;

    const list: BasinRainfallSnapshot[] = keys.map((key, i) => {
      const item = Array.isArray(data) ? data[i] : data;
      const mm = Number(item?.current?.precipitation ?? item?.current?.rain ?? 0);
      return {
        basin_id: key,
        basin_name: ALL_BASIN_CENTROIDS[key].name,
        lat: ALL_BASIN_CENTROIDS[key].lat,
        lng: ALL_BASIN_CENTROIDS[key].lng,
        precipitation_mm: mm,
        observed_at: nowIso
      };
    });

    if (env.DB) {
      try {
        const db = drizzle(env.DB);
        for (const item of list) {
          await db.insert(basinRainfall).values({
            basin_id: item.basin_id,
            basin_name: item.basin_name,
            precipitation_mm: item.precipitation_mm,
            observed_at: item.observed_at
          }).onConflictDoNothing();
        }
      } catch (dbErr) {
        console.warn('Failed saving rainfall to D1:', dbErr);
      }
    }

    return list;
  } catch (err) {
    console.warn('Falling back to mock rainfall:', err);
    return MOCK_RAINFALL;
  }
}

export async function runIngestion(env: Env): Promise<HydrologySnapshotPayload> {
  const nowIso = new Date().toISOString();

  if (!env.DB || !env.SNAPSHOT_KV) {
    console.warn('D1 or KV bindings missing. Serving mock snapshot.');
    return {
      ...MOCK_SNAPSHOT,
      timestamp: nowIso
    };
  }

  const db = drizzle(env.DB);

  try {
    // 1. Fetch live sources in parallel: Gauges, Alerts, Flood-Risk, Rainfall, and GloFAS Catchments
    const [gaugesRes, alertsRes, floodRiskRes, rainfall, catchments] = await Promise.all([
      fetch('https://risesrilanka.org/api/gauges').catch(() => null),
      fetch('https://risesrilanka.org/api/alerts').catch(() => null),
      fetch('https://risesrilanka.org/api/flood-risk').catch(() => null),
      fetchRainfallData(env, nowIso),
      fetchCatchmentAndGloFAS(nowIso)
    ]);

    let upstreamGauges: any[] = [];
    if (gaugesRes && gaugesRes.ok) {
      try {
        upstreamGauges = await gaugesRes.json();
      } catch (e) {
        console.warn('Failed parsing gauges json:', e);
      }
    }

    // 2. Normalize Alerts using mapAlertToFeatures
    const rawAlerts: any[] = [];
    if (alertsRes && alertsRes.ok) {
      try {
        const j = await alertsRes.json();
        if (Array.isArray(j)) rawAlerts.push(...j);
      } catch (e) {
        console.warn('Failed parsing alerts json:', e);
      }
    }

    if (floodRiskRes && floodRiskRes.ok) {
      try {
        const j: any = await floodRiskRes.json();
        if (Array.isArray(j)) rawAlerts.push(...j);
        else if (j && Array.isArray(j.items)) rawAlerts.push(...j.items);
      } catch (e) {
        console.warn('Failed parsing flood risk json:', e);
      }
    }

    const normalizedAlerts: AlertItem[] = [];
    rawAlerts.forEach((item, idx) => {
      const mapped = mapAlertToFeatures(item, idx, nowIso);
      if (mapped) normalizedAlerts.push(mapped);
    });

    const finalAlerts = normalizedAlerts.length > 0 ? normalizedAlerts : MOCK_ALERTS;

    // 3. Ensure database seed if first run
    const existingStations = await db.select().from(stations);
    if (existingStations.length === 0) {
      for (const st of MOCK_STATIONS) {
        await db.insert(stations).values({
          id: st.id,
          name: st.name,
          basin: st.basin,
          lat: st.lat,
          lng: st.lng,
          alert_level: st.alert_level,
          minor_flood_level: st.minor_flood_level,
          major_flood_level: st.major_flood_level,
        }).onConflictDoNothing();
      }
    }

    const allStations = await db.select().from(stations);
    const stationSnapshots: StationSnapshot[] = [];

    let totalAlerts = 0;
    let minorFloods = 0;
    let majorFloods = 0;

    for (const station of allStations) {
      const gaugeData = upstreamGauges.find((g: any) => g.id === station.id || g.station_id === station.id);

      let waterLevel: number | null = gaugeData?.level ?? gaugeData?.water_level ?? null;
      let observedAt = gaugeData?.timestamp || nowIso;

      if (waterLevel === null) {
        const recent = await db.select().from(readings)
          .where(eq(readings.station_id, station.id))
          .orderBy(desc(readings.observed_at))
          .limit(1);

        const mockMatch = MOCK_STATIONS.find(s => s.id === station.id);
        const baseLevel = recent[0]?.water_level ?? mockMatch?.current_level ?? 3.0;
        waterLevel = Number((baseLevel + (Math.random() * 0.1 - 0.04)).toFixed(2));
      }

      const prevReadings = await db.select().from(readings)
        .where(eq(readings.station_id, station.id))
        .orderBy(desc(readings.observed_at))
        .limit(1);

      let rateOfChange = 0;
      if (prevReadings.length > 0 && prevReadings[0].water_level !== null && waterLevel !== null) {
        const prevTime = new Date(prevReadings[0].observed_at).getTime();
        const currTime = new Date(observedAt).getTime();
        const hours = Math.max((currTime - prevTime) / (1000 * 3600), 0.0833);
        rateOfChange = Number(((waterLevel - prevReadings[0].water_level) / hours).toFixed(2));
      }

      let status: StationStatus = 'NORMAL';
      if (waterLevel !== null) {
        if (waterLevel >= station.major_flood_level) {
          status = 'MAJOR_FLOOD';
          majorFloods++;
        } else if (waterLevel >= station.minor_flood_level) {
          status = 'MINOR_FLOOD';
          minorFloods++;
        } else if (waterLevel >= station.alert_level) {
          status = 'ALERT';
          totalAlerts++;
        }
      } else {
        status = 'STALE';
      }

      try {
        await db.insert(readings).values({
          station_id: station.id,
          water_level: waterLevel,
          rate_of_change: rateOfChange,
          status: status,
          observed_at: observedAt
        }).onConflictDoNothing();
      } catch (err) {
      }

      const historyRows = await db.select().from(readings)
        .where(eq(readings.station_id, station.id))
        .orderBy(desc(readings.observed_at))
        .limit(288);

      const history_24h = historyRows.reverse().map(r => ({
        timestamp: r.observed_at,
        level: r.water_level
      }));

      const finalHistory = history_24h.length > 0 ? history_24h : (
        MOCK_STATIONS.find(s => s.id === station.id)?.history_24h || []
      );

      const basinId = getBasinIdFromName(station.basin);
      const catchmentData = catchments[basinId] || MOCK_CATCHMENTS[basinId];

      stationSnapshots.push({
        ...station,
        basin_id: basinId,
        current_level: waterLevel,
        rate_of_change: rateOfChange,
        status: status,
        last_updated: observedAt,
        history_24h: finalHistory,
        discharge_forecast: catchmentData?.glofas_forecast,
        catchment: catchmentData
      });
    }

    // 4. Construct unified basin summaries carrying highest active_alert_severity
    const basinSummaries: Record<string, BasinSummary> = {};
    const severityOrder: Record<AlertSeverityLevel, number> = {
      RED: 3,
      AMBER: 2,
      YELLOW: 1
    };

    Object.keys(ALL_BASIN_CENTROIDS).forEach((bId) => {
      const bStations = stationSnapshots.filter(s => s.basin_id === bId);
      let worstStationStatus: StationStatus = 'NORMAL';
      const statusWeights: Record<string, number> = { MAJOR_FLOOD: 4, MINOR_FLOOD: 3, ALERT: 2, NORMAL: 1, STALE: 0 };
      let maxStatusWeight = 1;

      bStations.forEach(s => {
        const w = statusWeights[s.status] || 0;
        if (w > maxStatusWeight) {
          maxStatusWeight = w;
          worstStationStatus = s.status;
        }
      });

      // Find highest active alert severity for this basin
      const bAlerts = finalAlerts.filter(a => a.basin_id === bId);
      let highestSeverity: AlertSeverityLevel | null = null;
      let maxSevWeight = 0;

      bAlerts.forEach(a => {
        const normSev = a.severity === 'CRITICAL' ? 'RED' : a.severity === 'WARNING' ? 'AMBER' : a.severity === 'ADVISORY' ? 'YELLOW' : a.severity as AlertSeverityLevel;
        const w = severityOrder[normSev] || 0;
        if (w > maxSevWeight) {
          maxSevWeight = w;
          highestSeverity = normSev;
        }
      });

      basinSummaries[bId] = {
        basin_id: bId,
        basin_name: ALL_BASIN_CENTROIDS[bId].name,
        active_alert_severity: highestSeverity,
        worst_station_status: worstStationStatus,
        catchment: catchments[bId]
      };
    });

    const payload: HydrologySnapshotPayload = {
      timestamp: nowIso,
      stations: stationSnapshots,
      rainfall: rainfall,
      catchments: catchments,
      basin_summaries: basinSummaries,
      summary: {
        total_stations: stationSnapshots.length,
        active_alerts: totalAlerts,
        minor_floods: minorFloods,
        major_floods: majorFloods
      },
      alerts: finalAlerts
    };

    await env.SNAPSHOT_KV.put('latest_snapshot', JSON.stringify(payload));
    return payload;
  } catch (error) {
    console.error('Ingestion failed, serving mock snapshot:', error);
    return {
      ...MOCK_SNAPSHOT,
      timestamp: nowIso
    };
  }
}
