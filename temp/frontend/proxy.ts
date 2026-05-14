import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedPathPrefix = "/desk";
const authCookieName = "cxnext-auth";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith(protectedPathPrefix)) {
    return NextResponse.next();
  }

  const hasAuthCookie = request.cookies.get(authCookieName)?.value;

  if (hasAuthCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/desk/:path*"],
};
