import { CookieOptions, Response } from 'express';

import { APP_CONFIG } from '@/config/app.config';
import { HTTPSTATUS } from '@/config/http.config';
import { catchAsync } from '@/middlewares/catchAsync';
import { UserService } from '@/services/user.service';
import { getArcticeMethods, googleAuth } from '@/utils/auth';
import { InternalServerException } from '@/utils/catch-errors';
import { setCookies } from '@/utils/cookie';
import { setRefreshTokenWithJTI } from '@/utils/redis';
import { ErrorResponse } from '@/utils/requestResponse';
import { AccountType, ProviderType } from '../db';

const googleCookies = {
  google_oauth_state: 'google_oauth_state',
  google_code_verifier: 'google_code_verifier',
};

const Googlge_Cookies_options: CookieOptions = {
  // secure: true,
  path: '/',
  httpOnly: true,
  maxAge: 600 * 1000,
  secure: process.env.NODE_ENV === 'production',
};

class SocialAuthController {
  /**
   *
   */
  constructor(public userService: UserService) {}
  public googleSignAuth = catchAsync(async (_req, res, next) => {
    try {
      const { generateState, generateCodeVerifier } = await getArcticeMethods();
      const state = generateState();
      const codeVerifier = generateCodeVerifier();
      const gAuth = await googleAuth();
      res.cookie(googleCookies.google_oauth_state, state, Googlge_Cookies_options);

      res.cookie(googleCookies.google_code_verifier, codeVerifier, Googlge_Cookies_options);
      const generatedURL = gAuth.createAuthorizationURL(state, codeVerifier, ['profile', 'email']);

      // const url = new URL(generatedURL);
      // return SuccessResponse(res, {
      //   success: true,
      //   message: 'Redirect URL generated',
      //   data: generatedURL,
      // });
      return res.status(302).redirect(generatedURL.toString());
    } catch (error: any) {
      return next(new InternalServerException());
    }
  });

  public googleAuthCallback = catchAsync(async (req, res, next) => {
    const url = new URL(`${APP_CONFIG.HOST_NAME}${req.originalUrl}`);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const storedState = req.cookies[googleCookies.google_oauth_state] ?? null;
    const codeVerifier = req.cookies[googleCookies.google_code_verifier] ?? null;
    if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
      return next(ErrorResponse('Error on callback', HTTPSTATUS.BAD_REQUEST));
    }

    try {
      const gAuth = await googleAuth();
      // gAuth.createAuthorizationURL(state, codeVerifier, ['profile', 'email']);

      const tokens = await gAuth.validateAuthorizationCode(code, codeVerifier);
      const { decodeIdToken } = await getArcticeMethods();
      // const accessToken: any = tokens.accessToken();

      // const SuccessResponse = await fetch(
      //   "https://openidconnect.googleapis.com/v1/userinfo",
      //   {
      //     headers: {
      //       Authorization: `Bearer ${accessToken}`,
      //     },
      //   }
      // );
      // const googleUser = (await SuccessResponse.json()) as IGoogleUser;

      const googleUser = decodeIdToken(tokens.idToken()) as IGoogleUser;
      const { data: existingAccount } = await this.userService.getAccountByGoogleIdUseCase(
        googleUser.sub
      );
      if (existingAccount) {
        const { data: user } = await this.userService.getUserById(existingAccount.user_id);
        const { jti, refreshToken } = await this.setCallbackCookie(res, {
          id: existingAccount.user_id,
          provider: AccountType.oauth,
          providerType: ProviderType.google,
          role: user?.role,
        });
        await setRefreshTokenWithJTI(jti, { token: refreshToken });
        return res.status(302).redirect(APP_CONFIG.AFTER_LOGIN_URL);
      }

      const { data: user } = await this.userService.createGoogleUserUseCase(googleUser);
      if (user) {
        const { jti, refreshToken } = await this.setCallbackCookie(res, {
          id: user.id,
          provider: AccountType.oauth,
          providerType: ProviderType.google,
          role: user.role,
        });
        await setRefreshTokenWithJTI(jti, { token: refreshToken });
      }

      return res.status(302).redirect(APP_CONFIG.AFTER_LOGIN_URL);
    } catch (e: any) {
      next(new InternalServerException('Error on callback:' + e.message));
    }
  });
  public setCallbackCookie = async (
    res: Response,
    tokenData: { id: string } & Record<string, any>
  ) => {
    const cookiesData = await setCookies(res, tokenData);

    res.cookie(googleCookies.google_code_verifier, '', {
      ...Googlge_Cookies_options,
      maxAge: 0,
      expires: new Date(Date.now() - 2 * 60 * 1000),
    });
    res.cookie(googleCookies.google_oauth_state, '', {
      ...Googlge_Cookies_options,
      maxAge: 0,
      expires: new Date(Date.now() - 2 * 60 * 1000),
    });

    return cookiesData;
  };
}

export default new SocialAuthController(new UserService());
