import { NextFunction, Request, Response } from 'express';

import { APP_CONFIG } from '@/config/app.config';
import { ErrorCode } from '@/enums/error-code.enum';

import { setCookies } from '@/utils/cookie';

import { UserService } from '@/services/user.service';
import { UnauthorizedException } from '@/utils/catch-errors';
import { verifyJwt } from '@/utils/jwt';
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

    let tokenPayload = await verifyJwt(accessToken);
    const isAccessExpired = !tokenPayload && !!refreshToken;

    if (!tokenPayload && refreshToken) {
      tokenPayload = await verifyJwt(refreshToken);
    }

    if (!tokenPayload) {
      return next(
        new UnauthorizedException('Invalid or expired token', ErrorCode.AUTH_INVALID_TOKEN)
      );
    }

    const userData = await this.userService.getUserById(tokenPayload.data.id);
    const user = userData?.data;

    if (!user?.id) {
      return next(
        new UnauthorizedException('Invalid or expired token', ErrorCode.AUTH_INVALID_TOKEN)
      );
    }

    req.user = user;
    if (isAccessExpired) {
      req.tokenData = tokenPayload.data;
    }

    next();
  });
  // Check If User is Logged In (Optional Middleware)
  isLoggedIn = catchAsync(async (req: Request, _res, next: NextFunction) => {
    const { accessToken, refreshToken } = getRequestTokens(req);
    if (!accessToken && !refreshToken) return next();

    let tokenPayload = await verifyJwt(accessToken);
    const isAccessExpired = !tokenPayload && !!refreshToken;

    if (!tokenPayload && refreshToken) {
      tokenPayload = await verifyJwt(refreshToken);
    }

    if (!tokenPayload) return next();

    const userData = await this.userService.getUserById(tokenPayload.data.id);
    const user = userData?.data;

    if (!user?.id) {
      req.resetTokens = true;
      return next();
    }

    req.user = user;
    if (isAccessExpired) req.tokenData = tokenPayload.data;

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

    let accessPayload = await verifyJwt(accessToken);
    let userId: string | undefined = accessPayload?.data?.id;

    // If access token is expired but refresh token is valid, refresh tokens
    if (!accessPayload && refreshToken) {
      const refreshPayload = await verifyJwt(refreshToken);
      userId = refreshPayload?.data?.id;

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

      // // 🔁 Issue new tokens
      // const newAccessToken = await jwtSignToken({ id: user.id, expiresIn: '15m' });
      // const newRefreshToken = await jwtSignToken({ id: user.id, expiresIn: '7d' });

      setCookies(res, user);
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
