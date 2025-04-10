// Use NextAuth middleware for simplified route protection
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(request) {
    const { token } = request.nextauth;
    const { pathname } = request.nextUrl;

    // console.log("Middleware token:", token); // Debugging
    // console.log("Middleware pathname:", pathname); // Debugging

    const isAdminRoute = pathname.startsWith('/admin');
    const isUserDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/account') || pathname.startsWith('/billing') || pathname.startsWith('/widget');

    // Redirect root path based on auth
    if (pathname === '/') {
      if (token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/landing', request.url));
    }

    // Protect admin routes
    if (isAdminRoute && token?.subscription_tier !== 'admin') {
      console.warn(`Middleware: Non-admin user ${token?.email} blocked from ${pathname}`);
      // Redirect non-admins trying to access admin routes to the main dashboard
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
    }

    // Allow access to dashboard/account/billing/widget routes if authenticated
    if (isUserDashboard && !token) {
       // This case should technically be handled by the default withAuth behavior,
       // but we keep it for clarity. withAuth redirects to loginPage if token is absent.
       console.log(`Middleware: Unauthenticated access to ${pathname} blocked by default.`);
       return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Allow the request to proceed if none of the above conditions are met
    // (e.g., accessing public pages, or authenticated user accessing allowed pages)
    return NextResponse.next();
  },
  {
    callbacks: {
      // The `authorized` callback determines if the user is authorized to access the page.
      // If it returns `false`, the user is redirected to the login page.
      // If it returns `true`, the middleware function above is executed.
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // List of paths accessible even without a token (login, register, landing, public API etc.)
        const publicPaths = [
          '/landing',
          '/auth/login',
          '/auth/register',
          '/auth/forgot-password',
          '/verify-email', // Assuming email verification page is public
          // Add other public pages here
        ];

        // API routes that should be public or handle their own auth
        const publicApiPrefixes = [
          '/api/auth', // NextAuth routes
          '/api/webhooks', // Stripe webhook
          // Add other public API prefixes if needed
        ];

        const isPublic =
          publicPaths.includes(pathname) ||
          publicApiPrefixes.some(prefix => pathname.startsWith(prefix)) ||
          pathname === '/'; // Root path handled in main middleware

        // If it's a public path, always authorize (middleware function will handle root redirect)
        if (isPublic) {
          return true;
        }

        // If it's not a public path, require a token
        // console.log(`Middleware authorized callback: Path=${pathname}, IsPublic=${isPublic}, HasToken=${!!token}`);
        return !!token; // Must have a token for non-public paths
      },
    },
    pages: {
      signIn: '/auth/login', // Redirect to this page if authorized callback returns false
      // error: '/auth/error', // Optional error page
    },
  }
);

// Apply middleware to relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - widget.js (public widget script) - Adjust if path changes
     * - widget-preview.png (public image) - Adjust if path changes
     * - Any other static assets in /public
     */
    '/((?!_next/static|_next/image|favicon.ico|widget.js|widget-preview.png).*)',
  ],
};
