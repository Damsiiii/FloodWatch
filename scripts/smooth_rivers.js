const fs = require('fs');
const path = require('path');

// Catmull-Rom spline interpolation for C1-continuous natural river curves
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;

  const f0 = -0.5 * t3 + t2 - 0.5 * t;
  const f1 = 1.5 * t3 - 2.5 * t2 + 1.0;
  const f2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
  const f3 = 0.5 * t3 - 0.5 * t2;

  const lng = p0[0] * f0 + p1[0] * f1 + p2[0] * f2 + p3[0] * f3;
  const lat = p0[1] * f0 + p1[1] * f1 + p2[1] * f2 + p3[1] * f3;

  return [Number(lng.toFixed(5)), Number(lat.toFixed(5))];
}

function smoothCoordinates(points, subdivisions = 8) {
  if (points.length < 3) return points;

  const result = [];
  // Duplicate endpoints to clamp spline
  const pts = [points[0], ...points, points[points.length - 1]];

  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2];

    for (let j = 0; j < subdivisions; j++) {
      const t = j / subdivisions;
      result.push(catmullRom(p0, p1, p2, p3, t));
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

// Geographic control waypoints aligned with topographic river valleys & gauge stations
const RIVER_GUIDES = [
  // 1. KELANI GANGA
  {
    river_id: "basin_kelani",
    name: "Kelani River",
    basin_name: "Kelani Ganga",
    reach: "Mainstem",
    waypoints: [
      [80.575, 6.840], // Maskeliya highlands
      [80.535, 6.860],
      [80.490, 6.895], // Laxapana
      [80.450, 6.940],
      [80.412, 6.993], // Kitulgala
      [80.370, 7.015], // Yatiyantota
      [80.315, 7.025], // Ruwanwella valley
      [80.260, 7.000], // Ruwanwella bridge
      [80.230, 6.975], // Dehiowita
      [80.201, 6.957], // Glencorse / Avissawella
      [80.165, 6.938], // Kosgama
      [80.125, 6.915], // Pugoda
      [80.083, 6.901], // Hanwella Gauge
      [80.045, 6.912], // Ranala
      [80.005, 6.928], // Nawagamuwa bend
      [79.970, 6.942], // Kaduwela bridge
      [79.940, 6.955], // Biyagama
      [79.915, 6.950], // Kelaniya / Sedawatta
      [79.882, 6.953], // Nagatham Street Gauge
      [79.870, 6.968], // Peliyagoda bend
      [79.865, 6.980]  // Mattakkuliya sea mouth
    ]
  },
  // Kelani Tributary: Gurugoda Oya
  {
    river_id: "basin_kelani",
    name: "Gurugoda Oya",
    basin_name: "Kelani Ganga",
    reach: "Tributary",
    waypoints: [
      [80.258, 7.185], // Holombuwa Gauge
      [80.265, 7.140],
      [80.250, 7.080],
      [80.258, 7.030],
      [80.260, 7.000]  // Confluence at Ruwanwella
    ]
  },

  // 2. KALU GANGA
  {
    river_id: "basin_kalu",
    name: "Kalu River",
    basin_name: "Kalu Ganga",
    reach: "Mainstem",
    waypoints: [
      [80.685, 6.635], // Adam's Peak South / Samanala
      [80.620, 6.645], // Gilimale
      [80.520, 6.660], // Malwala
      [80.450, 6.675],
      [80.403, 6.682], // Ratnapura Town Gauge
      [80.360, 6.690], // Muwagama
      [80.320, 6.695], // Kiriella
      [80.280, 6.705],
      [80.254, 6.702], // Ellagawa Gauge
      [80.220, 6.670], // Idangoda
      [80.192, 6.641], // Millakanda Gauge
      [80.150, 6.620], // Dumbara
      [80.112, 6.601], // Putupaula Gauge
      [80.070, 6.592], // Tebuwana
      [80.015, 6.588], // Anguruwatota
      [79.985, 6.584], // Kalutara estuary
      [79.960, 6.582]  // Calido Beach sea mouth
    ]
  },
  // Kalu Tributary: Maguru Ganga
  {
    river_id: "basin_kalu",
    name: "Maguru Ganga",
    basin_name: "Kalu Ganga",
    reach: "Tributary",
    waypoints: [
      [80.350, 6.500],
      [80.310, 6.535],
      [80.261, 6.574], // Magura Gauge
      [80.220, 6.610],
      [80.192, 6.641]  // Confluence near Millakanda
    ]
  },

  // 3. GIN GANGA
  {
    river_id: "basin_gin",
    name: "Gin River",
    basin_name: "Gin Ganga",
    reach: "Mainstem",
    waypoints: [
      [80.520, 6.420], // Gongala ridge / Sinharaja
      [80.470, 6.390],
      [80.440, 6.360], // Neluwa
      [80.400, 6.340], // Lankagama
      [80.364, 6.321], // Thawalama Gauge
      [80.320, 6.280], // Hiniduma
      [80.290, 6.220],
      [80.261, 6.182], // Agaliya Gauge
      [80.235, 6.145], // Baddegama North
      [80.221, 6.124], // Baddegama Gauge
      [80.200, 6.095], // Wakwella
      [80.180, 6.060]  // Gintota (Galle) sea mouth
    ]
  },

  // 4. NILWALA GANGA
  {
    river_id: "basin_nilwala",
    name: "Nilwala River",
    basin_name: "Nilwala Ganga",
    reach: "Mainstem",
    waypoints: [
      [80.620, 6.345], // Deniyaya highlands
      [80.585, 6.300], // Morawaka
      [80.551, 6.261], // Pitabeddara Gauge
      [80.520, 6.220], // Kotapola
      [80.481, 6.184], // Akuressa (Urawa) Gauge
      [80.485, 6.145], // Kadduwa
      [80.491, 6.112], // Panadugama Gauge
      [80.505, 6.075], // Malimbada
      [80.520, 6.030], // Bandaththara Gauge
      [80.535, 5.980], // Matara town loop
      [80.545, 5.940]  // Matara Fort sea mouth
    ]
  },

  // 5. ATTANAGALU OYA
  {
    river_id: "basin_attanagalu",
    name: "Attanagalu Oya",
    basin_name: "Attanagalu Oya",
    reach: "Mainstem",
    waypoints: [
      [80.240, 7.180], // Galapitamada foothills
      [80.190, 7.155],
      [80.150, 7.140], // Attanagalla
      [80.115, 7.130],
      [80.081, 7.124], // Dunamale Gauge
      [80.040, 7.105],
      [80.000, 7.090], // Gampaha town
      [79.965, 7.085], // Minuwangoda south
      [79.940, 7.080], // Kotugoda
      [79.910, 7.082], // Ekala
      [79.890, 7.080], // Ja-Ela canal
      [79.870, 7.150]  // Negombo Lagoon mouth
    ]
  },

  // 6. MAHA OYA
  {
    river_id: "basin_maha",
    name: "Maha Oya",
    basin_name: "Maha Oya",
    reach: "Mainstem",
    waypoints: [
      [80.480, 7.220], // Aranayake hills
      [80.430, 7.250],
      [80.380, 7.280], // Polgahawela
      [80.330, 7.295],
      [80.270, 7.300], // Alawwa
      [80.210, 7.310],
      [80.151, 7.321], // Giriulla Gauge
      [80.090, 7.310],
      [80.020, 7.300], // Badalgama
      [79.960, 7.290],
      [79.910, 7.280], // Kochchikade bridge
      [79.865, 7.275],
      [79.840, 7.270]  // Negombo North sea mouth
    ]
  },

  // 7. DEDURU OYA
  {
    river_id: "basin_deduru",
    name: "Deduru Oya",
    basin_name: "Deduru Oya",
    reach: "Mainstem",
    waypoints: [
      [80.520, 7.500], // Matale hills
      [80.460, 7.530],
      [80.400, 7.560], // Batalagoda
      [80.340, 7.590],
      [80.280, 7.620], // Deduru Oya Reservoir
      [80.201, 7.581], // Moragaswewa Gauge
      [80.140, 7.600], // Wariyapola downstream
      [80.060, 7.595],
      [79.980, 7.590], // Bingiriya
      [79.920, 7.595],
      [79.860, 7.600], // Chilaw lagoon
      [79.820, 7.605],
      [79.790, 7.610]  // Chilaw estuary mouth
    ]
  },

  // 8. MAHAWELI GANGA
  {
    river_id: "basin_mahaweli",
    name: "Mahaweli River",
    basin_name: "Mahaweli Ganga",
    reach: "Mainstem",
    waypoints: [
      [80.750, 6.850], // Horton Plains Kirigalpotta source
      [80.700, 6.910],
      [80.640, 6.980], // Nawalapitiya
      [80.620, 7.120], // Gampola valley
      [80.591, 7.261], // Peradeniya Gauge
      [80.620, 7.320], // Katugastota / Kandy
      [80.660, 7.315], // Polgolla Dam
      [80.720, 7.295], // Teldeniya
      [80.760, 7.300], // Victoria Reservoir
      [80.840, 7.360], // Randenigala Reservoir
      [80.950, 7.420], // Rantembe / Minipe anicut
      [80.990, 7.550], // Hasalaka
      [81.021, 7.681], // Weragantota / Mahiyanganaya Gauge
      [81.050, 7.800],
      [81.080, 7.920], // Polonnaruwa floodplains
      [81.101, 8.101], // Manampitiya Bridge Gauge
      [81.125, 8.180],
      [81.140, 8.250], // Somawathiya sanctuary
      [81.170, 8.320],
      [81.200, 8.380], // Allai / Mutur delta
      [81.280, 8.450]  // Koddiyar Bay / Trincomalee
    ]
  },

  // 9. WALAWE RIVER
  {
    river_id: "basin_walawe",
    name: "Walawe River",
    basin_name: "Walawe River",
    reach: "Mainstem",
    waypoints: [
      [80.820, 6.720], // Balangoda plateau
      [80.840, 6.600], // Samanalawewa Reservoir
      [80.870, 6.450], // Udawalawe Reservoir
      [80.900, 6.380],
      [80.920, 6.300], // Embilipitiya
      [80.950, 6.240],
      [80.980, 6.180], // Nonagama / Ranna
      [81.010, 6.100]  // Ambalantota sea mouth
    ]
  }
];

const features = RIVER_GUIDES.map(river => {
  const smoothCoords = smoothCoordinates(river.waypoints, 8);
  return {
    type: "Feature",
    properties: {
      river_id: river.river_id,
      name: river.name,
      basin_name: river.basin_name,
      reach: river.reach,
      vertex_count: smoothCoords.length
    },
    geometry: {
      type: "LineString",
      coordinates: smoothCoords
    }
  };
});

const riversGeoJson = {
  type: "FeatureCollection",
  features
};

const outputPath = path.join(__dirname, '..', 'public', 'geo', 'sl-rivers.geojson');
fs.writeFileSync(outputPath, JSON.stringify(riversGeoJson, null, 2), 'utf8');

const stat = fs.statSync(outputPath);
console.log(`Generated smooth, accurate river geometries:`);
console.log(`File: sl-rivers.geojson (${(stat.size / 1024).toFixed(2)} KB)`);
features.forEach(f => {
  console.log(`  - ${f.properties.name}: ${f.properties.vertex_count} vertices`);
});

