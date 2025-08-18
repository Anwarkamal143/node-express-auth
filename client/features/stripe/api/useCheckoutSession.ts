import { withErrorHandler } from "@/lib";
import { stripeClient } from "@/models/v1/stripe.model";
import { StripeCheckoutSession } from "@/types/stripe";
type CheckoutSessionProps = StripeCheckoutSession & {
  replace_type: true;
  priceId: string;
};
export function useCheckoutSession() {
  const { mutateAsync, isError, isPending, isSuccess, error } =
    stripeClient.usePost<
      { sessionId: string; replace_type: true; url: string },
      CheckoutSessionProps
    >({
      options: {
        path: "checkout-sessions",
      },
    });

  const handleCreateCheckoutSession = withErrorHandler(
    async (data: Partial<CheckoutSessionProps>) => {
      const res = await mutateAsync({
        ...data,
      });

      return res;
    }
  );
  return { handleCreateCheckoutSession, isError, isPending, isSuccess, error };
}
