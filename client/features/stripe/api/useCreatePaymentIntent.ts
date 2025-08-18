import { withErrorHandler } from "@/lib";
import { stripeClient } from "@/models/v1/stripe.model";
import { PaymentIntentParams } from "@/types/stripe";

type IPayemntIntentRequest = PaymentIntentParams;
export function useCreatePaymentIntent() {
  const { mutateAsync, isError, isPending, isSuccess, error } =
    stripeClient.usePost<
      { clientSecret: string; paymentIntentId: string; replace_type: true },
      IPayemntIntentRequest & { replace_type: true }
    >({
      options: {
        path: "payment-intents",
      },
    });

  const handleCreatePaymentIntent = withErrorHandler(
    async (data: Partial<IPayemntIntentRequest>) => {
      const res = await mutateAsync({
        ...data,
      });

      return res;
    }
  );
  return { handleCreatePaymentIntent, isError, isPending, isSuccess, error };
}
