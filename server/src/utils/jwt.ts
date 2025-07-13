import { APP_CONFIG } from '@/config/app.config';
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
    ...rest
  } = props;
  const secret = new TextEncoder().encode(APP_CONFIG.JWT_SECRET);
  const jose = await joseImport();
  return await new jose.SignJWT({ iss, aud, ...rest })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyJwt(token: string | null | undefined) {
  if (!token || token == null) {
    return Promise.resolve(null);
  }
  const jose = await joseImport();
  try {
    const secret = new TextEncoder().encode(APP_CONFIG.JWT_SECRET); // Get secret as Uint8Array

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
