const fs = require('fs');

async function testMirrors() {
  const query = `[out:json][timeout:25];
(
  way["waterway"="river"]["name"~"Kelani|Kalu|Gin|Nilwala|Mahaweli|Maha|Deduru|Walawe",i](5.9,79.5,9.9,81.9);
);
out geom;`;

  const endpoints = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter'
  ];

  for (const url of endpoints) {
    try {
      console.log('Testing endpoint:', url);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': 'LankaFloodWatch/1.0' },
        body: 'data=' + encodeURIComponent(query)
      });
      if (!res.ok) {
        console.warn(`${url} returned HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      console.log(`Success! Fetched ${data.elements?.length || 0} river segments from ${url}`);
      fs.writeFileSync('scripts/osm_raw_rivers.json', JSON.stringify(data, null, 2));
      return data;
    } catch (e) {
      console.warn(`Error on ${url}:`, e.message);
    }
  }
}

testMirrors();
