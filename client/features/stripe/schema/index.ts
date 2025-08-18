import parsePhoneNumber from "libphonenumber-js";
import { z } from "zod";
export const STRIPE_CREATE_CUSTOMER_SCHEMA = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(4, "Name must be 4 charactors long"),
  email: z.string().min(1, "Email is required").email("Provide a valid email"),
  phone: z.string().refine((data) => parsePhoneNumber(data)?.isValid(), {
    message: "Provide a valid Phone number",
    path: ["phone"],
  }),
});

export type StripeCreateCustomer = z.infer<
  typeof STRIPE_CREATE_CUSTOMER_SCHEMA
>;
export type StripeCustomer = z.infer<typeof STRIPE_CREATE_CUSTOMER_SCHEMA> & {
  id: string;
};
