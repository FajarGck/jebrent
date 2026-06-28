'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldAlert, CheckCircle, Navigation, MapPin, Calendar, Clock } from 'lucide-react';

type SimulatedVehicle = {
  bookingId: string;
  vehicleName: string;
  plateNumber: string;
  baseLat: number;
  baseLng: number;
  radius: number; // in KM
  simLat: number;
  simLng: number;
  isOutside: boolean;
};

type GPSMonitorProps = {
  activeBookings: any[];
  deliverySchedules: any[];
};

export default function AdminGPSMonitor({ activeBookings, deliverySchedules }: GPSMonitorProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [vehicles, setVehicles] = useState<SimulatedVehicle[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  // Initialize simulated vehicles
  useEffect(() => {
    const list: SimulatedVehicle[] = activeBookings
      .filter((b) => b.delivery_latitude && b.delivery_longitude)
      .map((b) => {
        const lat = parseFloat(b.delivery_latitude) || -7.4244;
        const lng = parseFloat(b.delivery_longitude) || 109.2301;
        const rad = parseInt(b.usage_radius) || 15;
        return {
          bookingId: b.id,
          vehicleName: `${b.vehicles?.brand} ${b.vehicles?.model}`,
          plateNumber: b.vehicles?.plate_number || 'N/A',
          baseLat: lat,
          baseLng: lng,
          radius: rad,
          simLat: lat,
          simLng: lng,
          isOutside: false,
        };
      });
    setVehicles(list);
  }, [activeBookings]);

  // Load Leaflet CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) {
      setMapLoaded(true);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      setMapLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || (window as any).L === undefined) return;
    const L = (window as any).L;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([-7.4244, 109.2301], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    }
  }, [mapLoaded]);

  // Simulation loop: Update positions every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles((prev) =>
        prev.map((v) => {
          // 15% chance of going outside radius
          const triggerOutside = Math.random() < 0.15;
          let distanceFactor = Math.random() * 0.7; // inside radius factor (percentage of radius)

          if (triggerOutside) {
            distanceFactor = 1.1 + Math.random() * 0.3; // outside radius factor (>1.0)
          }

          // Calculate offset in lat/lng based on radius (1 degree lat is ~111km)
          const radiusInDegrees = (v.radius * distanceFactor) / 111;
          const angle = Math.random() * 2 * Math.PI;
          const latOffset = radiusInDegrees * Math.sin(angle);
          const lngOffset = radiusInDegrees * Math.cos(angle);

          return {
            ...v,
            simLat: v.baseLat + latOffset,
            simLng: v.baseLng + lngOffset,
            isOutside: triggerOutside,
          };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Render markers on map when positions or map updates
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current || (window as any).L === undefined) return;
    const L = (window as any).L;

    layerGroupRef.current.clearLayers();

    vehicles.forEach((v) => {
      // Draw Base/Delivery Center pin
      L.marker([v.baseLat, v.baseLng], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="bg-primary text-white p-1 rounded-full border-2 border-white shadow-md"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).bindPopup(`<b>Pusat Pengantaran:</b><br>${v.vehicleName} (${v.plateNumber})`).addTo(layerGroupRef.current);

      // Draw Radius Circle
      L.circle([v.baseLat, v.baseLng], {
        color: v.isOutside ? '#ef4444' : '#3b82f6',
        fillColor: v.isOutside ? '#ef4444' : '#3b82f6',
        fillOpacity: 0.12,
        radius: v.radius * 1000
      }).addTo(layerGroupRef.current);

      // Draw Simulated Car Marker
      L.marker([v.simLat, v.simLng], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="p-1 rounded-full border-2 border-white shadow-lg animate-pulse ${
            v.isOutside ? 'bg-danger text-white' : 'bg-success text-white'
          }"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).bindPopup(`<b>Kendaraan Saat Ini:</b><br>${v.vehicleName}<br>Status: ${v.isOutside ? 'Keluarga Area!' : 'Dalam Wilayah Operasional'}`).addTo(layerGroupRef.current);
    });

    // Zoom map to fit vehicles if any exist
    if (vehicles.length > 0) {
      const bounds = L.latLngBounds(vehicles.map(v => [v.baseLat, v.baseLng]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [vehicles, mapLoaded]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Peta GPS (Col span 2) */}
      <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
        <div className="border-b border-border bg-card-muted px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary animate-pulse" />
            <h2 className="font-semibold text-sm">Pemantauan Area Operasional Kendaraan (Real-time GPS)</h2>
          </div>
          <span className="text-xs text-muted flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success animate-ping" />
            Simulasi Aktif
          </span>
        </div>
        <div ref={mapContainerRef} className="h-96 w-full z-10" />
      </div>

      {/* Side Panel: Daftar Status Kendaraan & Jadwal */}
      <div className="space-y-6">
        {/* Status Monitoring List */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-1.5 border-b border-border pb-2">
            <ShieldAlert className="h-4 w-4 text-muted" /> Status Kendaraan Aktif
          </h3>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {vehicles.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">Belum ada armada yang sedang disewa.</p>
            ) : (
              vehicles.map((v) => (
                <div
                  key={v.bookingId}
                  className={`p-3 rounded-xl border transition-colors flex items-center justify-between ${
                    v.isOutside
                      ? 'border-danger/30 bg-danger/5 text-danger'
                      : 'border-border bg-card-muted text-foreground'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs">{v.vehicleName}</h4>
                    <p className="text-xs font-mono opacity-80">{v.plateNumber}</p>
                    <p className="text-[10px] opacity-75 mt-0.5">Batas Radius: {v.radius} KM</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {v.isOutside ? (
                      <>
                        <ShieldAlert className="h-4 w-4 text-danger animate-bounce" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Keluar Area!</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-[10px] font-medium text-muted">Aman</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delivery Recap List */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-1.5 border-b border-border pb-2">
            <Calendar className="h-4 w-4 text-muted" /> Rekap Jadwal Pengantaran
          </h3>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {deliverySchedules.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">Tidak ada jadwal pengantaran dalam waktu dekat.</p>
            ) : (
              deliverySchedules.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-border bg-card-muted space-y-1.5">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-xs">
                      {s.bookings?.vehicles?.brand} {s.bookings?.vehicles?.model}
                    </h4>
                    <span className="text-[10px] font-bold text-muted font-mono">{s.bookings?.vehicles?.plate_number}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {new Date(s.departure_time).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.bookings?.delivery_address || 'Ambil di tempat'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
