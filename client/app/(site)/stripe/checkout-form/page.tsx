"use client";
import { useCheckoutSession } from "@/features/stripe/api/useCheckoutSession";
import React from "react";
import { toast } from "sonner";

interface StripeCheckoutProps {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  onSuccess?: (sessionId: string) => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  priceId,
  successUrl,
  cancelUrl,
  customerEmail,
  onSuccess,
}) => {
  const { handleCreateCheckoutSession, isPending, error } =
    useCheckoutSession();
  const handleCheckout = async () => {
    const { data, message } = await handleCreateCheckoutSession({
      priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
    });
    if (!data?.sessionId) {
      toast.error(message);
      return;
    }
    if (onSuccess) onSuccess(data.sessionId);

    // Redirect to Stripe Checkout
    window.location.href = data.url;
  };

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={isPending}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isPending ? "Processing..." : "Checkout"}
      </button>
      {error && <div className="mt-2 text-red-500">{error?.data?.message}</div>}
    </div>
  );
};

export default StripeCheckout;
