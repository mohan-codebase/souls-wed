import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";

export default async function proxy(request: NextRequest) {
  // If MAINTENANCE_MODE is set to 'true', activate maintenance mode.
  // We can also allow a bypass token or check for specific IPs if needed in the future.
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  const isMaintenancePage = request.nextUrl.pathname === '/maintenance';

  if (isMaintenanceMode && !isMaintenancePage) {
    // Let static files, API, and images pass through to allow the maintenance page to render properly
    const pathname = request.nextUrl.pathname;
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/images') ||
      pathname.startsWith('/logo') ||
      pathname.startsWith('/soulswed') ||
      pathname.match(/\.(ico|png|jpg|jpeg|svg)$/)
    ) {
      return NextResponse.next();
    }

    // Redirect all other requests to the maintenance page
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // If maintenance mode is OFF (false), but user tries to access /maintenance directly, redirect to home
  if (!isMaintenanceMode && isMaintenancePage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ─── Protect dashboard routes ───────────────────────────────────────────
  //
  // This used to check `isLoggedIn` only, with no role check — role separation
  // was enforced purely by a client-side redirect inside each dashboard page.
  // The APIs were (and are) correctly role-gated, so nothing leaked, but the
  // admin console's UI bundle was served to any authenticated user and the
  // protection was one refactor away from disappearing entirely.
  //
  // Each dashboard prefix now requires its matching role, and a signed-in user
  // hitting the wrong portal is sent to their own rather than to /login.
  const { pathname } = request.nextUrl;

  const requiredRole = pathname.startsWith("/admin/dashboard")
    ? "admin"
    : pathname.startsWith("/vendor/dashboard")
      ? "vendor"
      : pathname.startsWith("/dashboard")
        ? "user"
        : null;

  if (requiredRole) {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      // Send them back where they were trying to go once they've signed in.
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (session.role !== requiredRole) {
      const url = request.nextUrl.clone();
      url.searchParams.delete("next");
      url.pathname =
        session.role === "admin"
          ? "/admin/dashboard"
          : session.role === "vendor"
            ? "/vendor/dashboard"
            : "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
