'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/types/database';
import { LayoutDashboard, Car, CalendarCheck, Users, CreditCard, Star, ShieldAlert, Menu, X, User, Truck, type LucideIcon } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const SIDEBAR_NAV: Record<string, NavItem[]> = {
  admin: [
    { href: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/admin/users', label: 'Pengguna', icon: Users },
    { href: '/dashboard/admin/vehicles', label: 'Kendaraan', icon: Car },
    { href: '/dashboard/admin/bookings', label: 'Pemesanan', icon: CalendarCheck },
    { href: '/dashboard/admin/payments', label: 'Pembayaran', icon: CreditCard },
    { href: '/dashboard/admin/fines', label: 'Denda', icon: ShieldAlert },
    { href: '/dashboard/admin/deliveries', label: 'Jadwal Pengantaran', icon: Truck },
    { href: '/dashboard/profile', label: 'Profil Saya', icon: User },
  ],
  owner: [
    { href: '/dashboard/owner', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/owner/vehicles', label: 'Kendaraan Saya', icon: Car },
    { href: '/dashboard/owner/bookings', label: 'Pesanan Masuk', icon: CalendarCheck },
    { href: '/dashboard/owner/reviews', label: 'Ulasan', icon: Star },
    { href: '/dashboard/profile', label: 'Profil Saya', icon: User },
  ],
  renter: [
    { href: '/dashboard/renter', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/renter/vehicles', label: 'Kendaraan Tersedia', icon: Car },
    { href: '/dashboard/renter/bookings', label: 'Riwayat Booking', icon: CalendarCheck },
    { href: '/dashboard/renter/payments', label: 'Riwayat Pembayaran', icon: CreditCard },
    { href: '/dashboard/profile', label: 'Profil Saya', icon: User },
  ],
  driver: [
    { href: '/dashboard/driver', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/driver/deliveries', label: 'Semua Pengantaran', icon: Truck },
    { href: '/dashboard/profile', label: 'Profil Saya', icon: User },
  ],
};

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const items = SIDEBAR_NAV[role] || [];

  if (!items.length) return null;

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-fg shadow-xl lg:hidden">
        <Menu className="h-6 w-6" />
      </button>

      {isOpen && <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-transform duration-300 lg:static lg:block lg:w-(--sidebar-w) lg:translate-x-0 lg:shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
          <span className="font-bold">Menu</span>
          <button onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-muted hover:bg-card-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-subtle">Navigasi</p>
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted hover:bg-card-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
