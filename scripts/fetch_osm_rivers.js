const fs = require('fs');
const path = require('path');

// Target rivers with their regex matcher and associated basin ID
const RIVERS_CONFIG = [
  { river_id: "basin_kelani", name: "Kelani River", basin_name: "Kelani Ganga", regex: "Kelani", bbox: "6.8,79.8,7.2,80.7" },
  { river_id: "basin_kalu", name: "Kalu River", basin_name: "Kalu Ganga", regex: "Kalu", bbox: "6.4,79.9,6.85,80.8" },
  { river_id: "basin_gin", name: "Gin River", basin_name: "Gin Ganga", regex: "Gin", bbox: "6.0,80.1,6.5,80.6" },
  { river_id: "basin_nilwala", name: "Nilwala River", basin_name: "Nilwala Ganga", regex: "Nilwala", bbox: "5.9,80.3,6.4,80.8" },
  { river_id: "basin_attanagalu", name: "Attanagalu Oya", basin_name: "Attanagalu Oya", regex: "Attanagalu|Ja.Ela|Dandugam", bbox: "7.0,79.8,7.3,80.3" },
  { river_id: "basin_maha", name: "Maha Oya", basin_name: "Maha Oya", regex: "Maha Oya", bbox: "7.15,79.8,7.45,80.6" },
  { river_id: "basin_deduru", name: "Deduru Oya", basin_name: "Deduru Oya", regex: "Deduru", bbox: "7.4,79.7,7.8,80.6" },
  { river_id: "basin_mahaweli", name: "Mahaweli River", basin_name: "Mahaweli Ganga", regex: "Mahaweli", bbox: "6.8,80.4,8.6,81.4" },
  { river_id: "basin_walawe", name: "Walawe River", basin_name: "Walawe River", regex: "Walawe", bbox: "6.0,80.6,6.8,81.1" }
];

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

async function queryOverpass(query) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'User-Agent': 'LankaFloodWatch/1.0 (contact: hydro@floodwatch.lk)',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'data=' + encodeURIComponent(query)
      });
      if (res.ok) {
        return await res.json();
      }
      console.warn(`[${endpoint}] returned HTTP ${res.status}`);
    } catch (e) {
      console.warn(`[${endpoint}] error: ${e.message}`);
    }
  }
  return null;
}

// Perpendicular distance squared between point p and line segment (v, w)
function sqDistToSegment(p, v, w) {
  const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2;
  if (l2 === 0) return (p[0] - v[0]) ** 2 + (p[1] - v[1]) ** 2;
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p[0] - (v[0] + t * (w[0] - v[0]))) ** 2 + (p[1] - (v[1] + t * (w[1] - v[1]))) ** 2;
}

// Douglas-Peucker simplification algorithm
function simplifyPoints(points, sqTolerance = 0.00000025) { // ~5-10m precision
  if (points.length <= 2) return points;

  let maxSqDist = 0;
  let index = 0;
  const last = points.length - 1;

  for (let i = 1; i < last; i++) {
    const sqDist = sqDistToSegment(points[i], points[0], points[last]);
    if (sqDist > maxSqDist) {
      maxSqDist = sqDist;
      index = i;
    }
  }

  if (maxSqDist > sqTolerance) {
    const left = simplifyPoints(points.slice(0, index + 1), sqTolerance);
    const right = simplifyPoints(points.slice(index), sqTolerance);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [points[0], points[last]];
  }
}

// Stitch multiple disconnected/fragmented OSM ways into continuous ordered linestrings
function stitchWays(ways) {
  if (ways.length === 0) return [];

  // Convert each way into a list of [lng, lat]
  let segments = ways.map(w => w.geometry.map(pt => [Number(pt.lon.toFixed(5)), Number(pt.lat.toFixed(5))])).filter(s => s.length >= 2);
  if (segments.length === 0) return [];

  const chains = [];

  while (segments.length > 0) {
    let currentChain = segments.shift();
    let extended = true;

    while (extended) {
      extended = false;
      const head = currentChain[0];
      const tail = currentChain[currentChain.length - 1];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const sHead = seg[0];
        const sTail = seg[seg.length - 1];

        const dTailToSHead = Math.hypot(tail[0] - sHead[0], tail[1] - sHead[1]);
        const dTailToSTail = Math.hypot(tail[0] - sTail[0], tail[1] - sTail[1]);
        const dHeadToSTail = Math.hypot(head[0] - sTail[0], head[1] - sTail[1]);
        const dHeadToSHead = Math.hypot(head[0] - sHead[0], head[1] - sHead[1]);

        const THRESHOLD = 0.03; // ~3km tolerance between fragments/weirs

        if (dTailToSHead < THRESHOLD) {
          currentChain = currentChain.concat(seg.slice(1));
          segments.splice(i, 1);
          extended = true;
          break;
        } else if (dTailToSTail < THRESHOLD) {
          currentChain = currentChain.concat(seg.slice().reverse().slice(1));
          segments.splice(i, 1);
          extended = true;
          break;
        } else if (dHeadToSTail < THRESHOLD) {
          currentChain = seg.slice(0, -1).concat(currentChain);
          segments.splice(i, 1);
          extended = true;
          break;
        } else if (dHeadToSHead < THRESHOLD) {
          currentChain = seg.slice().reverse().slice(0, -1).concat(currentChain);
          segments.splice(i, 1);
          extended = true;
          break;
        }
      }
    }

    chains.push(currentChain);
  }

  // Sort chains by point length descending; the longest chain is usually the main river channel
  chains.sort((a, b) => b.length - a.length);
  return chains;
}

async function run() {
  console.log("Starting accurate OSM river extraction...");
  const geojsonFeatures = [];

  for (const cfg of RIVERS_CONFIG) {
    console.log(`\nFetching ${cfg.name} (${cfg.river_id})...`);
    const q = `[out:json][timeout:25];
(
  way["waterway"~"river|stream"]["name"~"${cfg.regex}",i](${cfg.bbox});
  relation["waterway"="river"]["name"~"${cfg.regex}",i](${cfg.bbox});
);
out geom;`;

    const data = await queryOverpass(q);
    let ways = [];

    if (data && data.elements) {
      for (const el of data.elements) {
        if (el.type === 'way' && el.geometry && el.geometry.length >= 2) {
          ways.push(el);
        } else if (el.type === 'relation' && el.members) {
          for (const m of el.members) {
            if (m.type === 'way' && m.geometry && m.geometry.length >= 2) {
              ways.push(m);
            }
          }
        }
      }
    }

    console.log(`Found ${ways.length} segments for ${cfg.name}`);

    if (ways.length > 0) {
      const chains = stitchWays(ways);
      // Take the primary mainstem and any major tributary chain
      const primaryChains = chains.slice(0, 2);

      primaryChains.forEach((pts, idx) => {
        const simplified = simplifyPoints(pts, 0.0000003); // keep true meanders without noise
        geojsonFeatures.push({
          type: "Feature",
          properties: {
            river_id: cfg.river_id,
            name: idx === 0 ? cfg.name : `${cfg.name} (Reach ${idx + 1})`,
            basin_name: cfg.basin_name,
            reach: idx === 0 ? "Mainstem" : "Tributary",
            source: "OpenStreetMap Survey"
          },
          geometry: {
            type: "LineString",
            coordinates: simplified
          }
        });
        console.log(` -> Stitched reach ${idx + 1}: ${simplified.length} vertices (from ${pts.length} raw points)`);
      });
    } else {
      console.warn(`Could not fetch OSM for ${cfg.name}, keeping fallback`);
    }

    // Friendly delay between requests to stay within Overpass rate limits
    await new Promise(r => setTimeout(r, 1500));
  }

  if (geojsonFeatures.length >= 5) {
    const finalGeoJson = {
      type: "FeatureCollection",
      features: geojsonFeatures
    };

    const outPath = path.join(__dirname, '..', 'public', 'geo', 'sl-rivers.geojson');
    fs.writeFileSync(outPath, JSON.stringify(finalGeoJson, null, 2), 'utf8');
    const sz = fs.statSync(outPath).size / 1024;
    console.log(`\nSuccessfully wrote OSM accurate rivers to ${outPath} (${sz.toFixed(2)} KB, ${geojsonFeatures.length} features)`);
  } else {
    console.error("\nFailed to extract sufficient river segments from Overpass. Aborting overwrite.");
  }
}

run();
