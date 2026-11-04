import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isVisitorPage, needsLogin } from "@/lib/auth/rules";
import { needsOnboarding, START_COOKIE } from "@/lib/game/onboarding";

// Refreshes the Supabase session cookie on each request, and sends visitors
// without a session to /login. A logged-in user on the landing page or an account
// form goes to the lobby. A new visitor who did not do the onboarding goes from /signup to /start (issue #168).
// Pages still check the user on the server.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!loggedIn && needsLogin(pathname)) return redirectTo(request, response, "/login");
  if (loggedIn && isVisitorPage(pathname)) return redirectTo(request, response, "/lobby");
  if (pathname === "/signup" && needsOnboarding(request.cookies.get(START_COOKIE)?.value)) return redirectTo(request, response, "/start");
  return response;
}

// Keep the refreshed session cookies on the redirect.
function redirectTo(request: NextRequest, from: NextResponse, pathname: string) {
  const redirect = NextResponse.redirect(new URL(pathname, request.url));
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webm)$).*)"],
};
