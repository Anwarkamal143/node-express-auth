import { stripeClient } from "@/models/v1/stripe.model";
import { StripeProduct } from "@/types/stripe";

export function useListProducts() {
  return stripeClient.useCursorList<StripeProduct & { replace_type: true }>({
    infiniteOptions: {
      initialPageParam: undefined,
    },
    params: {
      limit: 200,
      cursor: undefined,
    },
    options: {
      path: "products",
    },
  });
}
