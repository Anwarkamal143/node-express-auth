import { z } from "zod";
export const SIGN_IN_SCHEMA = z.object({
  email: z.string().min(1, "Email is required").email("Provide a valid email"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Minimum 8 charactors"),
});
export const SIGN_UP_SCHEMA = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .min(4, "Name must be 4 charactors long"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Provide a valid email"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Minimum 8 charactors"),
    confirmPassword: z
      .string()
      .min(1, "Confirm your Password")
      .min(8, "Minimum 8 charactors"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords didn't match",
    path: ["confirmPassword"],
  });

export type SignInSchemaType = z.infer<typeof SIGN_IN_SCHEMA>;
export type SignUpSchemaType = z.infer<typeof SIGN_UP_SCHEMA>;
