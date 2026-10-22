import { NextResponse } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Panel pages need a valid session; API routes check their own tokens.
export async function middleware(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api|brand|icon.png|_next/static|_next/image|favicon.ico).*)"]
};
