import IoRedis from '@/app-redis';
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
import { resetCookies, setCookies } from '@/utils/cookie';
import { verifyJwt } from '@/utils/jwt';
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

      const { accessToken, refreshToken } = await setCookies(res, {
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
      console.log({ u: user.password, password });
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
  public signOut = catchAsync(async (_req, res, next) => {
    try {
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
        new BadRequestException('You are not loggedin', ErrorCode.AUTH_UNAUTHORIZED_ACCESS)
      );
    }

    const tokenData = await verifyJwt(refreshToken);
    if (!tokenData) {
      return next(
        new BadRequestException('You are not loggedin', ErrorCode.AUTH_UNAUTHORIZED_ACCESS)
      );
    }

    const { data } = tokenData!;
    const { data: user } = await this.userService.getUserById(data.id);

    if (!user?.id) {
      resetCookies(res);
      return SuccessResponse(res, {
        message: 'Token not refreshed',
        data: null,
        statusCode: HTTPSTATUS.UNAUTHORIZED,
      });
    }

    const { accessToken, refreshToken: refreshTokenTosend } = await setCookies(res, data);
    return SuccessResponse(res, {
      message: 'Token refreshed',
      data: { accessToken, refreshToken: refreshTokenTosend },
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
      let isAccessTokenExpired = false;

      if (!tokenPayload && refreshToken) {
        isAccessTokenExpired = true;
        tokenPayload = await verifyJwt(refreshToken);
      }

      if (!tokenPayload) {
        return next(
          new UnauthorizedException('Invalid or expired token', ErrorCode.AUTH_INVALID_TOKEN)
        );
      }
      const redisRefreshToken = await IoRedis.getValue(
        'refresh-token:' + tokenPayload?.token_data?.jti
      );

      console.log({ tokenPayload, refreshToken, redisRefreshToken });
      if (!redisRefreshToken) {
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
      if (isAccessTokenExpired) {
        const { refreshToken: rToken, accessToken: accToken } = await setCookies(res, user);
        accessToken = accToken;
        refreshToken = rToken;
      }

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
