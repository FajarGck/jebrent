import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getDashboardPath, resolveUserRole } from '@/lib/auth';

// -- Route configuration --
// Public: accessible without login
// Auth: login/register pages (redirect to dashboard if already logged in)
// Role: dashboard pages restricted by role
const PUBLIC_PATHS = ['/', '/vehicles'];
const AUTH_PATHS = ['/login', '/register'];
// Routes that require login but are accessible by ALL authenticated roles
const AUTHENTICATED_PATHS = ['/bookings'];
const ROLE_PATHS: Record<string, string[]> = {
  admin: ['/dashboard/admin'],
  owner: ['/dashboard/owner'],
  renter: ['/dashboard/renter'],
  driver: ['/dashboard/driver'],
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isAuth = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isAuth && user) {
    const role = await resolveUserRole(supabase, user);
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  if (!isPublic && !isAuth && !user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect /dashboard (exact) to role-specific dashboard
  if (user && pathname === '/dashboard') {
    const role = await resolveUserRole(supabase, user);
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  if (user && pathname.startsWith('/dashboard/')) {
    const role = await resolveUserRole(supabase, user);

    for (const [requiredRole, paths] of Object.entries(ROLE_PATHS)) {
      const matchesRolePath = paths.some((p) => pathname.startsWith(p));
      if (matchesRolePath && role !== requiredRole && role !== 'admin') {
        return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
