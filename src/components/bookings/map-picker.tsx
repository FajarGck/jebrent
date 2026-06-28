'use client';

import { useEffect, useRef, useState } from 'react';
import { Navigation } from 'lucide-react';

type MapPickerProps = {
  onLocationChange: (data: { lat: number; lng: number; radius: number; address: string }) => void;
};

export default function MapPicker({ onLocationChange }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(-7.4244); // Default Purwokerto Latitude
  const [lng, setLng] = useState(109.2301); // Default Purwokerto Longitude
  const [radius, setRadius] = useState(15); // Default 15 KM
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

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

  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || (window as any).L === undefined) return;
    const L = (window as any).L;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      
      const circle = L.circle([lat, lng], {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        radius: radius * 1000
      }).addTo(map);

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      fetchAddress(lat, lng);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
        circle.setLatLng(position);
        fetchAddress(position.lat, position.lng);
      });

      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        circle.setLatLng(e.latlng);
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
        fetchAddress(e.latlng.lat, e.latlng.lng);
      });
    }
  }, [mapLoaded]);

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius * 1000);
    }
    onLocationChange({ lat, lng, radius, address });
  }, [lat, lng, radius, address]);

  async function fetchAddress(latitude: number, longitude: number) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
      const data = await res.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    } catch (e) {
      setAddress(`Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    }
  }

  async function triggerSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(item.lat);
        const newLng = parseFloat(item.lon);
        setLat(newLat);
        setLng(newLng);
        setAddress(item.display_name);
        
        if (mapRef.current) {
          mapRef.current.setView([newLat, newLng], 13);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        }
        if (circleRef.current) {
          circleRef.current.setLatLng([newLat, newLng]);
        }
      } else {
        alert('Lokasi tidak ditemukan');
      }
    } catch (err) {
      alert('Gagal mencari lokasi');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Tentukan Lokasi Pengantaran di Peta <span className="text-danger">*</span>
        </label>
        
        {/* Search location bar */}
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                triggerSearch();
              }
            }}
            placeholder="Cari lokasi/jalan... (contoh: Alun-alun Purwokerto)"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs transition-colors focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={triggerSearch}
            disabled={searching}
            className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50"
          >
            {searching ? 'Mencari...' : 'Cari'}
          </button>
        </div>

        <div 
          ref={mapContainerRef} 
          className="h-64 w-full rounded-xl border border-border bg-card-muted overflow-hidden z-10 shadow-sm"
          style={{ minHeight: '260px' }}
        />
        <p className="mt-1.5 text-xs text-muted">
          Geser penanda pin biru atau klik di area peta untuk mencocokkan titik pengantaran armada.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Batas Radius Penggunaan (KM) <span className="text-danger">*</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="w-16 text-right font-bold text-sm text-primary">{radius} KM</span>
          </div>
          <p className="text-xs text-muted mt-1">
            Jangkauan maksimal operasional kendaraan dari titik awal pengantaran.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Koordinat Titik
          </label>
          <div className="flex gap-2 text-xs font-mono bg-card-muted p-2.5 rounded-xl border border-border text-muted items-center">
            <Navigation className="h-3.5 w-3.5 shrink-0" />
            <span>Lat: {lat.toFixed(6)}</span>
            <span>Lng: {lng.toFixed(6)}</span>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="delivery_address" className="mb-1.5 block text-sm font-medium">
          Alamat Pengantaran Detail <span className="text-danger">*</span>
        </label>
        <textarea
          id="delivery_address"
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Patokan alamat lengkap (contoh: Gang Melati No. 5, sebelah minimarket)"
          className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}
