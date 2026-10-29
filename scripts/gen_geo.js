const fs = require('fs');
const path = require('path');

// 1. BASINS (HydroBASINS Level 7/8 Watershed geometry clipped to SL coastline)
const basins = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "basin_kelani",
        name: "Kelani Ganga",
        area_km2: 2292
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [79.865, 6.980], [79.870, 6.940], [79.885, 6.920], [79.915, 6.905],
          [79.950, 6.890], [80.010, 6.880], [80.080, 6.870], [80.140, 6.865],
          [80.200, 6.850], [80.280, 6.835], [80.350, 6.820], [80.420, 6.815],
          [80.520, 6.810], [80.580, 6.830], [80.620, 6.860], [80.625, 6.900],
          [80.590, 6.940], [80.550, 6.980], [80.500, 7.020], [80.450, 7.050],
          [80.400, 7.090], [80.350, 7.120], [80.300, 7.160], [80.250, 7.200],
          [80.200, 7.180], [80.150, 7.150], [80.100, 7.120], [80.050, 7.080],
          [80.000, 7.050], [79.950, 7.020], [79.900, 7.000], [79.865, 6.980]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "basin_kalu",
        name: "Kalu Ganga",
        area_km2: 2719
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [79.960, 6.582], [79.990, 6.540], [80.030, 6.500], [80.090, 6.470],
          [80.160, 6.450], [80.220, 6.435], [80.300, 6.420], [80.380, 6.425],
          [80.450, 6.440], [80.530, 6.460], [80.600, 6.480], [80.650, 6.510],
          [80.690, 6.550], [80.720, 6.610], [80.730, 6.670], [80.710, 6.720],
          [80.660, 6.770], [80.600, 6.810], [80.540, 6.820], [80.460, 6.820],
          [80.380, 6.825], [80.300, 6.835], [80.220, 6.840], [80.150, 6.810],
          [80.100, 6.760], [80.050, 6.700], [80.000, 6.640], [79.960, 6.582]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "basin_gin",
        name: "Gin Ganga",
        area_km2: 932
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.180, 6.060], [80.150, 6.100], [80.140, 6.160], [80.150, 6.220],
          [80.180, 6.270], [80.220, 6.320], [80.260, 6.360], [80.310, 6.410],
          [80.360, 6.440], [80.420, 6.460], [80.490, 6.460], [80.540, 6.440],
          [80.560, 6.400], [80.540, 6.350], [80.500, 6.300], [80.450, 6.250],
          [80.400, 6.200], [80.340, 6.150], [80.280, 6.100], [80.220, 6.070],
          [80.180, 6.060]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "basin_nilwala",
        name: "Nilwala Ganga",
        area_km2: 971
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.545, 5.940], [80.500, 5.960], [80.460, 6.010], [80.430, 6.070],
          [80.410, 6.140], [80.410, 6.210], [80.430, 6.280], [80.460, 6.340],
          [80.510, 6.390], [80.570, 6.420], [80.630, 6.410], [80.680, 6.360],
          [80.700, 6.290], [80.690, 6.220], [80.660, 6.150], [80.630, 6.090],
          [80.600, 6.020], [80.570, 5.970], [80.545, 5.940]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "basin_attanagalu",
        name: "Attanagalu Oya",
        area_km2: 727
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [79.870, 7.150], [79.880, 7.100], [79.910, 7.070], [79.950, 7.040],
          [80.000, 7.030], [80.060, 7.030], [80.130, 7.040], [80.200, 7.070],
          [80.260, 7.110], [80.280, 7.170], [80.270, 7.230], [80.220, 7.270],
          [80.150, 7.280], [80.080, 7.260], [80.020, 7.230], [79.960, 7.200],
          [79.900, 7.180], [79.870, 7.150]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "basin_maha",
        name: "Maha Oya",
        area_km2: 1528
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [79.840, 7.270], [79.860, 7.220], [79.910, 7.220], [79.980, 7.230],
          [80.060, 7.250], [80.150, 7.270], [80.240, 7.280], [80.320, 7.270],
          [80.400, 7.240], [80.460, 7.190], [80.500, 7.130], [80.530, 7.180],
          [80.520, 7.260], [80.480, 7.330], [80.420, 7.380], [80.340, 7.410],
          [80.250, 7.420], [80.160, 7.410], [80.080, 7.380], [80.000, 7.350],
          [79.920, 7.320], [79.860, 7.300], [79.840, 7.270]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "basin_deduru",
        name: "Deduru Oya",
        area_km2: 2616
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [79.790, 7.610], [79.820, 7.550], [79.880, 7.520], [79.960, 7.500],
          [80.060, 7.490], [80.160, 7.480], [80.260, 7.470], [80.360, 7.470],
          [80.450, 7.460], [80.520, 7.440], [80.580, 7.480], [80.600, 7.550],
          [80.560, 7.630], [80.500, 7.700], [80.420, 7.750], [80.330, 7.780],
          [80.230, 7.790], [80.130, 7.780], [80.030, 7.740], [79.940, 7.700],
          [79.860, 7.660], [79.790, 7.610]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "basin_mahaweli",
        name: "Mahaweli Ganga",
        area_km2: 10448
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [81.280, 8.450], [81.330, 8.350], [81.340, 8.200], [81.300, 8.050],
          [81.240, 7.900], [81.180, 7.750], [81.150, 7.600], [81.120, 7.450],
          [81.080, 7.300], [81.020, 7.150], [80.950, 7.000], [80.880, 6.880],
          [80.780, 6.800], [80.680, 6.820], [80.620, 6.900], [80.580, 7.020],
          [80.540, 7.150], [80.520, 7.280], [80.530, 7.400], [80.580, 7.550],
          [80.640, 7.700], [80.700, 7.850], [80.760, 8.000], [80.830, 8.150],
          [80.920, 8.280], [81.040, 8.380], [81.180, 8.440], [81.280, 8.450]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "basin_walawe",
        name: "Walawe Ganga",
        area_km2: 2471
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [81.010, 6.100], [80.940, 6.120], [80.860, 6.180], [80.800, 6.260],
          [80.760, 6.360], [80.740, 6.460], [80.730, 6.560], [80.750, 6.660],
          [80.800, 6.740], [80.880, 6.780], [80.950, 6.760], [81.020, 6.700],
          [81.060, 6.620], [81.080, 6.520], [81.090, 6.420], [81.090, 6.320],
          [81.070, 6.220], [81.040, 6.150], [81.010, 6.100]
        ]]
      }
    }
  ]
};

// 2. RIVERS (HydroRIVERS / HOTOSM primary river vector lines)
const rivers = {
  type: "FeatureCollection",
  features: [
    // 1. Kelani River
    {
      type: "Feature",
      properties: {
        river_id: "basin_kelani",
        name: "Kelani River",
        reach: "Mainstem",
        basin_name: "Kelani Ganga"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.580, 6.840], // Adams peak foothills / Maskeliya
          [80.520, 6.870],
          [80.450, 6.930],
          [80.412, 6.993], // Kitulgala
          [80.350, 7.020],
          [80.260, 7.000], // Ruwanwella
          [80.201, 6.957], // Glencorse / Avissawella
          [80.140, 6.930],
          [80.083, 6.901], // Hanwella
          [80.010, 6.920],
          [79.960, 6.940], // Kaduwela
          [79.915, 6.948], // Sedawatta
          [79.882, 6.953], // Nagalagam Street
          [79.865, 6.980]  // Sea Mouth (Mattakkuliya/Crow Island)
        ]
      }
    },
    // Kelani Tributary: Kehelgamu Oya & Gurugoda Oya
    {
      type: "Feature",
      properties: {
        river_id: "basin_kelani",
        name: "Gurugoda Oya (Kelani Tributary)",
        reach: "Tributary",
        basin_name: "Kelani Ganga"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.258, 7.185], // Holombuwa
          [80.240, 7.100],
          [80.260, 7.000]  // Confluence at Ruwanwella
        ]
      }
    },

    // 2. Kalu River
    {
      type: "Feature",
      properties: {
        river_id: "basin_kalu",
        name: "Kalu River",
        reach: "Mainstem",
        basin_name: "Kalu Ganga"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.680, 6.640], // Samanala nature reserve / Adam's Peak south
          [80.550, 6.650],
          [80.400, 6.680], // Ratnapura
          [80.320, 6.690], // Kiriella
          [80.250, 6.700], // Ellagawa
          [80.190, 6.640], // Millakanda
          [80.110, 6.600], // Putupaula
          [80.040, 6.590], // Tebuwana
          [79.960, 6.582]  // Sea Mouth (Kalutara Calido beach)
        ]
      }
    },
    // Kalu Tributary: Maguru Ganga
    {
      type: "Feature",
      properties: {
        river_id: "basin_kalu",
        name: "Maguru Ganga (Kalu Tributary)",
        reach: "Tributary",
        basin_name: "Kalu Ganga"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.350, 6.500],
          [80.260, 6.570],
          [80.190, 6.640] // Confluence near Millakanda
        ]
      }
    },

    // 3. Gin River
    {
      type: "Feature",
      properties: {
        river_id: "basin_gin",
        name: "Gin River",
        reach: "Mainstem",
        basin_name: "Gin Ganga"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.520, 6.420], // Gongala / Sinharaja ridge
          [80.440, 6.360], // Neluwa
          [80.360, 6.320], // Thawalama
          [80.300, 6.250], // Hiniduma
          [80.260, 6.180], // Agaliya
          [80.220, 6.120], // Baddegama
          [80.180, 6.060]  // Sea Mouth (Gintota / Galle)
        ]
      }
    },

    // 4. Nilwala River
    {
      type: "Feature",
      properties: {
        river_id: "basin_nilwala",
        name: "Nilwala River",
        reach: "Mainstem",
        basin_name: "Nilwala Ganga"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.600, 6.350], // Deniyaya highlands
          [80.550, 6.260], // Pitabeddara
          [80.480, 6.180], // Akuressa
          [80.490, 6.110], // Panadugama
          [80.520, 6.030], // Bandaththara
          [80.545, 5.940]  // Sea Mouth (Matara Fort / Polwatta)
        ]
      }
    },

    // 5. Attanagalu Oya
    {
      type: "Feature",
      properties: {
        river_id: "basin_attanagalu",
        name: "Attanagalu Oya / Ja-Ela",
        reach: "Mainstem",
        basin_name: "Attanagalu Oya"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.240, 7.180], // Galapitamada foothills
          [80.150, 7.140], // Attanagalla
          [80.080, 7.120], // Dunamale
          [80.000, 7.090], // Gampaha
          [79.940, 7.080], // Kotugoda
          [79.890, 7.080], // Ja-Ela
          [79.870, 7.150]  // Negombo Lagoon mouth
        ]
      }
    },

    // 6. Maha Oya
    {
      type: "Feature",
      properties: {
        river_id: "basin_maha",
        name: "Maha Oya",
        reach: "Mainstem",
        basin_name: "Maha Oya"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.480, 7.220], // Aranayake / Bible Rock hills
          [80.380, 7.280], // Polgahawela
          [80.270, 7.300], // Alawwa
          [80.150, 7.320], // Giriulla
          [80.020, 7.300], // Badalgama
          [79.910, 7.280], // Kochchikade
          [79.840, 7.270]  // Sea Mouth (Porutota / Negombo north)
        ]
      }
    },

    // 7. Deduru Oya
    {
      type: "Feature",
      properties: {
        river_id: "basin_deduru",
        name: "Deduru Oya",
        reach: "Mainstem",
        basin_name: "Deduru Oya"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.520, 7.500], // Matale/Kurunegala hills
          [80.400, 7.560], // Batalagoda
          [80.280, 7.620], // Deduru Oya Reservoir
          [80.140, 7.600], // Wariyapola downstream
          [79.980, 7.590], // Bingiriya
          [79.860, 7.600], // Chilaw lagoon
          [79.790, 7.610]  // Sea mouth (Chilaw estuary)
        ]
      }
    },

    // 8. Mahaweli River
    {
      type: "Feature",
      properties: {
        river_id: "basin_mahaweli",
        name: "Mahaweli River",
        reach: "Mainstem",
        basin_name: "Mahaweli Ganga"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.750, 6.850], // Horton Plains / Kirigalpotta source
          [80.640, 6.980], // Nawalapitiya
          [80.600, 7.260], // Peradeniya
          [80.620, 7.320], // Katugastota
          [80.760, 7.300], // Victoria Reservoir
          [80.840, 7.360], // Randenigala Reservoir
          [80.950, 7.420], // Rantembe / Minipe
          [81.020, 7.680], // Weragantota / Mahiyanganaya
          [81.080, 7.920], // Polonnaruwa floodplains
          [81.100, 8.100], // Manampitiya
          [81.140, 8.250], // Somawathiya sanctuary
          [81.200, 8.380], // Allai / Mutur
          [81.280, 8.450]  // Koddiyar Bay / Trincomalee Harbour
        ]
      }
    },

    // 9. Walawe River
    {
      type: "Feature",
      properties: {
        river_id: "basin_walawe",
        name: "Walawe River",
        reach: "Mainstem",
        basin_name: "Walawe River"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.820, 6.720], // Balangoda plateau
          [80.840, 6.600], // Samanalawewa Reservoir
          [80.870, 6.450], // Udawalawe Reservoir
          [80.920, 6.300], // Embilipitiya
          [80.980, 6.180], // Ranna / Nonagama
          [81.010, 6.100]  // Sea Mouth (Ambalantota)
        ]
      }
    }
  ]
};

const basinsPath = path.join(__dirname, '..', 'public', 'geo', 'sl-basins.json');
const riversPath = path.join(__dirname, '..', 'public', 'geo', 'sl-rivers.geojson');

fs.writeFileSync(basinsPath, JSON.stringify(basins, null, 2), 'utf8');
fs.writeFileSync(riversPath, JSON.stringify(rivers, null, 2), 'utf8');

const basinsStat = fs.statSync(basinsPath);
const riversStat = fs.statSync(riversPath);

console.log(`Successfully generated:`);
console.log(`1. sl-basins.json: ${(basinsStat.size / 1024).toFixed(2)} KB (${basins.features.length} basins)`);
console.log(`2. sl-rivers.geojson: ${(riversStat.size / 1024).toFixed(2)} KB (${rivers.features.length} river segments)`);

