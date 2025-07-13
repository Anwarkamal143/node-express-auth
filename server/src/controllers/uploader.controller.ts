import { catchAsync } from '@/middlewares/catchAsync';
import { UserService } from '@/services/user.service';
import { SuccessResponse } from '@/utils/requestResponse';

class UserController {
  constructor(public userService: UserService) {}

  public me = catchAsync(async (_req, res, _next) => {
    const user = _req.user;
    return SuccessResponse(res, {
      data: user,
      message: user?.id ? 'User Found' : 'User not found',
    });
  });
}

export default new UserController(new UserService());
