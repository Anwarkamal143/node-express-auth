import { APP_CONFIG } from '@/config/app.config';
import { catchAsync } from '@/middlewares/catchAsync';
import { IPaginationModes, IPaginationOrder } from '@/services/base.service';
import { UserService } from '@/services/user.service';
import { BadRequestException, NotFoundException } from '@/utils/catch-errors';
import { SuccessResponse } from '@/utils/requestResponse';

class UserController {
  constructor(public userService: UserService) {}

  public me = catchAsync(async (req, res) => {
    const user = req.user;
    const accessToken = req.cookies?.[APP_CONFIG.COOKIE_NAME];
    const refreshToken = req.cookies?.[APP_CONFIG.REFRESH_COOKIE_NAME];
    const { data } = await this.userService.getUserById(user?.id, true);

    return SuccessResponse(res, {
      data: { ...(data || {}), accessToken, refreshToken },
      message: user?.id ? 'User Found' : 'User not found',
    });
  });
  public findById = catchAsync(async (req, res, next) => {
    const userId = req.params.userId;
    if (!userId) {
      return next(new BadRequestException('User Id is required'));
    }
    const { data, error } = await this.userService.getUserById(userId);
    if (error) {
      return next(new NotFoundException('User Not Found'));
    }
    return SuccessResponse(res, {
      data: { ...data },
      message: 'User  Data',
    });
  });
  public findAll = catchAsync(async (req, res, next) => {
    const {
      limit,
      cursor,
      mode = 'offset',
      sort = 'asc',
      page,
    } = req.query as Record<string, string | number>;
    const { data, pagination_meta, error } = await this.userService.listAllPaginatedUsers({
      cursor,
      limit,
      mode: mode as IPaginationModes,
      page,
      sortOrder: sort as IPaginationOrder,
    });
    if (error) {
      return next(new NotFoundException('User Not Found'));
    }
    return SuccessResponse(res, {
      data: { pagination_meta, data },
      message: 'Users Data',
    });
  });
}

export default new UserController(new UserService());
