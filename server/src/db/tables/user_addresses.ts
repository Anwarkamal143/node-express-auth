import { generateUlid } from '@/utils/uuid';
import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { time_stamps } from '../helpers';
import { users } from './users';

// User addresses

export const userAddresses = pgTable(
  'user_addresses',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateUlid())
      .notNull(),
    surrogate_key: uuid('surrogate_key').defaultRandom().notNull(),
    user_id: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    first_name: varchar('first_name', { length: 255 }).notNull(),
    last_name: varchar('last_name', { length: 255 }).notNull(),
    company: varchar('company', { length: 255 }),
    address1: varchar('address1', { length: 255 }).notNull(),
    address2: varchar('address2', { length: 255 }),
    city: varchar('city', { length: 255 }).notNull(),
    state: varchar('state', { length: 255 }).notNull(),
    postal_code: varchar('postal_code', { length: 255 }).notNull(),
    country: varchar('country', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 255 }),
    is_default: boolean('is_default').default(false),
    ...time_stamps,
  },
  (table) => [index('address_user_idx').on(table.user_id)]
);

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(users, {
    fields: [userAddresses.user_id],
    references: [users.id],
  }),
}));
