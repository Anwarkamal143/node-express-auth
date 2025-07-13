import { HTTPSTATUS } from '@/config/http.config';
import { AccountType, and, db, eq, ProviderType } from '../db';

import { accounts } from '@/db/tables';
import { InsertAccount, SelectAccount } from '@/schema/account';
import { InternalServerException, NotFoundException } from '@/utils/catch-errors';
import { BaseService } from './base.service';

export class AccountService extends BaseService<InsertAccount, SelectAccount> {
  constructor() {
    super(accounts, db.query.accounts);
  }

  async upsertGithubAccount(userId: string, githubId: string) {
    return this.upsert(
      {
        user_id: userId,
        provider: 'github',
        provider_account_id: githubId,
        type: AccountType.oauth,
      },
      [accounts.user_id, accounts.provider],
      { updated_at: new Date() }
    );
  }

  async listPaginatedAccounts(userId: string, page: number = 1, limit: number = 10) {
    return this.paginate(eq(accounts.user_id, userId), {
      limit,
      offset: (page - 1) * limit,
    });
  }

  async softDeleteAccountById(accountId: string) {
    return this.softDelete(eq(accounts.id, accountId));
  }

  async listAccountsCursorPaginated(
    userId: string,
    cursor?: string,
    limit = 10,
    direction: 'next' | 'prev' = 'next',
    order: 'asc' | 'desc' = 'asc'
  ) {
    return await this.paginateByCursor(
      accounts.id, // Cursor column
      cursor, // Cursor value
      {
        limit,
        order,
        direction,
        where: eq(accounts.user_id, userId),
      }
    );
  }
  public async createAccount(userId: string) {
    try {
      const {
        data: account,
        error,
        status,
      } = await this.create({
        user_id: userId,
        type: AccountType.email,
        provider: ProviderType.email,
      });

      if (!account) {
        return {
          error,
        };
      }
      return {
        data: account,
        status,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  public async createAccountViaGithub(userId: string, githubId: string) {
    try {
      const {
        data: account,
        error,
        status,
      } = await this.create({
        user_id: userId,
        provider: ProviderType.github,
        provider_account_id: githubId,
        type: AccountType.oauth,
      });

      if (!account) {
        return {
          error,
        };
      }
      return {
        data: account,
        status,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }
  public async createAccountViaGoogle(userId: string, googleId: string) {
    try {
      const {
        data: account,
        error,
        status,
      } = await this.create({
        user_id: userId,
        provider: ProviderType.google,
        provider_account_id: googleId,
        type: AccountType.oauth,
      });

      if (!account) {
        return {
          error,
        };
      }
      return {
        data: account,
        status,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }
  public async getAccountByUserId(userId: string) {
    try {
      const account = this.findOne(eq(accounts.user_id, userId));
      if (!account) {
        return {
          data: null,
          error: new NotFoundException('Account not found'),
        };
      }
      return {
        data: account,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }
  public async getAccountByProviderId(providerId: string, providerType: ProviderType) {
    try {
      const account = await db.query.accounts.findFirst({
        where: and(
          eq(accounts.provider_account_id, providerId),
          eq(accounts.provider, providerType)
        ),
      });
      if (!account) {
        return {
          data: null,
          error: new NotFoundException('Account not found'),
        };
      }
      return {
        data: account,
        error: null,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }
}
export const accountService = new AccountService();
