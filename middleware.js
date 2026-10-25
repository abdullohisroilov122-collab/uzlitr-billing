import { NextResponse } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Pages need a valid session; API routes check their own tokens. Signed-out visitors of the site root or the
// customer portal go to the customer sign-in; everything else is staff-only and goes to the staff sign-in.
export async function middleware(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  if (!session) {
    const url = request.nextUrl.clone();
    const path = request.nextUrl.pathname;
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|register|api|brand|sounds|icon.png|_next/static|_next/image|favicon.ico).*)"]
};
