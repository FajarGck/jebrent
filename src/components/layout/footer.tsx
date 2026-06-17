import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import { Car } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary">
            <Car className="h-5 w-5" />
            {APP_NAME}
          </Link>
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} {APP_NAME}. Hak cipta dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
