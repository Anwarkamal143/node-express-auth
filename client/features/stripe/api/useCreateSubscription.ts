import { withErrorHandler } from "@/lib";
import { stripeClient } from "@/models/v1/stripe.model";
import { Subscription, SubscriptionParams } from "@/types/stripe";

export function useCreateSubscription() {
  const { mutateAsync, isError, isPending, isSuccess, error } =
    stripeClient.usePost<
      Subscription & { replace_type: true },
      SubscriptionParams & { priceId: string; customerId: string }
    >({
      options: {
        path: "subscriptions",
      },
    });

  const handleCreateSubscription = withErrorHandler(
    async (
      data: Partial<
        SubscriptionParams & { priceId: string; customerId: string }
      >
    ) => {
      const res = await mutateAsync({
        ...data,
      });

      return res;
    }
  );
  return { handleCreateSubscription, isError, isPending, isSuccess, error };
}
