const fs = require('fs');
const readline = require('readline');
const path = require('path');

const BASIN_TARGETS = [
  {
    river_id: "basin_kelani",
    name: "Kelani River",
    basin_name: "Kelani Ganga",
    mouthCoord: [79.8699168, 6.979135],
    regex: /kelani/i,
    minLat: 6.80, maxLat: 7.20, minLng: 79.85, maxLng: 80.65,
    maxGapMeters: 150
  },
  {
    river_id: "basin_kalu",
    name: "Kalu River",
    basin_name: "Kalu Ganga",
    mouthCoord: [79.9560831, 6.5879253],
    regex: /kalu/i,
    minLat: 6.45, maxLat: 6.85, minLng: 79.92, maxLng: 80.75,
    maxGapMeters: 150
  },
  {
    river_id: "basin_gin",
    name: "Gin River",
    basin_name: "Gin Ganga",
    mouthCoord: [80.1757228, 6.0598921],
    regex: /gin/i,
    minLat: 6.02, maxLat: 6.50, minLng: 80.15, maxLng: 80.60,
    maxGapMeters: 150
  },
  {
    river_id: "basin_nilwala",
    name: "Nilwala River",
    basin_name: "Nilwala Ganga",
    mouthCoord: [80.5381932, 5.9412594],
    regex: /nilwala/i,
    minLat: 5.92, maxLat: 6.40, minLng: 80.40, maxLng: 80.75,
    maxGapMeters: 150
  },
  {
    river_id: "basin_attanagalu",
    name: "Attanagalu Oya",
    basin_name: "Attanagalu Oya",
    mouthCoord: [79.8548148, 7.1068886],
    regex: /dandugam|dadugan|attanagalu|attanagalla/i,
    minLat: 7.00, maxLat: 7.28, minLng: 79.85, maxLng: 80.30,
    maxGapMeters: 150
  },
  {
    river_id: "basin_maha",
    name: "Maha Oya",
    basin_name: "Maha Oya",
    mouthCoord: [79.8427051, 7.2725642],
    regex: /maha\s?oya/i,
    minLat: 7.05, maxLat: 7.45, minLng: 79.82, maxLng: 80.55,
    maxGapMeters: 150
  },
  {
    river_id: "basin_deduru",
    name: "Deduru Oya",
    basin_name: "Deduru Oya",
    mouthCoord: [79.7936, 7.6101],
    regex: /deduru/i,
    minLat: 7.45, maxLat: 7.80, minLng: 79.75, maxLng: 80.65,
    maxGapMeters: 150
  },
  {
    river_id: "basin_mahaweli",
    name: "Mahaweli River",
    basin_name: "Mahaweli Ganga",
    mouthCoord: [81.2301953, 8.4600612],
    regex: /mahaweli/i,
    minLat: 6.80, maxLat: 8.55, minLng: 80.45, maxLng: 81.35,
    maxGapMeters: 150
  },
  {
    river_id: "basin_walawe",
    name: "Walawe River",
    basin_name: "Walawe River",
    mouthCoord: [81.0505561, 6.106648],
    regex: /walawe/i,
    minLat: 6.05, maxLat: 6.78, minLng: 80.55, maxLng: 81.10,
    maxGapMeters: 150
  }
];

async function run() {
  console.log("Loading waterways.geojson...");
  const rl = readline.createInterface({
    input: fs.createReadStream('scripts/waterways.geojson', { encoding: 'utf8' }),
    crlfDelay: Infinity
  });

  const allWays = [];
  for await (const line of rl) {
    if (!line.includes('"type": "Feature"')) continue;
    let clean = line.trim();
    if (clean.endsWith(',')) clean = clean.slice(0, -1);
    try {
      const f = JSON.parse(clean);
      if (f.geometry && f.geometry.type === 'LineString') {
        const props = f.properties || {};
        allWays.push({
          id: props.id,
          name: props.name || '',
          name_en: props.name_en || '',
          waterway: props.waterway || '',
          coords: f.geometry.coordinates
        });
      }
    } catch(e) {}
  }
  console.log(`Loaded ${allWays.length} LineString waterways.`);

  const finalFeatures = [];

  for (const b of BASIN_TARGETS) {
    console.log(`\n======================================================`);
    console.log(`Tracing: ${b.name} (${b.river_id}) from mouth [${b.mouthCoord}]`);

    // 1. Filter candidate ways inside or touching this basin
    const candidates = [];
    for (let i = 0; i < allWays.length; i++) {
      const w = allWays[i];
      const c = w.coords;
      const start = c[0], end = c[c.length - 1];
      const inBox = (start[0] >= b.minLng && start[0] <= b.maxLng && start[1] >= b.minLat && start[1] <= b.maxLat) ||
                    (end[0] >= b.minLng && end[0] <= b.maxLng && end[1] >= b.minLat && end[1] <= b.maxLat);
      if (!inBox) continue;

      const isNamedMatch = b.regex.test(`${w.name} ${w.name_en}`);
      const isWaterway = w.waterway === 'river' || w.waterway === 'stream' || w.waterway === 'canal';

      // Check for artificial single straight hops > 1500m inside the way
      let hasWildJump = false;
      for (let j = 0; j < c.length - 1; j++) {
        if (Math.hypot(c[j][0] - c[j+1][0], c[j][1] - c[j+1][1]) * 111000 > 1500 && b.river_id !== 'basin_mahaweli') {
          hasWildJump = true;
          break;
        }
      }
      if (hasWildJump) continue;

      if (isNamedMatch || isWaterway) {
        candidates.push({
          idx: i,
          name: w.name,
          coords: c,
          isNamedMatch,
          waterway: w.waterway
        });
      }
    }
    console.log(`Found ${candidates.length} candidate ways in basin.`);

    // 2. Find starting mouth way
    let startIdx = -1;
    let reverseStart = false;
    let minMouthDist = Infinity;

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i].coords;
      const dStart = Math.hypot(c[0][0] - b.mouthCoord[0], c[0][1] - b.mouthCoord[1]);
      const dEnd = Math.hypot(c[c.length-1][0] - b.mouthCoord[0], c[c.length-1][1] - b.mouthCoord[1]);
      if (dStart < minMouthDist) {
        minMouthDist = dStart;
        startIdx = i;
        reverseStart = false; // flows from mouth upstream, so start is at mouth
      }
      if (dEnd < minMouthDist) {
        minMouthDist = dEnd;
        startIdx = i;
        reverseStart = true; // end is at mouth, reverse so mouth is at index 0
      }
    }

    const mouthDistMeters = minMouthDist * 111000;
    console.log(`Mouth way: "${candidates[startIdx].name || '(unnamed)'}" (dist from target mouth: ${mouthDistMeters.toFixed(1)}m, reversed: ${reverseStart})`);

    const visited = new Set();
    visited.add(startIdx);

    let mouthPts = candidates[startIdx].coords;
    if (reverseStart) mouthPts = mouthPts.slice().reverse();

    let mainstemChain = mouthPts.slice();
    let currentUpstream = mainstemChain[mainstemChain.length - 1];

    // 3. Upstream greedy tracer
    let extended = true;
    let step = 0;
    const maxGapDeg = b.maxGapMeters / 111000;

    while (extended && step < 100) {
      extended = false;
      step++;

      let bestIdx = -1;
      let bestDist = Infinity;
      let bestRev = false;

      for (let i = 0; i < candidates.length; i++) {
        if (visited.has(i)) continue;
        const cand = candidates[i];
        const c = cand.coords;
        const dStart = Math.hypot(c[0][0] - currentUpstream[0], c[0][1] - currentUpstream[1]);
        const dEnd = Math.hypot(c[c.length-1][0] - currentUpstream[0], c[c.length-1][1] - currentUpstream[1]);

        // Prefer named matches if multiple within close distance
        const bonus = cand.isNamedMatch ? 0.0005 : 0;

        if (dStart < bestDist + bonus) {
          bestDist = dStart;
          bestIdx = i;
          bestRev = false;
        }
        if (dEnd < bestDist + bonus) {
          bestDist = dEnd;
          bestIdx = i;
          bestRev = true;
        }
      }

      if (bestDist <= maxGapDeg && bestIdx >= 0) {
        visited.add(bestIdx);
        const nextCand = candidates[bestIdx];
        let nextPts = nextCand.coords.slice();
        if (bestRev) nextPts.reverse();

        mainstemChain = mainstemChain.concat(nextPts.slice(1));
        currentUpstream = mainstemChain[mainstemChain.length - 1];
        extended = true;
        console.log(`  Step ${step}: Attached "${nextCand.name || '(unnamed)'}" (${nextPts.length} pts, gap: ${(bestDist*111000).toFixed(1)}m) -> Total: ${mainstemChain.length} pts`);
      }
    }

    // Flip orientation so it flows downhill (Highlands -> Ocean Mouth)
    const orientedDownhill = mainstemChain.slice().reverse();

    // Remove only redundant duplicate/zero-length points (tolerance 0.000000005 ~ 10cm)
    const cleaned = [];
    for (let i = 0; i < orientedDownhill.length; i++) {
      const pt = [Number(orientedDownhill[i][0].toFixed(6)), Number(orientedDownhill[i][1].toFixed(6))];
      if (cleaned.length === 0 || cleaned[cleaned.length-1][0] !== pt[0] || cleaned[cleaned.length-1][1] !== pt[1]) {
        cleaned.push(pt);
      }
    }

    console.log(`-> Result: ${b.name} Mainstem has ${cleaned.length} satellite-precision vertices from [${cleaned[0]}] to mouth [${cleaned[cleaned.length-1]}]`);

    finalFeatures.push({
      type: "Feature",
      properties: {
        river_id: b.river_id,
        name: b.name,
        basin_name: b.basin_name,
        reach: "Mainstem",
        source: "OpenStreetMap Satellite-Precision Survey Trace",
        vertex_count: cleaned.length
      },
      geometry: {
        type: "LineString",
        coordinates: cleaned
      }
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
  console.log(`SUCCESS: public/geo/sl-rivers.geojson written (${(stat.size / 1024).toFixed(2)} KB, ${finalFeatures.length} primary river mainstems)`);
  console.log(`======================================================`);
}

run();
