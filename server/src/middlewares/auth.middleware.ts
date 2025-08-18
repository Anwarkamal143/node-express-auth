import { NextFunction, Request, Response } from 'express';

import { APP_CONFIG } from '@/config/app.config';
import { ErrorCode } from '@/enums/error-code.enum';

import { resetCookies, setCookies } from '@/utils/cookie';

import { Role } from '@/db';
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
  isAuthenticated = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { accessToken, refreshToken } = getRequestTokens(req);
    if (!accessToken && !refreshToken) {
      return next(new UnauthorizedException('Not Authenticated'));
    }
    const tokenData = await verifyAccessToken(accessToken);

    if (tokenData.error) {
      resetCookies(res);
      return next(tokenData.error);
    }

    const isAccessExpired = tokenData.isExpired;
    const finalTokenData = isAccessExpired ? await verifyRefreshToken(refreshToken) : tokenData;

    if (!finalTokenData?.data?.user) {
      resetCookies(res);
      return next(
        new UnauthorizedException('Invalid or expired token', {
          errorCode: ErrorCode.AUTH_INVALID_TOKEN,
        })
      );
    }

    const userData = await this.userService.getUserById(finalTokenData.data.user.id, true);

    if (!userData.data?.id) {
      resetCookies(res);
      return next(
        new UnauthorizedException('Invalid or expired token', {
          errorCode: ErrorCode.AUTH_INVALID_TOKEN,
        })
      );
    }

    req.user = userData.data;

    if (isAccessExpired) {
      req.tokenData = finalTokenData.data.user;
      await setCookies(res, finalTokenData.data.user);
    }

    return next();
  });

  // Check If User is Logged In (Optional Middleware)
  isLoggedIn = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { accessToken, refreshToken } = getRequestTokens(req);

    if (!accessToken && !refreshToken) return next();

    // 1. Verify access token
    const { data: accessData, isExpired } = await verifyAccessToken(accessToken);

    // 2. If access is expired, try refresh
    if (isExpired && refreshToken) {
      const { data: refreshData } = await verifyRefreshToken(refreshToken);
      if (!refreshData?.user) {
        resetCookies(res);
        return next(
          new UnauthorizedException('Not authenticated', {
            errorCode: ErrorCode.AUTH_INVALID_TOKEN,
          })
        );
      }
      const userData = await this.userService.getUserById(refreshData.user.id, true);
      if (!userData.data?.id) {
        resetCookies(res);
        return next(
          new UnauthorizedException('Not authenticated', {
            errorCode: ErrorCode.AUTH_INVALID_TOKEN,
          })
        );
      }

      // refresh successful → set new cookies
      await setCookies(res, refreshData.user);
      req.user = userData.data;
      return next();
    }

    // 3. Access token valid → trust claims
    if (accessData?.user) req.user = accessData.user;

    return next();
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
  restrictTo = (...roles: Role[]) => {
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

    if (!accessToken || !refreshToken) {
      return next(
        new UnauthorizedException('Not authenticated', { errorCode: ErrorCode.AUTH_INVALID_TOKEN })
      );
    }

    // Step 1: Verify access token
    const accessPayload = await verifyAccessToken(accessToken);

    if (accessPayload.data && !accessPayload.isExpired) {
      // ✅ Access token valid → trust it, skip DB lookup
      req.user = accessPayload.data!.user;
      return next();
    }

    // Step 2: Access expired → try refresh token
    if (accessPayload.isExpired) {
      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (!refreshPayload.data || !refreshPayload.data?.user?.id) {
        resetCookies(res);
        return next(
          new UnauthorizedException('Invalid refresh token', {
            errorCode: ErrorCode.AUTH_INVALID_TOKEN,
          })
        );
      }

      // Double-check user only on refresh
      const user = (await this.userService.getUserById(refreshPayload.data.user.id, true))?.data;
      if (!user) {
        resetCookies(res);
        return next(
          new UnauthorizedException('User not found', { errorCode: ErrorCode.AUTH_INVALID_TOKEN })
        );
      }

      // ✅ Re-issue tokens
      await setCookies(res, { ...refreshPayload.data.user, role: user.role });
      req.user = user;
      return next();
    }
    resetCookies(res);
    // Step 3: Invalid token altogether
    return next(
      new UnauthorizedException('Invalid token', { errorCode: ErrorCode.AUTH_INVALID_TOKEN })
    );
  };
}

export default new AuthMiddleWare(new UserService());
