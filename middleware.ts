import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // 1. Define sensitive paths that REQUIRE Manager authentication
    const isManagerPath = path.startsWith('/manager') || path.startsWith('/casts');
    
    // API protection should only apply to sensitive management APIs
    // We allow availability submission and other cast-facing APIs to be public for now given the request
    const isManagerApiPath = 
        path.startsWith('/api/optimize') ||
        path.startsWith('/api/shifts/confirm') ||
        path.startsWith('/api/settings') ||
        path.startsWith('/api/clean');

    const sessionCookie = request.cookies.get('shift_system_session')?.value;

    // If it's a manager route, strictly checking for 'manager' session
    if (isManagerPath || isManagerApiPath) {
        if (sessionCookie !== 'manager') {
            if (isManagerApiPath) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            const url = new URL('/login', request.url);
            url.searchParams.set('from', path);
            return NextResponse.redirect(url);
        }
    }

    // All other paths (including /cast and /api/availabilities) are PUBLIC
    return NextResponse.next();
}

// Ensure the middleware runs for all potentially sensitive routes
export const config = {
    matcher: [
        '/manager/:path*', 
        '/casts/:path*', 
        '/api/:path*',
        // We don't really need to match /cast* anymore since it's public
    ],
};
