// middleware.ts  (repo root, NOT inside src/)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  const publicRoutes = ["/", "/login", "/signup", "/forgot-password"];
  const isPublic =
    publicRoutes.includes(pathname) ||
    publicRoutes.some((r) => pathname.startsWith(r));

  // logged-in user ko public pages par na aane do
  if (token && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // not-logged-in user ko protected pages par na jaane do
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// export const config = {
//   matcher: [
//     // har page guard ho jayega except next internals/static
//     "/((?!api|_next/static|_next/image|favicon.ico).*)",
//   ],
// };
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico).*)", // /api exclude ho rahi yahan
  ],
};

