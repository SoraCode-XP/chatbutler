import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getJwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('admin_accessToken')?.value;

  const isDashboard = pathname.startsWith('/dashboard');
  const isLogin = pathname === '/login';

  if (isDashboard) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const role = getJwtRole(token);
    if (role !== 'admin') {
      const res = NextResponse.redirect(new URL('/login', request.url));
      res.cookies.delete('admin_accessToken');
      return res;
    }
  }

  if (isLogin && token && getJwtRole(token) === 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
