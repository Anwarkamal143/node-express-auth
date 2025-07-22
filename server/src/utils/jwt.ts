import { APP_CONFIG } from '@/config/app.config';
import { HTTPSTATUS } from '@/config/http.config';
import { ErrorCode } from '@/enums/error-code.enum';
import { CookieOptions } from 'express';
import { generateJti } from '.';
import { HttpException } from './catch-errors';
import { getCookiesOptions } from './cookie';
import { setRefreshTokenWithJTI } from './redis';
const joseImport = async () => {
  return await eval("import('jose')");
};
type IJwtTokenData = {
  id: string;
  expiresIn?: string;
  iss?: string;
  aud?: string;
  jti?: string;
  [key: string]: any;
};

export async function jwtSignToken(props: IJwtTokenData) {
  const {
    expiresIn = APP_CONFIG.JWT_EXPIRES_IN,
    iss = APP_CONFIG.TOKEN_ISSUER,
    aud = APP_CONFIG.TOKEN_AUDIENCE,
    jwt_secret = APP_CONFIG.JWT_SECRET,
    ...rest
  } = props;
  const secret = new TextEncoder().encode(jwt_secret);
  const jose = await joseImport();
  return await new jose.SignJWT({ iss, aud, ...rest })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyJwtt(
  token: string | null | undefined,
  jwt_secret = APP_CONFIG.JWT_SECRET
) {
  if (!token || token == null) {
    return Promise.resolve(null);
  }
  const jose = await joseImport();
  try {
    const secret = new TextEncoder().encode(jwt_secret); // Get secret as Uint8Array

    const token_data = await jose.jwtVerify(token, secret);
    const { payload } = token_data;
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
  } catch (error: any) {
    if (error instanceof jose.errors.JWTExpired) {
      return null;
    }

    throw error;
  }
}

export async function verifyJwt(
  token: string | null | undefined,
  jwt_secret = APP_CONFIG.JWT_SECRET
) {
  const jose = await joseImport();
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(jwt_secret);
    const { payload } = await jose.jwtVerify(token, secret);

    const { iat, exp, jti, ...rest } = payload;

    return {
      token_data: payload,
      data: rest as IServerCookieType,
    };
  } catch (error: unknown) {
    if (error instanceof jose.errors.JWTExpired) {
      return null;
    }
    throw error;
  }
}
export async function decode(token: string | null | undefined) {
  const jose = await joseImport();
  if (!token) return null;

  try {
    const payload = jose.decodeJwt(token);
    const { iat, exp, jti, ...rest } = payload;

    return {
      token_data: payload,
      data: rest as IServerCookieType,
    };
  } catch (error: unknown) {
    if (error instanceof jose.errors.JWTExpired) {
      return null;
    }
    throw error;
  }
}
/**
 * Checks whether a JWT token is going to expire soon.
 *
 * @param exp - The expiration timestamp in seconds (from token)
 * @param windowInSeconds - Time window to check for upcoming expiration (default: 3600 seconds = 1 hour)
 * @returns true if token is still valid but will expire within the given window
 */
export const isTokenExpiringSoon = (exp: number, windowInSeconds = 3600): boolean => {
  if (exp == null) {
    throw new HttpException('Invalid token', HTTPSTATUS.UNAUTHORIZED, ErrorCode.AUTH_INVALID_TOKEN);
  }
  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  return exp > currentTime && exp < currentTime + windowInSeconds;
};

export const generateAccessToken = async (tokenData: { id: string; [key: string]: any }) => {
  const token = await jwtSignToken({ ...tokenData, expiresIn: APP_CONFIG.JWT_EXPIRES_IN });

  const token_attributes: CookieOptions = getCookiesOptions({
    expiresIn: APP_CONFIG.JWT_COOKIE_EXPIRES_IN,
  });
  return { accessToken: token, cookieAttributes: token_attributes };
};
export const generateRefreshToken = async (tokenData: { id: string; [key: string]: any }) => {
  const jti = generateJti();
  const token = await jwtSignToken({
    ...tokenData,
    jti,
    jwt_secret: APP_CONFIG.JWT_REFRESH_SECRET,
    expiresIn: APP_CONFIG.JWT_REFRESH_EXPIRES_IN,
  });
  setRefreshTokenWithJTI(jti, { token });
  const token_attributes: CookieOptions = getCookiesOptions({
    expiresIn: APP_CONFIG.JWT_COOKIE_EXPIRES_IN,
  });
  return { refreshToken: token, cookieAttributes: token_attributes, jti };
};

export const verifyRefreshToken = async (token: string) => {
  return await verifyJwt(token, APP_CONFIG.JWT_REFRESH_SECRET);
};
export const verifyAccessToken = async (token: string) => {
  return await verifyJwt(token);
};
