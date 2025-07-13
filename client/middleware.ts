import axios from "axios";
import * as jose from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  API_BASE_URL,
  COOKIE_NAME,
  JWT_COOKIE_EXPIRES_IN,
  JWT_REFRESH_COOKIE_EXPIRES_IN,
  JWT_SECRET,
  REFRESH_COOKIE_NAME,
} from "./config";
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
  const { user } = resp || {};
  if (isAdminRoutes && !canAccess(user, [Role.SUPER_ADMIN])) {
    res = NextResponse.redirect(new URL("/", request.url));
  }
  if (!isAdminRoutes && canAccess(user, [Role.SUPER_ADMIN])) {
    res = NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return res;
}

export function getCookieTime(minutes: number) {
  const maxAge = minutes * 60; // seconds
  const expires = new Date(Date.now() + maxAge * 1000); // absolute expiration time

  return { maxAge, expires };
}
export const getCookiesOptions = (props?: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cookies?: Record<string, any>;
  expiresIn?: number;
}) => {
  const { cookies, expiresIn = JWT_COOKIE_EXPIRES_IN } = props || {
    expiresIn: JWT_COOKIE_EXPIRES_IN,
    cookies: {},
  };
  const updatedCookies = { ...cookies };
  const { expires, maxAge } = getCookieTime(expiresIn);
  updatedCookies.expires =
    updatedCookies.expires != null ? updatedCookies.expires : expires;
  updatedCookies.maxAge =
    updatedCookies.maxAge != null ? updatedCookies.maxAge : maxAge;
  updatedCookies.httpOnly = true;
  updatedCookies.sameSite = updatedCookies.sameSite || "lax";
  updatedCookies.path = updatedCookies.path || "/";

  updatedCookies.secure = process.env.NODE_ENV === "production";

  return updatedCookies;
};
const verifyTokens = async () => {
  const cookie = await cookies();
  const token = cookie.get(COOKIE_NAME)?.value;
  const refreshToken = cookie.get(REFRESH_COOKIE_NAME)?.value;
  if (!token && !refreshToken) return null;
  try {
    const token_data = await verifyJwt(token);
    if (token_data) {
      return { accessToken: token, refreshToken, user: token_data.data };
    }
    const resp = await axios.post(
      `${API_BASE_URL}/auth/verify-tokens`,
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
        const refresh_attributes: ICookieOptions = getCookiesOptions({
          expiresIn: JWT_REFRESH_COOKIE_EXPIRES_IN,
        });
        cookie.set(REFRESH_COOKIE_NAME, refreshToken, {
          ...refresh_attributes,
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
  if (!token || token == null) {
    return Promise.resolve(null);
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET); // Get secret as Uint8Array

    const token_data = await jose.jwtVerify(token, secret);
    const { payload } = token_data;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { iat, exp, ...rest } = payload;
    if (payload.exp) {
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      const isExpired = payload.exp < currentTime;
      if (isExpired) {
        // throw new Error("Token has expired");
        return null;
      }
    }
    return { token_data: payload, data: rest as IServerCookieType };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error instanceof jose.errors.JWTExpired) {
      return null;
    }
    throw error;
  }
}
