import { NextResponse } from "next/server";
import { getSession, getAccessToken } from "@auth0/nextjs-auth0/edge";

export async function middleware(req) {
  console.log("Middleware intercepting:", req.nextUrl.pathname);

  try {
    // Create a response object first for session handling
    const res = NextResponse.next();
    const session = await getSession(req, res);

    if (!session?.user) {
      return NextResponse.redirect(new URL("/api/auth/login", req.url));
    }

    // Get access token for API calls
    const { accessToken } = await getAccessToken(req, res, {
      authorizationParams: {
        audience: process.env.AUTH0_AUDIENCE,
      },
    });

    // Create new request headers with auth data
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", session.user.sub);
    if (accessToken) {
      requestHeaders.set("x-access-token", accessToken);
    }

    // Create response with modified headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(new URL("/api/auth/login", req.url));
  }
}

export const config = {
  matcher: ["/projects/:path*", "/user-profile", "/api/proxy/:path*"],
};
