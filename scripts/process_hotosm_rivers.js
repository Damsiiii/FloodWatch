const fs = require('fs');
const readline = require('readline');
const path = require('path');

const RIVERS_FILTER = [
  {
    river_id: "basin_kelani",
    name: "Kelani River",
    basin_name: "Kelani Ganga",
    regex: /kelani/i,
    minLat: 6.85, maxLat: 7.20, minLng: 79.85, maxLng: 80.65
  },
  {
    river_id: "basin_kalu",
    name: "Kalu River",
    basin_name: "Kalu Ganga",
    // Matches "Kalu Ganga", "Kaluganga", "Kalu River" and "Maguru Ganga"
    regex: /kalu\s?ganga|kalu\s?river|maguru\s?ganga/i,
    minLat: 6.45, maxLat: 6.85, minLng: 79.92, maxLng: 80.75
  },
  {
    river_id: "basin_gin",
    name: "Gin River",
    basin_name: "Gin Ganga",
    regex: /gin\s?ganga|gin\s?river/i,
    minLat: 6.02, maxLat: 6.50, minLng: 80.15, maxLng: 80.60
  },
  {
    river_id: "basin_nilwala",
    name: "Nilwala River",
    basin_name: "Nilwala Ganga",
    regex: /nilwala/i,
    minLat: 5.92, maxLat: 6.40, minLng: 80.40, maxLng: 80.75
  },
  {
    river_id: "basin_attanagalu",
    name: "Attanagalu Oya",
    basin_name: "Attanagalu Oya",
    regex: /attanagalu|ja.?ela|dandugam/i,
    minLat: 7.02, maxLat: 7.28, minLng: 79.85, maxLng: 80.30
  },
  {
    river_id: "basin_maha",
    name: "Maha Oya",
    basin_name: "Maha Oya",
    regex: /maha\s?oya/i,
    minLat: 7.15, maxLat: 7.45, minLng: 79.82, maxLng: 80.55
  },
  {
    river_id: "basin_deduru",
    name: "Deduru Oya",
    basin_name: "Deduru Oya",
    regex: /deduru\s?oya/i,
    minLat: 7.45, maxLat: 7.80, minLng: 79.75, maxLng: 80.65
  },
  {
    river_id: "basin_mahaweli",
    name: "Mahaweli River",
    basin_name: "Mahaweli Ganga",
    regex: /mahaweli/i,
    minLat: 6.80, maxLat: 8.55, minLng: 80.45, maxLng: 81.35
  },
  {
    river_id: "basin_walawe",
    name: "Walawe River",
    basin_name: "Walawe River",
    regex: /walawe/i,
    minLat: 6.05, maxLat: 6.78, minLng: 80.70, maxLng: 81.10
  }
];

// Perpendicular distance squared between point p and segment (v, w)
function sqDistToSegment(p, v, w) {
  const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2;
  if (l2 === 0) return (p[0] - v[0]) ** 2 + (p[1] - v[1]) ** 2;
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p[0] - (v[0] + t * (w[0] - v[0]))) ** 2 + (p[1] - (v[1] + t * (w[1] - v[1]))) ** 2;
}

// Douglas-Peucker simplification
function simplifyPoints(points, sqTolerance = 0.0000003) {
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

// Stitch fragmented LineString segments into continuous ordered river flow lines
function stitchSegments(segments) {
  if (segments.length === 0) return [];

  let pool = segments.map(s => s.map(pt => [Number(pt[0].toFixed(5)), Number(pt[1].toFixed(5))])).filter(s => s.length >= 2);
  const chains = [];

  while (pool.length > 0) {
    let currentChain = pool.shift();
    let extended = true;

    while (extended) {
      extended = false;
      const head = currentChain[0];
      const tail = currentChain[currentChain.length - 1];

      for (let i = 0; i < pool.length; i++) {
        const seg = pool[i];
        const sHead = seg[0];
        const sTail = seg[seg.length - 1];

        const dTailToSHead = Math.hypot(tail[0] - sHead[0], tail[1] - sHead[1]);
        const dTailToSTail = Math.hypot(tail[0] - sTail[0], tail[1] - sTail[1]);
        const dHeadToSTail = Math.hypot(head[0] - sTail[0], head[1] - sTail[1]);
        const dHeadToSHead = Math.hypot(head[0] - sHead[0], head[1] - sHead[1]);

        const THRESHOLD = 0.05; // ~5km bridge/culvert gap tolerance

        if (dTailToSHead < THRESHOLD) {
          currentChain = currentChain.concat(seg.slice(1));
          pool.splice(i, 1);
          extended = true;
          break;
        } else if (dTailToSTail < THRESHOLD) {
          currentChain = currentChain.concat(seg.slice().reverse().slice(1));
          pool.splice(i, 1);
          extended = true;
          break;
        } else if (dHeadToSTail < THRESHOLD) {
          currentChain = seg.slice(0, -1).concat(currentChain);
          pool.splice(i, 1);
          extended = true;
          break;
        } else if (dHeadToSHead < THRESHOLD) {
          currentChain = seg.slice().reverse().slice(0, -1).concat(currentChain);
          pool.splice(i, 1);
          extended = true;
          break;
        }
      }
    }

    chains.push(currentChain);
  }

  chains.sort((a, b) => b.length - a.length);
  return chains;
}

async function processWaterways() {
  console.log("Reading waterways.geojson from HOTOSM with refined basin geographic filters...");
  const riverBuckets = {};
  RIVERS_FILTER.forEach(r => { riverBuckets[r.river_id] = []; });

  const fileStream = fs.createReadStream('scripts/waterways.geojson', { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{ "type": "Feature"')) continue;

    let clean = trimmed;
    if (clean.endsWith(',')) clean = clean.slice(0, -1);

    try {
      const feature = JSON.parse(clean);
      const props = feature.properties || {};
      const geom = feature.geometry;

      if (!geom || geom.type !== 'LineString') continue;

      const nameCombined = `${props.name || ''} ${props.name_en || ''} ${props.name_si || ''} ${props.name_ta || ''}`;
      if (!nameCombined.trim()) continue;

      for (const r of RIVERS_FILTER) {
        if (r.regex.test(nameCombined)) {
          // Bounding box filter to eliminate distant naming duplicates
          const firstPt = geom.coordinates[0];
          if (firstPt[0] >= r.minLng && firstPt[0] <= r.maxLng && firstPt[1] >= r.minLat && firstPt[1] <= r.maxLat) {
            riverBuckets[r.river_id].push(geom.coordinates);
            break;
          }
        }
      }
    } catch (e) {
    }
  }

  const finalFeatures = [];

  for (const r of RIVERS_FILTER) {
    const segs = riverBuckets[r.river_id];
    console.log(`\nProcessing ${r.name} (${r.river_id}): found ${segs.length} matching surveyed segments`);

    if (segs.length > 0) {
      const chains = stitchSegments(segs);
      const primaryChains = chains.slice(0, 2);

      primaryChains.forEach((pts, idx) => {
        const simplified = simplifyPoints(pts, 0.0000003);
        finalFeatures.push({
          type: "Feature",
          properties: {
            river_id: r.river_id,
            name: idx === 0 ? r.name : `${r.name} (Reach ${idx + 1})`,
            basin_name: r.basin_name,
            reach: idx === 0 ? "Mainstem" : "Tributary",
            source: "OpenStreetMap Survey-Grade",
            vertex_count: simplified.length
          },
          geometry: {
            type: "LineString",
            coordinates: simplified
          }
        });
        console.log(` -> Reach ${idx + 1}: ${simplified.length} vertices (from ${pts.length} raw points)`);
      });
    }
  }

  const outGeoJson = {
    type: "FeatureCollection",
    features: finalFeatures
  };

  const outPath = path.join(__dirname, '..', 'public', 'geo', 'sl-rivers.geojson');
  fs.writeFileSync(outPath, JSON.stringify(outGeoJson, null, 2), 'utf8');

  const stat = fs.statSync(outPath);
  console.log(`\n======================================================`);
  console.log(`SUCCESS: Full OpenStreetMap river geometries extracted.`);
  console.log(`File: ${outPath} (${(stat.size / 1024).toFixed(2)} KB, ${finalFeatures.length} river reaches)`);
  console.log(`======================================================`);
}

processWaterways();
