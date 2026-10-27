import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LankaFlood Watch | Real-Time Hydrology & Flood Radar Sri Lanka',
  description: 'Live hydro-meteorological river level monitoring, telemetry, and flood advisories for Sri Lankan river basins.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
