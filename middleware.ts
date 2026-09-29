import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'habit_session';

async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password');

  const isProtectedPage =
    pathname.startsWith('/home') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/add-habit') ||
    pathname.startsWith('/track') ||
    pathname.startsWith('/settings');

  // Root redirect (verified session check)
  if (pathname === '/') {
    if (await hasValidSession(sessionToken)) {
      return NextResponse.redirect(new URL('/home', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Protected pages require a valid, non-expired JWT
  if (isProtectedPage) {
    if (!(await hasValidSession(sessionToken))) {
      const res = NextResponse.redirect(new URL('/login', request.url));
      // Drop invalid/expired cookies so stale sessions can't linger
      if (sessionToken) {
        res.cookies.delete(SESSION_COOKIE_NAME);
      }
      return res;
    }
  }

  // Authenticated users with a valid session are sent home
  if (isAuthPage && (await hasValidSession(sessionToken))) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
