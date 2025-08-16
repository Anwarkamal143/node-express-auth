import { HTTPSTATUS } from '@/config/http.config';
import { db, eq, ProviderType } from '@/db';
import { users } from '@/db/tables';
import { ErrorCode } from '@/enums/error-code.enum';
import { InsertUser, SelectUser } from '@/schema/user';
import { stringToNumber } from '@/utils';
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
} from '@/utils/catch-errors';
import { toUTC } from '@/utils/date-time';
import { AccountService } from './accounts.service';
import { BaseService, IPaginatedParams } from './base.service';
import { cache } from './redis.service';
type CreateUserInput = Pick<SelectUser, 'email' | 'name'> &
  Partial<Omit<SelectUser, 'email' | 'name'>>;

export class UserService extends BaseService<typeof users, InsertUser, SelectUser> {
  constructor(private accountService = new AccountService()) {
    super(users);
  }

  async listAllPaginatedUsers(params: IPaginatedParams) {
    const { mode, limit, sortOrder = 'desc' } = params;
    const limitNumber = stringToNumber(limit || '50') as number;
    if (mode === 'offset') {
      const { page } = params;
      const pageNumber = stringToNumber(page || '0') as number;
      return this.paginateOffset({
        limit: limitNumber,
        page: pageNumber,
        order: sortOrder,
      });
    }
    const { cursor } = params;

    return this.paginateCursor({
      cursor,
      limit: limitNumber,
      order: sortOrder,
      cursorColumn: (table) => table.id,
    });
  }
  async softDeleteUserById(accountId: string) {
    return this.softDelete((table) => eq(table.id, accountId), { deleted_at: new Date() });
  }

  public async getUserByEmail(email: string) {
    try {
      if (!email) {
        return {
          data: null,
          error: new BadRequestException('Email is required', ErrorCode.VALIDATION_ERROR),
        };
      }
      const { data: user } = await this.findOne((fields) => eq(fields.email, email));
      if (!user) {
        return {
          data: null,
          error: new NotFoundException('User not found'),
        };
      }
      return { data: user, status: HTTPSTATUS.OK };
    } catch (e: any) {
      console.error('[UserService:getUserById]', e?.message || e);
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  public async getUserById(id: string, usecahce = false, excludePassword = true) {
    try {
      if (!id) {
        return {
          data: null,

          error: new BadRequestException('User Id is required', ErrorCode.VALIDATION_ERROR),
        };
      }
      const { data: user } = await cache(
        `user:${id}`,
        async () => await this.findOne((fields) => eq(fields.id, id)),
        { ttl: 600, useCache: usecahce }
      );
      // const { data: user } = await this.findOne((fields) => eq(fields.id, id));
      if (!user) {
        return {
          data: null,
          error: new NotFoundException('User not found'),
        };
      }
      if (excludePassword) {
        user.password = null;
      }
      return { data: user };
    } catch (e) {
      console.log('getUserById Error', e);
      return {
        data: null,

        error: new InternalServerException(),
      };
    }
  }
  public async createUser(data: CreateUserInput) {
    try {
      const [user] = await db
        .insert(users)
        .values({
          ...data,
        })
        .returning();
      if (!user) {
        return {
          data: null,
          error: new BadRequestException('User not created', ErrorCode.BAD_REQUEST),
        };
      }
      return { data: user, status: HTTPSTATUS.CREATED };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  async createGoogleUserUseCase(googleUser: IGoogleUser) {
    try {
      let existingUser = await this.getUserByEmail(googleUser.email);
      let user = existingUser.data;
      if (!user) {
        const { data } = await this.createUser({
          email: googleUser.email,
          email_verified: toUTC(new Date(), false),
          name: googleUser.name,
          image: googleUser.picture,
        });
        user = data;
      }
      // const user = existingUser.user;
      if (!user) {
        return {
          data: null,
          error: new BadRequestException('Failed to create Google user', ErrorCode.BAD_REQUEST),
        };
      }

      await this.accountService.createAccountViaGoogle(user.id, googleUser.sub);

      return { data: user, status: HTTPSTATUS.CREATED };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException('Failed to create Google user'),
      };
    }
  }

  async getAccountByGoogleIdUseCase(googleId: string) {
    return await this.accountService.getAccountByProviderId(googleId, ProviderType.google);
  }
}
export const userService = new UserService();
