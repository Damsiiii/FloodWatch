const fs = require('fs');
const readline = require('readline');
const path = require('path');

const BASIN_SPECS = [
  {
    river_id: "basin_kelani",
    name: "Kelani River",
    basin_name: "Kelani Ganga",
    regex: /kelani|sitawaka|kehelgamu|maskeliya/i,
    minLat: 6.80, maxLat: 7.20, minLng: 79.85, maxLng: 80.65,
    mouth: [79.8699, 6.9791]
  },
  {
    river_id: "basin_kalu",
    name: "Kalu River",
    basin_name: "Kalu Ganga",
    regex: /kalu\s?ganga|kalu\s?river|kuda\s?ga[n]?ga|maguru\s?ganga|kuru\s?ganga/i,
    minLat: 6.45, maxLat: 6.85, minLng: 79.92, maxLng: 80.75,
    mouth: [79.9562, 6.5881]
  },
  {
    river_id: "basin_gin",
    name: "Gin River",
    basin_name: "Gin Ganga",
    regex: /gin\s?ganga|gin\s?river/i,
    minLat: 6.02, maxLat: 6.50, minLng: 80.15, maxLng: 80.60,
    mouth: [80.1916, 6.1028]
  },
  {
    river_id: "basin_nilwala",
    name: "Nilwala River",
    basin_name: "Nilwala Ganga",
    regex: /nilwala|urubokka|kirama/i,
    minLat: 5.92, maxLat: 6.40, minLng: 80.40, maxLng: 80.75,
    mouth: [80.4885, 5.9850]
  },
  {
    river_id: "basin_attanagalu",
    name: "Attanagalu Oya",
    basin_name: "Attanagalu Oya",
    regex: /attanagalu|attanagalla|ja.?ela|da[n]?dugam|uruwal|kuganavila/i,
    minLat: 7.00, maxLat: 7.28, minLng: 79.85, maxLng: 80.30,
    mouth: [79.8650, 7.1050]
  },
  {
    river_id: "basin_maha",
    name: "Maha Oya",
    basin_name: "Maha Oya",
    regex: /maha\s?oya|kandepola/i,
    minLat: 7.15, maxLat: 7.45, minLng: 79.82, maxLng: 80.55,
    mouth: [79.8427, 7.2725]
  },
  {
    river_id: "basin_deduru",
    name: "Deduru Oya",
    basin_name: "Deduru Oya",
    regex: /deduru\s?oya|kimbulwana|hakwatuna/i,
    minLat: 7.45, maxLat: 7.80, minLng: 79.75, maxLng: 80.65,
    mouth: [79.7936, 7.6101]
  },
  {
    river_id: "basin_mahaweli",
    name: "Mahaweli River",
    basin_name: "Mahaweli Ganga",
    regex: /mahaweli|kotmale|amban|badulu|kuda\s?oya/i,
    minLat: 6.80, maxLat: 8.55, minLng: 80.45, maxLng: 81.35,
    mouth: [81.2164, 8.4299]
  },
  {
    river_id: "basin_walawe",
    name: "Walawe River",
    basin_name: "Walawe River",
    regex: /walawe|belihul\s?oya|mau\s?ara/i,
    minLat: 6.05, maxLat: 6.78, minLng: 80.70, maxLng: 81.10,
    mouth: [81.0505, 6.1066]
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
  let maxSqDist = 0, index = 0;
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

// Stitch segment coordinates with given threshold
function stitchSegments(segments, threshold = 0.08) {
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

      let bestIdx = -1;
      let bestDist = Infinity;
      let bestMode = '';

      for (let i = 0; i < pool.length; i++) {
        const seg = pool[i];
        const sHead = seg[0];
        const sTail = seg[seg.length - 1];

        const dTailToSHead = Math.hypot(tail[0] - sHead[0], tail[1] - sHead[1]);
        const dTailToSTail = Math.hypot(tail[0] - sTail[0], tail[1] - sTail[1]);
        const dHeadToSTail = Math.hypot(head[0] - sTail[0], head[1] - sTail[1]);
        const dHeadToSHead = Math.hypot(head[0] - sHead[0], head[1] - sHead[1]);

        const m = Math.min(dTailToSHead, dTailToSTail, dHeadToSTail, dHeadToSHead);
        if (m < threshold && m < bestDist) {
          bestDist = m;
          bestIdx = i;
          if (m === dTailToSHead) bestMode = 'tail-head';
          else if (m === dTailToSTail) bestMode = 'tail-tail';
          else if (m === dHeadToSTail) bestMode = 'head-tail';
          else bestMode = 'head-head';
        }
      }

      if (bestIdx >= 0) {
        const seg = pool[bestIdx];
        if (bestMode === 'tail-head') {
          currentChain = currentChain.concat(seg.slice(1));
        } else if (bestMode === 'tail-tail') {
          currentChain = currentChain.concat(seg.slice().reverse().slice(1));
        } else if (bestMode === 'head-tail') {
          currentChain = seg.slice(0, -1).concat(currentChain);
        } else if (bestMode === 'head-head') {
          currentChain = seg.slice().reverse().slice(0, -1).concat(currentChain);
        }
        pool.splice(bestIdx, 1);
        extended = true;
      }
    }

    chains.push(currentChain);
  }

  // Sort longest chain first
  chains.sort((a, b) => b.length - a.length);
  return chains;
}

// Bridge remaining gap between consecutive disjoint sections of a river
function bridgeChains(chain1, chain2, maxBridgeDist = 0.3) {
  const p1_start = chain1[0], p1_end = chain1[chain1.length - 1];
  const p2_start = chain2[0], p2_end = chain2[chain2.length - 1];

  const d_ee = Math.hypot(p1_end[0] - p2_start[0], p1_end[1] - p2_start[1]);
  const d_es = Math.hypot(p1_end[0] - p2_end[0], p1_end[1] - p2_end[1]);
  const d_se = Math.hypot(p1_start[0] - p2_start[0], p1_start[1] - p2_start[1]);
  const d_ss = Math.hypot(p1_start[0] - p2_end[0], p1_start[1] - p2_end[1]);

  const minDist = Math.min(d_ee, d_es, d_se, d_ss);
  if (minDist > maxBridgeDist) return null; // Too far apart to be the same stem

  // Join them smoothly
  if (minDist === d_ee) {
    return chain1.concat(chain2);
  } else if (minDist === d_es) {
    return chain1.concat(chain2.slice().reverse());
  } else if (minDist === d_se) {
    return chain2.concat(chain1);
  } else {
    return chain2.slice().reverse().concat(chain1);
  }
}

async function processAll() {
  console.log("Reading waterways.geojson from HOTOSM...");
  const rawSegments = {};
  const unnamedSegments = {};
  BASIN_SPECS.forEach(b => {
    rawSegments[b.river_id] = [];
    unnamedSegments[b.river_id] = [];
  });

  const fileStream = fs.createReadStream('scripts/waterways.geojson', { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.includes('"type": "Feature"')) continue;
    let clean = line.trim();
    if (clean.endsWith(',')) clean = clean.slice(0, -1);
    try {
      const feature = JSON.parse(clean);
      const props = feature.properties || {};
      const geom = feature.geometry;
      if (!geom || geom.type !== 'LineString') continue;

      const nameCombined = `${props.name || ''} ${props.name_en || ''} ${props.name_si || ''} ${props.name_ta || ''}`;
      const firstPt = geom.coordinates[0];

      for (const b of BASIN_SPECS) {
        if (firstPt[0] >= b.minLng && firstPt[0] <= b.maxLng && firstPt[1] >= b.minLat && firstPt[1] <= b.maxLat) {
          if (b.regex.test(nameCombined)) {
            rawSegments[b.river_id].push(geom.coordinates);
            break;
          } else if (props.waterway === 'river' || (props.waterway === 'stream' && !props.name)) {
            unnamedSegments[b.river_id].push(geom.coordinates);
          }
        }
      }
    } catch(e) {}
  }

  const finalFeatures = [];

  for (const b of BASIN_SPECS) {
    const namedSegs = rawSegments[b.river_id];
    const unnamedSegs = unnamedSegments[b.river_id];
    console.log(`\n=================================================`);
    console.log(`Basin: ${b.name} (${b.river_id})`);
    console.log(`  Named segments: ${namedSegs.length}`);
    console.log(`  Candidate unnamed/stream segments: ${unnamedSegs.length}`);

    // Step 1: Initial stitch of named segments
    let chains = stitchSegments(namedSegs, 0.05);
    console.log(`  Initial chains from named segments: ${chains.length}`);

    // Step 2: Absorb unnamed segments that touch or are very close (< 0.02 deg ~ 2.2km) to current chains
    let currentChains = chains;
    const pool = unnamedSegs.slice();
    let absorbedCount = 0;

    for (let pass = 0; pass < 2; pass++) {
      for (let i = pool.length - 1; i >= 0; i--) {
        const seg = pool[i];
        const sHead = seg[0];
        const sTail = seg[seg.length - 1];

        let matchedChain = -1;
        let matchMode = '';
        const ABSORB_DIST = 0.02;

        for (let c = 0; c < currentChains.length; c++) {
          const ch = currentChains[c];
          const cHead = ch[0];
          const cTail = ch[ch.length - 1];

          if (Math.hypot(cTail[0] - sHead[0], cTail[1] - sHead[1]) < ABSORB_DIST) {
            matchedChain = c; matchMode = 'tail-head'; break;
          } else if (Math.hypot(cTail[0] - sTail[0], cTail[1] - sTail[1]) < ABSORB_DIST) {
            matchedChain = c; matchMode = 'tail-tail'; break;
          } else if (Math.hypot(cHead[0] - sTail[0], cHead[1] - sTail[1]) < ABSORB_DIST) {
            matchedChain = c; matchMode = 'head-tail'; break;
          } else if (Math.hypot(cHead[0] - sHead[0], cHead[1] - sHead[1]) < ABSORB_DIST) {
            matchedChain = c; matchMode = 'head-head'; break;
          }
        }

        if (matchedChain >= 0) {
          if (matchMode === 'tail-head') currentChains[matchedChain] = currentChains[matchedChain].concat(seg);
          else if (matchMode === 'tail-tail') currentChains[matchedChain] = currentChains[matchedChain].concat(seg.slice().reverse());
          else if (matchMode === 'head-tail') currentChains[matchedChain] = seg.concat(currentChains[matchedChain]);
          else if (matchMode === 'head-head') currentChains[matchedChain] = seg.slice().reverse().concat(currentChains[matchedChain]);
          pool.splice(i, 1);
          absorbedCount++;
        }
      }
    }
    console.log(`  Absorbed ${absorbedCount} connecting segments`);

    // Step 3: Re-stitch with 0.08 deg (~8.8km) tolerance to bridge dams / local culverts
    currentChains = stitchSegments(currentChains, 0.08);

    // Step 4: Bridge remaining gap between top 2 mainstem segments if separated by reservoir (e.g. Udawalawe / Deduru / Attanagalu)
    if (currentChains.length >= 2) {
      const merged = bridgeChains(currentChains[0], currentChains[1], 0.28); // up to ~30km for huge reservoirs
      if (merged) {
        console.log(`  Successfully bridged reservoir gap between Mainstem Reach 1 and Reach 2! (Length: ${merged.length})`);
        currentChains = [merged].concat(currentChains.slice(2));
      }
    }

    // Keep primary mainstem and any major tributary (at most 2 reaches total)
    const exportChains = currentChains.slice(0, 2);

    exportChains.forEach((pts, idx) => {
      // Ensure orientation: headwaters -> ocean mouth
      const startPt = pts[0];
      const endPt = pts[pts.length - 1];
      const dStartToMouth = Math.hypot(startPt[0] - b.mouth[0], startPt[1] - b.mouth[1]);
      const dEndToMouth = Math.hypot(endPt[0] - b.mouth[0], endPt[1] - b.mouth[1]);

      let oriented = pts;
      if (dStartToMouth < dEndToMouth) {
        // Reverse so stream flows downhill towards mouth
        oriented = pts.slice().reverse();
      }

      const simplified = simplifyPoints(oriented, 0.0000003);
      finalFeatures.push({
        type: "Feature",
        properties: {
          river_id: b.river_id,
          name: idx === 0 ? b.name : `${b.name} (Tributary)`,
          basin_name: b.basin_name,
          reach: idx === 0 ? "Mainstem" : "Tributary",
          source: "OpenStreetMap Continuous Flow",
          vertex_count: simplified.length
        },
        geometry: {
          type: "LineString",
          coordinates: simplified
        }
      });
      console.log(`  -> Output ${idx === 0 ? "Mainstem" : "Tributary"}: ${simplified.length} vertices`);
    });
  }

  const outGeoJson = {
    type: "FeatureCollection",
    features: finalFeatures
  };

  const outPath = path.join(__dirname, '..', 'public', 'geo', 'sl-rivers.geojson');
  fs.writeFileSync(outPath, JSON.stringify(outGeoJson, null, 2), 'utf8');
  const stat = fs.statSync(outPath);
  console.log(`\n======================================================`);
  console.log(`COMPLETED: public/geo/sl-rivers.geojson written (${(stat.size / 1024).toFixed(2)} KB, ${finalFeatures.length} features)`);
  console.log(`======================================================`);
}

processAll();
