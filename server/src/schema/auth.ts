import { createInsertSchema } from 'drizzle-zod';
import { accounts, users } from '../db/tables';
export const RegisterUserSchema = createInsertSchema(users, {
  email: (schema) =>
    schema.min(1, 'Email is required.').email({ message: 'Provide a valid email.' }),
  name: (schema) => schema.min(1, 'Name is required.'),
  password: (schema) => schema.min(8, 'Password must be 8 charactors long'),
});
export const LoginSchema = createInsertSchema(users, {
  email: (schema) =>
    schema.min(1, 'Email is required.').email({ message: 'Provide a valid email.' }),
  password: (schema) => schema.min(8, 'Password must be 8 charactors long'),
});
export type IUser = typeof users.$inferSelect;
// export type IRegisterUser = z.infer<typeof RegisterUserSchema>;
// export type ILogInUser = z.infer<typeof LoginSchema>;
export type IAccount = typeof accounts.$inferSelect;
