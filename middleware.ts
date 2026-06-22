import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// The governed worker API is served on its own subdomain (api.knovo.ai), isolated from the
// public site. DNS CNAMEs it to the same Vercel project; here we route api.knovo.ai/<path>
// to the app's /api/worker/<path> handlers. Worker requests carry no auth cookies, so they
// skip the Supabase session refresh below.
const API_HOST = "api.knovo.ai";

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  if (host === API_HOST) {
    const url = request.nextUrl.clone();
    if (!url.pathname.startsWith("/api/worker")) {
      url.pathname = `/api/worker${url.pathname === "/" ? "" : url.pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // Refreshes the Supabase auth session cookie on each request so Server Components
  // always see a current session. See @supabase/ssr docs.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
