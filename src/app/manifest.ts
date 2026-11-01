import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LankaFlood Watch - Sri Lanka Flood Radar & Telemetry',
    short_name: 'LankaFlood',
    description: 'Live hydro-meteorological river level monitoring, telemetry, and flood advisories for Sri Lankan river basins.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#020617',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}

