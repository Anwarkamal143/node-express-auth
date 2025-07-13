import { HTTPSTATUS } from '@/config/http.config';
import { db, eq, ProviderType } from '@/db';
import { users } from '@/db/tables';
import { ErrorCode } from '@/enums/error-code.enum';
import { InsertUser, SelectUser } from '@/schema/user';
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
} from '@/utils/catch-errors';
import { toUTC } from '@/utils/date-time';
import { AccountService } from './accounts.service';
import { BaseService } from './base.service';
type CreateUserInput = Pick<SelectUser, 'email' | 'name'> &
  Partial<Omit<SelectUser, 'email' | 'name'>>;

export class UserService extends BaseService<InsertUser, SelectUser> {
  private accountService: AccountService;
  constructor() {
    super(users, db.query.users);
    this.accountService = new AccountService();
  }

  async listPaginatedUsers(userId: string, page: number = 1, limit: number = 10) {
    return this.paginate(eq(users.id, userId), {
      limit,
      offset: (page - 1) * limit,
    });
  }

  async softDeleteUserById(accountId: string) {
    return this.softDelete(eq(users.id, accountId));
  }

  async listUsersCursorPaginated(
    userId: string,
    cursor?: string,
    limit = 10,
    direction: 'next' | 'prev' = 'next',
    order: 'asc' | 'desc' = 'asc'
  ) {
    return await this.paginateByCursor(
      users.id, // Cursor column
      cursor, // Cursor value
      {
        limit,
        order,
        direction,
        where: eq(users.id, userId),
      }
    );
  }

  public async getUserByEmail(email: string) {
    try {
      if (!email) {
        return {
          data: null,
          error: new BadRequestException('Email is required', ErrorCode.VALIDATION_ERROR),
        };
      }
      const user = await db.query.users.findFirst({
        where: (fields) => eq(fields.email, email),
      });
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

  public async getUserById(id: string, excludePassword = true) {
    try {
      if (!id) {
        return {
          data: null,

          error: new BadRequestException('User Id is required', ErrorCode.VALIDATION_ERROR),
        };
      }

      const user = await db.query.users.findFirst({
        where: (fields) => eq(fields.id, id),
        // where: (fields, { eq }) => {
        //   return eq(fields.id, id);
        // },
      });
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
