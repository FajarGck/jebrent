'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { logout } from '@/actions/auth';
import { getDashboardPath } from '@/lib/auth';
import { APP_NAME, ROLE_LABELS } from '@/lib/constants';
import { Car, Menu, X, LogOut, LayoutDashboard, User, LogIn, UserPlus } from 'lucide-react';

const NAV_LINKS = [{ href: '/vehicles', label: 'Kendaraan', icon: Car }];

export default function Navbar() {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.refresh();
  };

  const dashboardHref = getDashboardPath(profile?.role ?? (user?.user_metadata?.role as string | undefined));
  const displayName = profile?.full_name || (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'User';
  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] : null;

  return (
    <header className="sticky top-0 z-50 h-(--nav-h) border-b border-border bg-card/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary transition-colors hover:text-primary-hover">
          <Car className="h-6 w-6" />
          {APP_NAME}
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-card-muted hover:text-foreground'
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Auth buttons */}
        <div className="hidden items-center gap-2 md:flex">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-card-muted" />
          ) : user ? (
            <>
              <Link href={dashboardHref} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-card-muted hover:text-foreground">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="text-sm leading-tight">
                  <p className="font-medium">{displayName}</p>
                  {roleLabel && <p className="text-xs text-muted">{roleLabel}</p>}
                </div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10">
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-card-muted hover:text-foreground">
                <LogIn className="h-4 w-4" />
                Masuk
              </Link>
              <Link href="/register" className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover">
                <UserPlus className="h-4 w-4" />
                Daftar
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-muted transition-colors hover:bg-card-muted md:hidden">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-b border-border bg-card px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-card-muted'}`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            <hr className="my-2 border-border" />
            {user ? (
              <>
                <Link href={dashboardHref} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-card-muted">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger/10">
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-card-muted">
                  <LogIn className="h-4 w-4" />
                  Masuk
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-fg hover:bg-primary-hover"
                >
                  <UserPlus className="h-4 w-4" />
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
