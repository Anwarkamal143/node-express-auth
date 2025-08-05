import { NextFunction, Request, Response } from 'express';

import { APP_CONFIG } from '@/config/app.config';
import { ErrorCode } from '@/enums/error-code.enum';

import { resetCookies, setCookies } from '@/utils/cookie';

import { UserService } from '@/services/user.service';
import { UnauthorizedException } from '@/utils/catch-errors';
import { verifyAccessToken, verifyRefreshToken } from '@/utils/jwt';
import { catchAsync } from './catchAsync';
// Helpers
const extractBearerToken = (req: Request): string | undefined => {
  const header = req.headers.authorization || req.headers['Authorization'];
  return typeof header === 'string' && header.startsWith('Bearer ')
    ? header.split(' ')[1]
    : undefined;
};

export const getRequestTokens = (req: Request) => ({
  accessToken: req.cookies?.[APP_CONFIG.COOKIE_NAME] || extractBearerToken(req),
  refreshToken: req.cookies?.[APP_CONFIG.REFRESH_COOKIE_NAME] || req.headers.refreshtoken,
});

export class AuthMiddleWare {
  /**
   *
   */
  constructor(public userService: UserService) {}
  // Main Auth Middleware
  isAuthenticated = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const { accessToken, refreshToken } = getRequestTokens(req);
    if (!accessToken && !refreshToken) {
      return next(new UnauthorizedException('Not Authenticated'));
    }
    let tokenData;
    const { isExpired, error } = await verifyAccessToken(accessToken);

    const isAccessExpired = !isExpired;
    if (error) {
      return next(error);
    }

    if (isAccessExpired) {
      const { data } = await verifyRefreshToken(refreshToken);
      tokenData = data;
    }

    if (!tokenData?.user) {
      return next(
        new UnauthorizedException('Invalid or expired token', ErrorCode.AUTH_INVALID_TOKEN)
      );
    }

    const userData = await this.userService.getUserById(tokenData.user.id);
    const user = userData?.data;

    if (!user?.id) {
      return next(
        new UnauthorizedException('Invalid or expired token', ErrorCode.AUTH_INVALID_TOKEN)
      );
    }

    req.user = user;
    if (isAccessExpired) {
      req.tokenData = tokenData.user;
    }

    next();
  });
  // Check If User is Logged In (Optional Middleware)
  isLoggedIn = catchAsync(async (req: Request, _res, next: NextFunction) => {
    const { accessToken, refreshToken } = getRequestTokens(req);

    if (!accessToken && !refreshToken) return next();
    let accessData;
    let { data, isExpired } = await verifyAccessToken(accessToken);
    accessData = data;
    const isAccessExpired = isExpired;

    if (isAccessExpired && refreshToken) {
      const { data } = await verifyRefreshToken(refreshToken);
      accessData = data;
    }
    if (!accessData?.user) return next();

    const userData = await this.userService.getUserById(accessData.user.id);
    const user = userData?.data;

    if (!user?.id) {
      req.resetTokens = true;
      resetCookies(_res);
      return next();
    }

    req.user = user;
    if (accessData.user) req.tokenData = accessData.user;

    next();
  });

  // API Key Protection
  apiProtected = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.headers['x-api-key']) {
      return next(new UnauthorizedException('Please provide an API key.'));
    }
    next();
  });

  // Role-Based Access Control
  // const restrictTo = (...roles: Role[]) => {
  restrictTo = (...roles: any[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      if (!req.user?.role || !roles.includes(req.user.role)) {
        return next(new UnauthorizedException('You do not have permission to perform this action'));
      }
      next();
    };
  };

  refreshIfNeeded = async (req: Request, res: Response, next: NextFunction) => {
    const accessToken = req.cookies?.[APP_CONFIG.COOKIE_NAME];
    const refreshToken = req.cookies?.[APP_CONFIG.REFRESH_COOKIE_NAME];

    if (!accessToken && !refreshToken) {
      return next(new UnauthorizedException('Not authenticated', ErrorCode.AUTH_INVALID_TOKEN));
    }

    let accessPayload = await verifyAccessToken(accessToken);
    let userId: string | undefined = accessPayload.data?.user?.id;

    // If access token is expired but refresh token is valid, refresh tokens
    if (!accessPayload.data && refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken);
      userId = refreshPayload.data?.user?.id;

      if (!userId) {
        return next(
          new UnauthorizedException('Invalid refresh token', ErrorCode.AUTH_INVALID_TOKEN)
        );
      }

      const user = (await this.userService.getUserById(userId))?.data;
      if (!user?.id) {
        return next(
          new UnauthorizedException('Invalid or expired token', ErrorCode.AUTH_INVALID_TOKEN)
        );
      }
      // const fingerprint = await getFingerPrint(req);
      // // 🔁 Issue new tokens
      // const newAccessToken = await jwtSignToken({ id: user.id, expiresIn: '15m' });
      // const newRefreshToken = await jwtSignToken({ id: user.id, expiresIn: '7d' });

      const cookies = await setCookies(res, user);
      if (!cookies) {
        return next(
          new UnauthorizedException('Invalid refresh token', ErrorCode.AUTH_INVALID_TOKEN)
        );
      }
      req.user = user;
      return next();
    }

    // Access token is valid
    if (userId) {
      const user = (await this.userService.getUserById(userId))?.data;
      if (!user?.id) {
        return next(
          new UnauthorizedException('Invalid or expired token', ErrorCode.AUTH_INVALID_TOKEN)
        );
      }

      req.user = user;
      return next();
    }

    return next(
      new UnauthorizedException('Invalid or expired token', ErrorCode.AUTH_INVALID_TOKEN)
    );
  };
}

export default new AuthMiddleWare(new UserService());
