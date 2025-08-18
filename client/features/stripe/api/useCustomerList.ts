import { stripeClient } from "@/models/v1/stripe.model";
import { StripeCustomer } from "../schema";

export function useListCustomers() {
  return stripeClient.useCursorList<StripeCustomer>({
    infiniteOptions: {
      initialPageParam: undefined,
    },
    params: {
      limit: 1,
      cursor: undefined,
    },
    options: {
      path: "customers",
    },
  });
}
