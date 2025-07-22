import { APP_CONFIG } from '@/config/app.config';
import { catchAsync } from '@/middlewares/catchAsync';
import { UserService } from '@/services/user.service';
import { SuccessResponse } from '@/utils/requestResponse';

class UserController {
  constructor(public userService: UserService) {}

  public me = catchAsync(async (req, res, _next) => {
    const user = req.user;
    const accessToken = req.cookies?.[APP_CONFIG.COOKIE_NAME];
    const refreshToken = req.cookies?.[APP_CONFIG.REFRESH_COOKIE_NAME];
    return SuccessResponse(res, {
      data: { ...user, accessToken, refreshToken },
      message: user?.id ? 'User Found' : 'User not found',
    });
  });
}

export default new UserController(new UserService());
