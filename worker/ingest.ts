import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { stations, readings, basinRainfall } from '../src/db/schema';
import { HydrologySnapshotPayload, StationSnapshot, StationStatus, BasinRainfallSnapshot } from '../src/types/hydrology';
import { MOCK_SNAPSHOT, MOCK_STATIONS, MOCK_RAINFALL } from './mockData';

export interface Env {
  DB?: D1Database;
  SNAPSHOT_KV?: KVNamespace;
}

const BASIN_CENTROIDS: Record<string, { name: string; lat: number; lng: number }> = {
  kelani: { name: 'Kelani Ganga', lat: 6.98, lng: 80.22 },
  kalu: { name: 'Kalu Ganga', lat: 6.64, lng: 80.35 },
  gin: { name: 'Gin Ganga', lat: 6.26, lng: 80.32 },
  nilwala: { name: 'Nilwala Ganga', lat: 6.15, lng: 80.55 },
  attanagalu: { name: 'Attanagalu Oya', lat: 7.12, lng: 80.08 },
  maha: { name: 'Maha Oya', lat: 7.31, lng: 80.12 },
  deduru: { name: 'Deduru Oya', lat: 7.58, lng: 80.20 },
  mahaweli: { name: 'Mahaweli Ganga', lat: 7.55, lng: 80.85 }
};

async function fetchRainfallData(env: Env, nowIso: string): Promise<BasinRainfallSnapshot[]> {
  const keys = Object.keys(BASIN_CENTROIDS);
  const lats = keys.map(k => BASIN_CENTROIDS[k].lat).join(',');
  const lngs = keys.map(k => BASIN_CENTROIDS[k].lng).join(',');

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
        basin_name: BASIN_CENTROIDS[key].name,
        lat: BASIN_CENTROIDS[key].lat,
        lng: BASIN_CENTROIDS[key].lng,
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
    console.warn('D1 or KV bindings missing. Falling back to mock data snapshot update.');
    const snapshot: HydrologySnapshotPayload = {
      ...MOCK_SNAPSHOT,
      timestamp: nowIso
    };
    return snapshot;
  }

  const db = drizzle(env.DB);

  try {
    const [gaugesRes, alertsRes, rainfall] = await Promise.all([
      fetch('https://risesrilanka.org/api/gauges').catch(() => null),
      fetch('https://risesrilanka.org/api/alerts').catch(() => null),
      fetchRainfallData(env, nowIso)
    ]);

    let upstreamGauges: any[] = [];
    if (gaugesRes && gaugesRes.ok) {
      try {
        upstreamGauges = await gaugesRes.json();
      } catch (e) {
        console.warn('Failed parsing gauges json:', e);
      }
    }

    let upstreamAlerts: any[] = [];
    if (alertsRes && alertsRes.ok) {
      try {
        upstreamAlerts = await alertsRes.json();
      } catch (e) {
        console.warn('Failed parsing alerts json:', e);
      }
    }

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

      stationSnapshots.push({
        ...station,
        current_level: waterLevel,
        rate_of_change: rateOfChange,
        status: status,
        last_updated: observedAt,
        history_24h: finalHistory
      });
    }

    const payload: HydrologySnapshotPayload = {
      timestamp: nowIso,
      stations: stationSnapshots,
      rainfall: rainfall,
      summary: {
        total_stations: stationSnapshots.length,
        active_alerts: totalAlerts,
        minor_floods: minorFloods,
        major_floods: majorFloods
      },
      alerts: upstreamAlerts.length > 0 ? upstreamAlerts : MOCK_SNAPSHOT.alerts
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
