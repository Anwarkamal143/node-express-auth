import { accounts } from '@/db/tables';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
export const UpdateAccountSchema = createUpdateSchema(accounts);

export const InsertAccountSchema = createInsertSchema(accounts);
export const SelectAccountSchema = createSelectSchema(accounts);
export type InsertAccount = InferInsertModel<typeof accounts>;
export type SelectAccount = InferSelectModel<typeof accounts>;
export type UpdateAccount = z.infer<typeof UpdateAccountSchema>;
