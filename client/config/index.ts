import { stringToNumber } from "@/lib";

export const DB_URL = process.env.DATABASE_URL as string;
export const DOMAIN = process.env.NEXT_PUBLIC_APP_URL;
export const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
export const POKEMON_API_BASE_URL = process.env.NEXT_PUBLIC_TEMP_API_URL || "";
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "";
export const IS_ENVIRONMENT_PRODUCTION = process.env.NODE_ENV === "production";
export const JWT_SECRET =
  process.env.JWT_SECRET || "xLDL9bqmNO=PI9Q5O`+#GnGFTukFKl";

export const COOKIE_NAME = process.env.COOKIE_NAME || "ecommerce_jwt";
export const REFRESH_COOKIE_NAME =
  process.env.REFRESH_COOKIE_NAME || "refresh_ecommerce_jwt";

export const JWT_MESSAGES = {
  jwt_expired: "jwt_expired",
};
export const SITE_URLS = {
  LOGIN: "/login",
  SIGN_UP: "/sign-up",
};
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
export const JWT_REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || "7d";
export const JWT_COOKIE_EXPIRES_IN =
  stringToNumber(process.env.JWT_COOKIE_EXPIRES_IN) || 1;
export const JWT_REFRESH_COOKIE_EXPIRES_IN =
  stringToNumber(process.env.JWT_REFRESH_COOKIE_EXPIRES_IN) || 7;
