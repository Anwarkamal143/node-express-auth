import { generateUlid } from '@/utils/uuid';
import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { Role, UserStatus } from '../enumTypes';
import { roleEnum, time_stamps, userStatusEnum } from '../helpers';
import { accounts } from './accounts';
import { userAddresses } from './user_addresses';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(generateUlid).notNull(),
    name: text('name').notNull(),
    password: text('password'),
    email: text('email').notNull().unique(),
    email_verified: timestamp('email_verified'),
    role: roleEnum().default(Role.USER),
    image: text('image'),
    //   refresh_token: text('refresh_token'),
    status: userStatusEnum().default(UserStatus.ACTIVE),
    surrogate_key: uuid('surrogate_key').defaultRandom().notNull(),
    ...time_stamps,
  },
  (table) => [uniqueIndex('email_idx').on(table.email)]
);

export const userRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  address: many(userAddresses),
}));
