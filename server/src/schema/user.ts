import { accounts, users } from '@/db/tables';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
export const UpdateUserSchema = createUpdateSchema(accounts);

export const InsertUserSchema = createInsertSchema(users);
export const SelectUserSchema = createSelectSchema(users);
export type InsertUser = InferInsertModel<typeof users>;
export type SelectUser = InferSelectModel<typeof users>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
