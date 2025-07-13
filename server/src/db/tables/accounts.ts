import { generateUlid } from '@/utils/uuid';
import { relations } from 'drizzle-orm';
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { accountTypeEnum, is_active, time_stamps } from '../helpers';
import { users } from './users';

export const accounts = pgTable('accounts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateUlid())
    .notNull(),
  surrogate_key: uuid('surrogate_key').defaultRandom().notNull(),
  user_id: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .unique()
    .notNull(),
  type: accountTypeEnum().notNull(),
  // type: text("type").$type<AccountType[number]>().notNull(),

  // salt: text("salt"),
  // type: text("type").notNull(),
  provider: text('provider').notNull(),
  provider_account_id: text('provider_account_id'),
  // refresh_token: text('refresh_token'),
  // access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  is_active,
  ...time_stamps,
});

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.user_id],
    references: [users.id],
  }),
}));
