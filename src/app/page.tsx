import Link from 'next/link';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';
import { Car, Shield, Clock, MapPin } from 'lucide-react';

const FEATURES = [
  {
    icon: Car,
    title: 'Pilihan Beragam',
    desc: 'Sedan, SUV, MPV, dan lainnya dari pemilik terpercaya',
  },
  {
    icon: Shield,
    title: 'Aman & Terjamin',
    desc: 'Verifikasi pemilik dan kendaraan untuk keamanan Anda',
  },
  {
    icon: Clock,
    title: 'Proses Cepat',
    desc: 'Booking online, bayar, dan kendaraan siap diantar',
  },
  {
    icon: MapPin,
    title: 'Antar ke Lokasi',
    desc: 'Layanan pengantaran kendaraan ke alamat Anda',
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-primary/5 via-background to-accent/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Car className="h-4 w-4" />
            {APP_DESCRIPTION}
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Sewa Kendaraan <span className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">Mudah & Cepat</span>
          </h1>

          <p className="max-w-xl text-lg text-muted">{APP_NAME} menghubungkan Anda dengan pemilik kendaraan terpercaya. Booking online, bayar aman, dan kendaraan diantar ke lokasi Anda.</p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/vehicles"
              className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30"
            >
              Lihat Kendaraan
            </Link>
            <Link href="/register" className="rounded-xl border border-border bg-card px-8 py-3 text-sm font-semibold transition-all hover:border-border-hover hover:shadow-md">
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Kenapa {APP_NAME}?</h2>
            <p className="mt-3 text-muted">Platform rental kendaraan terlengkap dan terpercaya</p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border bg-background p-6 transition-all hover:border-primary/30 hover:shadow-md">
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-fg">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-linear-to-r from-primary to-accent">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Punya kendaraan menganggur?</h2>
          <p className="mt-3 text-white/80">Daftarkan kendaraan Anda dan mulai dapatkan penghasilan tambahan.</p>
          <Link href="/register" className="mt-6 inline-flex rounded-xl bg-white px-8 py-3 text-sm font-semibold text-primary shadow-lg transition-all hover:bg-white/90">
            Daftar Sebagai Pemilik
          </Link>
        </div>
      </section>
    </div>
  );
}
