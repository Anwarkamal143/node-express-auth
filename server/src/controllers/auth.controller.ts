import { APP_CONFIG } from '@/config/app.config';
import { HTTPSTATUS } from '@/config/http.config';
import { AccountType, ProviderType, UserStatus } from '@/db';
import { ErrorCode } from '@/enums/error-code.enum';
import { getRequestTokens } from '@/middlewares/auth.middleware';
import { catchAsync } from '@/middlewares/catchAsync';
import { RegisterUserSchema } from '@/schema/auth';
import { AccountService } from '@/services/accounts.service';
import { UserService } from '@/services/user.service';
import { compareValue, hashValue } from '@/utils/bcrypt';
import {
  BadRequestException,
  InternalServerException,
  UnauthorizedException,
} from '@/utils/catch-errors';
import { resetCookies, setAccessTokenCookie, setCookies } from '@/utils/cookie';
import { decode, isTokenExpiringSoon, verifyJwt } from '@/utils/jwt';
import { logger } from '@/utils/logger';
import { deleteRefreshTokenWithJTI, getRefreshTokenByJTI } from '@/utils/redis';
import { SuccessResponse } from '@/utils/requestResponse';

export class AuthController {
  constructor(
    public accountService: AccountService,
    public userService: UserService
  ) {}
  public signUp = catchAsync(async (req, res, next) => {
    const { password: pas, name, email } = req.body;
    const result = RegisterUserSchema.safeParse(req.body);

    if (!result.success) {
      return next(new BadRequestException(result.error?.message, ErrorCode.VALIDATION_ERROR));
    }
    const { data: existingUser } = await this.userService.getUserByEmail(result.data.email);
    if (existingUser) {
      return next(
        new BadRequestException('Email already in use!', ErrorCode.AUTH_EMAIL_ALREADY_EXISTS)
      );
    }
    try {
      const hashedPassword = await hashValue(pas);
      const { data: user } = await this.userService.createUser({
        email,
        password: hashedPassword,
        name,
      });
      if (!user?.id) {
        return next(new BadRequestException('Registratin Fail', ErrorCode.BAD_REQUEST));
      }
      await this.accountService.createAccount(user.id);
      const { accessToken, refreshToken, jti } = await setCookies(res, {
        id: user.id,
        providerType: ProviderType.email,
        role: user.role,
        email,
        provider: AccountType.email,
      });
      const { password, ...restUser } = user;
      return SuccessResponse(res, {
        message: 'Account created successfully!',
        data: { ...restUser, accessToken, refreshToken },
        statusCode: 201,
      });
    } catch (error) {
      return next(new InternalServerException());
    }
  });
  public login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    try {
      const { data: resUser } = await this.userService.getUserByEmail(email);
      const user = resUser;
      console.log(user);
      if (!resUser || !user?.password) {
        return next(new BadRequestException('Invalid Credentails', ErrorCode.AUTH_NOT_FOUND));
      }
      if (user.status === UserStatus.INACTIVE) {
        return next(
          new BadRequestException('Your account is inactive', ErrorCode.ACCESS_FORBIDDEN)
        );
      }
      const isPassewordMatched = await compareValue(password, user.password);
      if (!isPassewordMatched) {
        return next(new BadRequestException('Invalid Credentails', ErrorCode.AUTH_NOT_FOUND));
      }
      const { accessToken, refreshToken } = await setCookies(res, {
        id: user.id,
        providerType: ProviderType.email,
        role: user.role,
        email,
        provider: AccountType.email,
      });
      const { password: psd, ...restUser } = user;
      return SuccessResponse(res, {
        message: 'LoggedIn successfully',
        data: { ...restUser, accessToken, refreshToken },
      });
    } catch (error) {
      return next(new InternalServerException());
    }
  });
  public signOut = catchAsync(async (req, res, next) => {
    try {
      try {
        const refreshToken = req.cookies?.[APP_CONFIG.REFRESH_COOKIE_NAME];
        console.log({ refreshToken });
        const data = await decode(refreshToken);
        if (data?.token_data?.jti) {
          await deleteRefreshTokenWithJTI(data.token_data.jti);
        }
      } catch (error) {}
      resetCookies(res);
    } catch (error) {
      console.error('Error during sign out:', error);
      return next(
        new InternalServerException('Failed to sign out', ErrorCode.INTERNAL_SERVER_ERROR)
      );
    }
    return SuccessResponse(res, {
      message: 'Logged out',
    });
  });
  public refreshTokens = catchAsync(async (req, res, next) => {
    const refreshToken = req.cookies[APP_CONFIG.REFRESH_COOKIE_NAME] || req.headers.refreshtoken;

    if (!refreshToken) {
      return next(
        new BadRequestException('You are not logged in', ErrorCode.AUTH_UNAUTHORIZED_ACCESS)
      );
    }

    const tokenData = await verifyJwt(refreshToken);
    if (!tokenData || !tokenData.token_data?.jti) {
      return next(new BadRequestException('Invalid refresh token', ErrorCode.AUTH_INVALID_TOKEN));
    }

    const { jti, exp } = tokenData.token_data;
    const { data: userData } = tokenData;

    const storedRefreshToken = await getRefreshTokenByJTI(jti);

    // Reuse detection
    if (!storedRefreshToken || storedRefreshToken?.token !== refreshToken) {
      resetCookies(res);
      await deleteRefreshTokenWithJTI(jti);
      logger.error({
        userId: userData.id,
        type: 'REUSE_DETECTED',
        status: 'REJECTED',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return next(
        new BadRequestException('Refresh token reuse detected', ErrorCode.AUTH_TOKEN_REUSED)
      );
    }
    const user = await this.userService.getUserById(userData.id);

    // Check user existence
    if (!user?.data?.id) {
      resetCookies(res);
      await deleteRefreshTokenWithJTI(jti);

      return SuccessResponse(res, {
        message: 'Token is not refreshed',
        data: null,
        statusCode: HTTPSTATUS.UNAUTHORIZED,
      });
    }

    // // Token version check
    // if (tokenVersionInToken !== user.tokenVersion) {
    //   resetCookies(res);
    //   return next(new BadRequestException('Token version mismatch', ErrorCode.AUTH_INVALID_TOKEN));
    // }

    // Optional: device/IP binding check

    // Rotate tokens if needed
    if (isTokenExpiringSoon(exp)) {
      const { accessToken, refreshToken: newRefreshToken } = await setCookies(res, { ...userData });
      logger.info({
        userId: userData.id,
        type: 'REFRESH_ROTATE',
        status: 'SUCCESS',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return SuccessResponse(res, {
        message: 'Token refreshed',
        data: { accessToken, refreshToken: newRefreshToken },
      });
    }

    const { accessToken } = await setAccessTokenCookie(res, {
      ...userData,
    });
    logger.info({
      userId: userData.id,
      type: 'REFRESH',
      status: 'SUCCESS',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return SuccessResponse(res, {
      message: 'Token refreshed',
      data: { accessToken, refreshToken }, // original refreshToken is reused
    });
  });

  public verifyAndCreateTokens = catchAsync(async (req, res, next) => {
    try {
      let { accessToken, refreshToken } = getRequestTokens(req);
      if (!accessToken && !refreshToken) {
        return next(new UnauthorizedException('Not authenticated'));
      }

      let tokenPayload = await verifyJwt(accessToken);
      if (tokenPayload) {
        return SuccessResponse(res, {
          message: 'Tokens Verified',
          data: {
            accessToken,
            refreshToken,
            user: tokenPayload.data,
            isAccessTokenExpired: false,
          },
        });
      }

      if (!tokenPayload && refreshToken) {
        tokenPayload = await verifyJwt(refreshToken);
      }

      if (!tokenPayload) {
        return next(
          new UnauthorizedException('Invalid or expired token', ErrorCode.AUTH_INVALID_TOKEN)
        );
      }
      const refreshTokenByJTI = await getRefreshTokenByJTI(tokenPayload.token_data.jti);
      if (!refreshTokenByJTI || refreshTokenByJTI?.token !== refreshToken) {
        resetCookies(res);
        return next(
          new UnauthorizedException('Invalid or expired token', ErrorCode.AUTH_INVALID_TOKEN)
        );
      }

      const userData = await this.userService.getUserById(tokenPayload.data.id);
      const respUser = userData?.data;

      if (!respUser?.id) {
        resetCookies(res);
        return next(
          new UnauthorizedException('Invalid or expired token', ErrorCode.AUTH_INVALID_TOKEN)
        );
      }
      const { password, ...user } = respUser;
      const { refreshToken: rToken, accessToken: accToken } = await setCookies(res, {
        ...user,
      });
      accessToken = accToken;
      refreshToken = rToken;

      return SuccessResponse(res, {
        message: 'Tokens refreshed',
        data: { accessToken, refreshToken, user, isAccessTokenExpired: true },
      });
    } catch (error) {
      console.error('Auth Error:', error);

      return next(
        new UnauthorizedException('Invalid or expired token', ErrorCode.AUTH_INVALID_TOKEN)
      );
    }
  });
}

export default new AuthController(new AccountService(), new UserService());
