import axios from "axios";
import * as jose from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  API_BASE_URL,
  COOKIE_NAME,
  JWT_COOKIE_EXPIRES_IN,
  JWT_SECRET,
  REFRESH_COOKIE_NAME,
} from "./config";
import { getCookiesOptions } from "./lib/cookie";
import { Role } from "./lib/enumTypes";
import { canAccess } from "./lib/permissions";

// This function can be marked `async` if using `await` inside
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
const ADMIN_ROUTES = ["/dashboard"];
const AUTHENTICATED_ROUTES = [...ADMIN_ROUTES, "/client"];
const AUTH_ROUTES = ["/login", "/sign-up"];
// const USER_ROUTES = ["/home"];
// const PUBLIC_URLS = ["/", "/login", "/sign-up"];
export async function middleware(request: NextRequest) {
  const resp = await verifyTokens();
  let res = NextResponse.next();
  const isAuthenticated = resp != null;
  const url = new URL(request.url);

  const isAdminRoutes = ADMIN_ROUTES.find((p) => url.pathname.startsWith(p));
  const isAuthRoutes =
    !isAdminRoutes && AUTH_ROUTES.find((p) => url.pathname.startsWith(p));

  if (isAuthRoutes && isAuthenticated) {
    res = NextResponse.redirect(new URL("/", request.url));
  }
  const is_authenticated_routes = AUTHENTICATED_ROUTES.find((p) =>
    url.pathname.startsWith(p)
  );
  if (is_authenticated_routes && !isAuthenticated) {
    res = NextResponse.redirect(new URL("/", request.url));
  }

  const { user } = resp || {};
  if (isAdminRoutes && !canAccess(user, [Role.SUPER_ADMIN])) {
    res = NextResponse.redirect(new URL("/", request.url));
  }
  if (!isAdminRoutes && canAccess(user, [Role.SUPER_ADMIN])) {
    res = NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return res;
}

const verifyTokens = async () => {
  const cookie = await cookies();
  const token = cookie.get(COOKIE_NAME)?.value;
  const refreshToken = cookie.get(REFRESH_COOKIE_NAME)?.value;
  if (!token && !refreshToken) return null;
  try {
    const token_data = await verifyJwt(token);
    if (token_data.data) {
      return { accessToken: token, refreshToken, user: token_data.data?.user };
    }
    if (!token_data.isExpired) {
      return null;
    }
    const resp = await axios.post(
      `${API_BASE_URL}/auth/refresh-tokens`,
      {
        refreshToken,
        accessToken: token,
      },
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : null,
          refreshtoken: refreshToken,
        },
      }
    );
    if (resp?.data?.data) {
      const { isAccessTokenExpired, accessToken, refreshToken } =
        resp.data.data;
      if (isAccessTokenExpired) {
        const token_attributes: ICookieOptions = getCookiesOptions({
          expiresIn: JWT_COOKIE_EXPIRES_IN,
        });

        cookie.set(REFRESH_COOKIE_NAME, refreshToken, {
          // ...refresh_attributes,
          ...token_attributes,
        });
        cookie.set(COOKIE_NAME, accessToken, { ...token_attributes });
      }
      return resp.data.data;
    }
    return null;
  } catch {
    return null;
  }
};

export async function verifyJwt(token: string | null | undefined) {
  if (!token)
    return {
      isExpired: false,
      data: null,
      error: new Error("InValid Token"),
    };

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { iat, exp, jti, ...rest } = payload;

    return {
      error: null,
      isExpired: false,
      data: { token_data: payload, user: rest as IServerCookieType },
    };
  } catch (error: unknown) {
    if (error instanceof jose.errors.JWTExpired) {
      return { data: null, isExpired: true, error: null };
    }
    return {
      isExpired: false,
      data: null,
      error: Error("InValid Token"),
    };
  }
}
